import { SimpleDocumentElement, SimpleDocument } from "./simpleParser";

export interface HtmlGeneratorOptions {
  maxWidth?: number;
  fontFamily?: string;
  lineHeight?: number;
  baseColor?: string;
  ctaButtonColor?: string;
  ctaTextColor?: string;
}

export class HtmlGenerator {
  private options: Required<HtmlGeneratorOptions>;

  constructor(options: HtmlGeneratorOptions = {}) {
    this.options = {
      maxWidth: 600,
      fontFamily: "Arial, sans-serif",
      lineHeight: 1.6,
      baseColor: "#333333",
      ctaButtonColor: "#ff6b35",
      ctaTextColor: "#ffffff",
      ...options,
    };
  }

  /**
   * 파싱된 문서를 Mailchimp 친화적 HTML로 변환
   */
  generateHtml(document: SimpleDocument): string {
    const elementsHtml = document.elements
      .map((element) => this.generateElementHtml(element))
      .join("\n");

    return this.wrapInContainer(elementsHtml);
  }

  /**
   * 개별 요소를 HTML로 변환
   */
  private generateElementHtml(element: SimpleDocumentElement): string {
    switch (element.type) {
      case "heading":
        return this.generateHeading(element);
      case "paragraph":
        return this.generateParagraph(element);
      case "list":
        return this.generateListItem(element);
      case "image":
        return this.generateImage(element);
      case "cta":
        return this.generateCTAButton(element);
      case "space":
        return this.generateSpace(element);
      default:
        return "";
    }
  }

  /**
   * 헤딩 생성
   */
  private generateHeading(element: SimpleDocumentElement): string {
    const level = element.level || 1;
    const tag = `h${level}`;
    const styles = this.generateInlineStyles(element.formatting, {
      fontSize: this.getHeadingFontSize(level),
      fontWeight: "bold",
      margin: this.getHeadingMargin(level),
      lineHeight: "1.3",
    });

    // 이미 HTML 태그가 포함된 리치 텍스트인지 확인
    const isRichText = /<[^>]+>/.test(element.content);

    let content;
    if (isRichText) {
      // 리치 텍스트는 그대로 사용 (이미 HTML 태그 포함)
      content = element.content;
    } else {
      // 일반 텍스트는 이스케이프 처리
      content = this.escapeHtml(element.content);
    }

    return `<${tag} style="${styles}">${content}</${tag}>`;
  }

  /**
   * 단락 생성
   */
  private generateParagraph(element: SimpleDocumentElement): string {
    const styles = this.generateInlineStyles(element.formatting, {
      margin: "0 0 16px 0",
      lineHeight: this.options.lineHeight.toString(),
    });

    // 이미 HTML 태그가 포함된 리치 텍스트인지 확인
    const isRichText = /<[^>]+>/.test(element.content);

    let content;
    if (isRichText) {
      // 리치 텍스트는 그대로 사용 (이미 HTML 태그 포함)
      content = element.content;
    } else {
      // 일반 텍스트는 이스케이프 처리
      content = this.escapeHtml(element.content);
    }

    // 링크가 있는 경우 처리 (리치 텍스트가 아닌 경우에만)
    if (element.url && !isRichText) {
      const linkStyles = "color: #1a73e8; text-decoration: underline;";
      content = `<a href="${element.url}" target="_blank" style="${linkStyles}">${content}</a>`;
    }

    return `<p style="${styles}">${content}</p>`;
  }

  /**
   * 리스트 아이템 생성 (실제 구현에서는 리스트 그룹핑 필요)
   */
  private generateListItem(element: SimpleDocumentElement): string {
    const styles = this.generateInlineStyles(element.formatting, {
      margin: "8px 0",
      lineHeight: this.options.lineHeight.toString(),
    });

    // 이미 HTML 태그가 포함된 리치 텍스트인지 확인
    const isRichText = /<[^>]+>/.test(element.content);

    let content;
    if (isRichText) {
      // 리치 텍스트는 그대로 사용 (이미 HTML 태그 포함)
      content = element.content;
    } else {
      // 일반 텍스트는 이스케이프 처리
      content = this.escapeHtml(element.content);
    }

    return `<li style="${styles}">${content}</li>`;
  }

  /**
   * 이미지 생성
   */
  private generateImage(element: SimpleDocumentElement): string {
    const styles = [
      "max-width: 100%",
      "height: auto",
      "display: block",
      "border: 0",
      "margin: 16px 0",
    ].join("; ");

    let imageUrl = element.url || "";

    // Google 이미지 URL 처리
    if (imageUrl.includes("googleusercontent.com")) {
      // 메일 클라이언트에서는 프록시 대신 직접 URL 최적화
      imageUrl = imageUrl.replace(/[&?]w=\d+/g, "");
      imageUrl = imageUrl.replace(/[&?]h=\d+/g, "");
      const separator = imageUrl.includes("?") ? "&" : "?";
      imageUrl += `${separator}w=800&h=600`;

      console.log("📧 메일용 Google 이미지 URL 최적화:", imageUrl);
    }

    let imageHtml = `<img src="${imageUrl}" alt="${
      element.alt || element.content || "이미지"
    }" style="${styles}">`;

    // 이미지 링크가 있는 경우 (ctaUrl 사용)
    if (element.ctaUrl) {
      const linkStyles =
        "display: inline-block; text-decoration: none; border: none;";
      imageHtml = `<a href="${element.ctaUrl}" target="_blank" style="${linkStyles}">${imageHtml}</a>`;
    }

    return imageHtml;
  }

  /**
   * CTA 버튼 생성
   */
  private generateCTAButton(element: SimpleDocumentElement): string {
    const buttonText = element.ctaText || element.content;
    const buttonUrl = element.ctaUrl || "#";

    return `
<!-- CTA 버튼 상단 여백 -->
<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <tr>
    <td style="height: 30px; line-height: 30px; font-size: 1px;">&nbsp;</td>
  </tr>
</table>

<!-- CTA 버튼 -->
<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <tr>
    <td style="text-align: center;">
      <table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 0; background-color: ${
            this.options.ctaButtonColor
          }; border-radius: 6px;">
            <a href="${buttonUrl}" style="
              display: block;
              padding: 16px 32px;
              background-color: ${this.options.ctaButtonColor} !important;
              color: ${this.options.ctaTextColor} !important;
              text-decoration: none !important;
              border-radius: 6px;
              font-weight: bold;
              font-size: 16px;
              line-height: 1.2;
              text-align: center;
              border: none;
              font-family: ${this.options.fontFamily};
              mso-line-height-rule: exactly;
            " target="_blank">
              <font color="${this.options.ctaTextColor}" style="color: ${
      this.options.ctaTextColor
    } !important; text-decoration: none !important;">
                <span style="color: ${
                  this.options.ctaTextColor
                } !important; text-decoration: none !important;">
                  ${this.escapeHtml(buttonText)}
                </span>
              </font>
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- CTA 버튼 하단 여백 -->
<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <tr>
    <td style="height: 40px; line-height: 40px; font-size: 1px;">&nbsp;</td>
  </tr>
</table>`.trim();
  }

  /**
   * 여백 생성
   */
  private generateSpace(element: SimpleDocumentElement): string {
    const height = (element.level || 1) * 15; // 기본 15px * 레벨
    return `<div style="margin: ${height}px 0; height: ${height}px; line-height: ${height}px;">&nbsp;</div>`;
  }

  /**
   * 인라인 스타일 생성
   */
  private generateInlineStyles(
    formatting: SimpleDocumentElement["formatting"] = {},
    baseStyles: Record<string, string | number> = {}
  ): string {
    const styles: Record<string, string | number> = { ...baseStyles };

    if (formatting.bold) {
      styles.fontWeight = "bold !important";
    }

    if (formatting.italic) {
      styles.fontStyle = "italic";
    }

    if (formatting.underline) {
      styles.textDecoration = "underline";
    }

    if (formatting.fontSize) {
      styles.fontSize = `${formatting.fontSize}px`;
    }

    if (formatting.color) {
      styles.color = formatting.color;
    }

    if (formatting.backgroundColor) {
      styles.backgroundColor = formatting.backgroundColor;
    }

    if (formatting.alignment) {
      styles.textAlign = formatting.alignment;
    }

    // 기본 폰트 패밀리 추가
    if (!styles.fontFamily) {
      styles.fontFamily = this.options.fontFamily;
    }

    return Object.entries(styles)
      .map(([key, value]) => `${this.kebabCase(key)}: ${value}`)
      .join("; ");
  }

  /**
   * 헤딩 폰트 크기 계산
   */
  private getHeadingFontSize(level: number): string {
    const sizes = {
      1: "24px",
      2: "20px",
      3: "18px",
      4: "16px",
      5: "14px",
      6: "12px",
    };
    return sizes[level as keyof typeof sizes] || "16px";
  }

  /**
   * 헤딩 마진 계산
   */
  private getHeadingMargin(level: number): string {
    const margins = {
      1: "20px 0 16px 0",
      2: "18px 0 14px 0",
      3: "16px 0 12px 0",
      4: "14px 0 10px 0",
      5: "12px 0 8px 0",
      6: "10px 0 6px 0",
    };
    return margins[level as keyof typeof margins] || "16px 0 12px 0";
  }

  /**
   * HTML 컨테이너로 감싸기
   */
  private wrapInContainer(content: string): string {
    return `
<div style="
  font-family: ${this.options.fontFamily};
  line-height: ${this.options.lineHeight};
  color: ${this.options.baseColor};
  max-width: ${this.options.maxWidth}px;
  margin: 0 auto;
  padding: 20px;
">
  ${content}
</div>`.trim();
  }

  /**
   * HTML 이스케이프
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * camelCase를 kebab-case로 변환
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  }
}

export const htmlGenerator = new HtmlGenerator();
