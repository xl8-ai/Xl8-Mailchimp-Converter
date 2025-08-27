import { google } from "googleapis";
import * as cheerio from "cheerio";

export interface DocumentElement {
  type: "paragraph" | "heading" | "list" | "image" | "table" | "cta" | "space";
  content: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    alignment?: "left" | "center" | "right" | "justify";
  };
  level?: number; // for headings (1-6)
  url?: string; // for links and images
  alt?: string; // for images
  listType?: "ordered" | "unordered";
  ctaText?: string;
  ctaUrl?: string;
}

export interface ParsedDocument {
  title: string;
  elements: DocumentElement[];
  metadata: {
    createdTime: string;
    modifiedTime: string;
    authors: string[];
  };
}

export class GoogleDocsParser {
  private docs: any;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.docs = google.docs({ version: "v1", auth: apiKey });
    }
  }

  /**
   * Google Docs URL에서 문서 ID 추출
   */
  extractDocumentId(url: string): string {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error("유효하지 않은 구글 독스 URL입니다.");
    }
    return match[1];
  }

  /**
   * 공개 Google Docs HTML을 가져와서 파싱
   */
  async parsePublicDocument(url: string): Promise<ParsedDocument> {
    try {
      const documentId = this.extractDocumentId(url);
      const htmlUrl = `https://docs.google.com/document/d/${documentId}/export?format=html`;

      const response = await fetch(htmlUrl);
      if (!response.ok) {
        throw new Error(
          "문서를 가져올 수 없습니다. 문서가 공개되었는지 확인해주세요."
        );
      }

      const html = await response.text();
      return this.parseHtmlToElements(html);
    } catch (error) {
      console.error("문서 파싱 오류:", error);
      throw error;
    }
  }

  /**
   * HTML을 구조화된 요소들로 파싱
   */
  private parseHtmlToElements(html: string): ParsedDocument {
    const elements: DocumentElement[] = [];

    // HTML을 DOM으로 파싱 (서버사이드에서는 cheerio 사용)
    const $ = cheerio.load(html);

    // 제목 추출
    const title = $("title").text() || "제목 없음";

    // 메타데이터 기본값
    const metadata = {
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      authors: ["Unknown"],
    };

    // body 내용 파싱
    $("body")
      .find("*")
      .each((_, element) => {
        const $elem = $(element);
        const tagName = element.tagName?.toLowerCase();

        if (!tagName) return;

        switch (tagName) {
          case "h1":
          case "h2":
          case "h3":
          case "h4":
          case "h5":
          case "h6":
            elements.push(this.parseHeading($elem, parseInt(tagName[1])));
            break;

          case "p":
            const pElement = this.parseParagraph($elem);
            if (pElement) elements.push(pElement);
            break;

          case "ul":
          case "ol":
            elements.push(
              ...this.parseList(
                $elem,
                tagName === "ol" ? "ordered" : "unordered"
              )
            );
            break;

          case "img":
            elements.push(this.parseImage($elem));
            break;
        }
      });

    return {
      title,
      elements: this.postProcessElements(elements),
      metadata,
    };
  }

  /**
   * 헤딩 요소 파싱
   */
  private parseHeading($elem: any, level: number): DocumentElement {
    const text = $elem.text().trim();
    const formatting = this.extractFormatting($elem);

    return {
      type: "heading",
      content: text,
      level,
      formatting,
    };
  }

  /**
   * 단락 요소 파싱
   */
  private parseParagraph($elem: any): DocumentElement | null {
    const text = $elem.text().trim();
    if (!text) return null;

    // CTA 패턴 감지
    if (this.isCTAPattern(text)) {
      return this.parseCTA($elem);
    }

    // Space 패턴 감지
    if (text === "[space]") {
      return { type: "space", content: "" };
    }

    const formatting = this.extractFormatting($elem);

    // 링크 처리
    const $link = $elem.find("a").first();
    let url: string | undefined;
    if ($link.length > 0) {
      url = this.cleanGoogleDocsUrl($link.attr("href") || "");
    }

    return {
      type: "paragraph",
      content: text,
      formatting,
      url,
    };
  }

  /**
   * 리스트 요소 파싱
   */
  private parseList(
    $elem: any,
    listType: "ordered" | "unordered"
  ): DocumentElement[] {
    const elements: DocumentElement[] = [];

    $elem.find("li").each((_, li) => {
      const $li = $(li);
      const text = $li.text().trim();
      if (text) {
        elements.push({
          type: "list",
          content: text,
          listType,
          formatting: this.extractFormatting($li),
        });
      }
    });

    return elements;
  }

  /**
   * 이미지 요소 파싱
   */
  private parseImage($elem: any): DocumentElement {
    const src = $elem.attr("src") || "";
    const alt = $elem.attr("alt") || "이미지";

    // 구글 독스 이미지 URL 최적화
    let optimizedSrc = src;
    if (src.startsWith("//")) {
      optimizedSrc = "https:" + src;
    }
    if (src.includes("googleusercontent.com") && !src.includes("=w")) {
      optimizedSrc += optimizedSrc.includes("?") ? "&w=600" : "?w=600";
    }

    return {
      type: "image",
      content: alt,
      url: optimizedSrc,
      alt,
    };
  }

  /**
   * CTA 패턴 파싱
   */
  private parseCTA($elem: any): DocumentElement {
    const text = $elem.text().trim();
    const html = $elem.html();

    // [cta] 패턴 처리
    const ctaMatch =
      text.match(/\[cta\]\s*([^\n\r\[]+)(?:\s*\[\/cta\])?/i) ||
      text.match(/CTA[:\s]*([^\n\r]+)/i);

    if (!ctaMatch) {
      return {
        type: "paragraph",
        content: text,
        formatting: this.extractFormatting($elem),
      };
    }

    let ctaText = ctaMatch[1].trim();
    let ctaUrl = "#";

    // HTML에서 링크 추출
    const linkMatch = html?.match(
      /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i
    );
    if (linkMatch) {
      ctaText = linkMatch[2].trim();
      ctaUrl = this.cleanGoogleDocsUrl(linkMatch[1]);
    } else {
      // 텍스트에서 URL 추출
      const urlMatch = ctaText.match(/(.*?)\s*(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        ctaText = urlMatch[1].trim();
        ctaUrl = urlMatch[2].trim();
      }
    }

    return {
      type: "cta",
      content: ctaText,
      ctaText,
      ctaUrl,
    };
  }

  /**
   * 포맷팅 정보 추출
   */
  private extractFormatting($elem: any): DocumentElement["formatting"] {
    const style = $elem.attr("style") || "";
    const formatting: DocumentElement["formatting"] = {};

    // 볼드 감지
    if (
      style.includes("font-weight: bold") ||
      style.includes("font-weight: 700") ||
      style.includes("font-weight: 800") ||
      style.includes("font-weight: 900") ||
      $elem.find("b, strong").length > 0
    ) {
      formatting.bold = true;
    }

    // 이탤릭 감지
    if (
      style.includes("font-style: italic") ||
      $elem.find("i, em").length > 0
    ) {
      formatting.italic = true;
    }

    // 밑줄 감지
    if (
      style.includes("text-decoration: underline") ||
      $elem.find("u").length > 0
    ) {
      formatting.underline = true;
    }

    // 폰트 크기 추출
    const fontSizeMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
    if (fontSizeMatch) {
      formatting.fontSize = parseFloat(fontSizeMatch[1]);
    }

    // 색상 추출
    const colorMatch = style.match(
      /color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\))/
    );
    if (colorMatch) {
      formatting.color = colorMatch[1];
    }

    // 배경색 추출
    const bgColorMatch = style.match(
      /background-color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\))/
    );
    if (bgColorMatch) {
      formatting.backgroundColor = bgColorMatch[1];
    }

    // 정렬 추출
    const alignMatch = style.match(/text-align:\s*(left|center|right|justify)/);
    if (alignMatch) {
      formatting.alignment = alignMatch[1] as any;
    }

    return formatting;
  }

  /**
   * CTA 패턴 감지
   */
  private isCTAPattern(text: string): boolean {
    return (
      /^\[cta\]/i.test(text.trim()) ||
      /^CTA[:\s]/i.test(text.trim()) ||
      text.includes("<CTA>")
    );
  }

  /**
   * Google Docs URL 정리
   */
  private cleanGoogleDocsUrl(url: string): string {
    if (url.includes("www.google.com/url")) {
      try {
        const urlParams = new URL(url).searchParams;
        return urlParams.get("q") || url;
      } catch {
        return url;
      }
    }
    return url;
  }

  /**
   * 요소들 후처리
   */
  private postProcessElements(elements: DocumentElement[]): DocumentElement[] {
    // 빈 요소 제거
    const filtered = elements.filter(
      (el) =>
        el.content.trim() !== "" || el.type === "space" || el.type === "image"
    );

    // 연속된 space 요소 합치기
    const merged: DocumentElement[] = [];
    let spaceCount = 0;

    for (const element of filtered) {
      if (element.type === "space") {
        spaceCount++;
      } else {
        if (spaceCount > 0) {
          merged.push({ type: "space", content: "", level: spaceCount });
          spaceCount = 0;
        }
        merged.push(element);
      }
    }

    if (spaceCount > 0) {
      merged.push({ type: "space", content: "", level: spaceCount });
    }

    return merged;
  }
}

export const googleDocsParser = new GoogleDocsParser();
