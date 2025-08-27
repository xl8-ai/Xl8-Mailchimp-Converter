import * as cheerio from "cheerio";

export interface SimpleDocumentElement {
  type: "paragraph" | "heading" | "list" | "image" | "cta" | "space";
  content: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    color?: string;
  };
  level?: number; // for headings
  url?: string; // for links and images
  ctaText?: string;
  ctaUrl?: string;
}

export interface SimpleDocument {
  title: string;
  elements: SimpleDocumentElement[];
}

export function extractDocumentId(url: string): string {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("유효하지 않은 구글 독스 URL입니다.");
  }
  return match[1];
}

export function getPublicHtmlUrl(documentId: string): string {
  return `https://docs.google.com/document/d/${documentId}/export?format=html`;
}

export async function parseGoogleDocsDocument(
  googleDocsUrl: string
): Promise<SimpleDocument> {
  try {
    const documentId = extractDocumentId(googleDocsUrl);
    const htmlUrl = getPublicHtmlUrl(documentId);

    console.log("🔍 HTML URL:", htmlUrl);

    const response = await fetch(htmlUrl);
    if (!response.ok) {
      throw new Error(
        "문서를 가져올 수 없습니다. 문서가 공개되었는지 확인해주세요."
      );
    }

    const html = await response.text();
    console.log("📄 HTML 길이:", html.length);

    return parseHtmlToDocument(html);
  } catch (error) {
    console.error("파싱 오류:", error);
    throw error;
  }
}

function parseHtmlToDocument(html: string): SimpleDocument {
  const $ = cheerio.load(html);
  const elements: SimpleDocumentElement[] = [];

  // 제목 추출
  const title = $("title").text() || "제목 없음";
  console.log("📝 문서 제목:", title);

  // body 내용 파싱
  $("body")
    .find("p, h1, h2, h3, h4, h5, h6, ul, ol, img")
    .each((_, element) => {
      const $elem = $(element);
      const tagName = element.tagName?.toLowerCase();

      if (!tagName) return;

      try {
        switch (tagName) {
          case "h1":
          case "h2":
          case "h3":
          case "h4":
          case "h5":
          case "h6":
            const headingLevel = parseInt(tagName[1]);
            const headingText = $elem.text().trim();
            if (headingText) {
              elements.push({
                type: "heading",
                content: headingText,
                level: headingLevel,
                formatting: extractFormatting($elem),
              });
            }
            break;

          case "p":
            const pText = $elem.text().trim();
            if (pText) {
              // CTA 패턴 확인
              if (isCTAPattern(pText)) {
                const ctaElement = parseCTAElement($elem);
                if (ctaElement) elements.push(ctaElement);
              }
              // Space 패턴 확인
              else if (pText === "[space]") {
                elements.push({
                  type: "space",
                  content: "",
                });
              }
              // 일반 단락
              else {
                // 부분 링크가 있는 경우 HTML 형태로 보존
                const hasLinks = $elem.find("a").length > 0;
                let processedContent = pText;

                if (hasLinks) {
                  // HTML 내용을 가져와서 링크를 보존
                  let htmlContent = $elem.html() || "";

                  // Google Docs 링크 URL 정리
                  htmlContent = htmlContent.replace(
                    /href="([^"]*google\.com[^"]*)"/g,
                    (match, url) => {
                      const cleanUrl = cleanGoogleDocsUrl(url);
                      return `href="${cleanUrl}"`;
                    }
                  );

                  // 불필요한 스타일 제거하고 기본 링크 스타일 적용
                  htmlContent = htmlContent.replace(
                    /<a[^>]*href="([^"]*)"[^>]*>/g,
                    '<a href="$1" style="color: #1a73e8; text-decoration: underline;">'
                  );

                  // 텍스트만 추출해서 확인
                  const textOnly = $elem.text().trim();
                  processedContent = htmlContent;

                  console.log("🔗 부분 링크 감지:", {
                    text: textOnly,
                    html: htmlContent,
                  });
                }

                elements.push({
                  type: "paragraph",
                  content: processedContent,
                  formatting: extractFormatting($elem),
                });
              }
            }
            break;

          case "ul":
          case "ol":
            $elem.find("li").each((_, li) => {
              const $li = $(li);
              const liText = $li.text().trim();
              if (liText) {
                // 리스트 항목에서도 부분 링크 처리
                const hasLinks = $li.find("a").length > 0;
                let processedContent = liText;

                if (hasLinks) {
                  let htmlContent = $li.html() || "";

                  // Google Docs 링크 URL 정리
                  htmlContent = htmlContent.replace(
                    /href="([^"]*google\.com[^"]*)"/g,
                    (match, url) => {
                      const cleanUrl = cleanGoogleDocsUrl(url);
                      return `href="${cleanUrl}"`;
                    }
                  );

                  // 링크 스타일 적용
                  htmlContent = htmlContent.replace(
                    /<a[^>]*href="([^"]*)"[^>]*>/g,
                    '<a href="$1" style="color: #1a73e8; text-decoration: underline;">'
                  );

                  processedContent = htmlContent;
                }

                elements.push({
                  type: "list",
                  content: processedContent,
                  formatting: extractFormatting($li),
                });
              }
            });
            break;

          case "img":
            const src = $elem.attr("src") || "";
            const alt = $elem.attr("alt") || "이미지";

            let optimizedSrc = src;

            // 프로토콜 추가
            if (src.startsWith("//")) {
              optimizedSrc = "https:" + src;
            }

            // Google 이미지 URL 최적화
            if (src.includes("googleusercontent.com")) {
              // 기존 크기 파라미터 제거 후 새로 추가
              optimizedSrc = optimizedSrc.replace(/[&?]w=\d+/g, "");
              optimizedSrc = optimizedSrc.replace(/[&?]h=\d+/g, "");

              // 새로운 크기 파라미터 추가
              const separator = optimizedSrc.includes("?") ? "&" : "?";
              optimizedSrc += `${separator}w=800&h=600`;

              console.log("🖼️ Google 이미지 최적화:", {
                original: src,
                optimized: optimizedSrc,
              });
            }

            elements.push({
              type: "image",
              content: alt,
              url: optimizedSrc,
            });
            break;
        }
      } catch (elementError) {
        console.warn("요소 파싱 오류:", elementError);
      }
    });

  console.log("📊 파싱된 요소 수:", elements.length);
  console.log(
    "📋 요소 타입별 개수:",
    elements.reduce((acc, el) => {
      acc[el.type] = (acc[el.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  return {
    title,
    elements: elements.filter(
      (el) =>
        el.content.trim() !== "" || el.type === "space" || el.type === "image"
    ),
  };
}

function extractFormatting($elem: any): SimpleDocumentElement["formatting"] {
  const style = $elem.attr("style") || "";
  const formatting: SimpleDocumentElement["formatting"] = {};

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
  if (style.includes("font-style: italic") || $elem.find("i, em").length > 0) {
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
  const fontSizeMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)pt/);
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

  return formatting;
}

function isCTAPattern(text: string): boolean {
  return (
    /^\[cta\]/i.test(text.trim()) ||
    /^CTA[:\s]/i.test(text.trim()) ||
    text.includes("<CTA>")
  );
}

function parseCTAElement($elem: any): SimpleDocumentElement | null {
  const text = $elem.text().trim();
  const html = $elem.html();

  // [cta] 패턴 처리
  const ctaMatch =
    text.match(/\[cta\]\s*([^\n\r\[]+)(?:\s*\[\/cta\])?/i) ||
    text.match(/CTA[:\s]*([^\n\r]+)/i);

  if (!ctaMatch) return null;

  let ctaText = ctaMatch[1].trim();
  let ctaUrl = "#";

  // HTML에서 링크 추출
  const linkMatch = html?.match(
    /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i
  );
  if (linkMatch) {
    ctaText = linkMatch[2].trim();
    ctaUrl = cleanGoogleDocsUrl(linkMatch[1]);
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

function cleanGoogleDocsUrl(url: string): string {
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
