import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import {
  convertGoogleImagesToBase64,
  enhancedCTAConversion,
  extractLinksFromComments,
  createMailchimpButton,
  convertSpaceToMargin,
  convertImageLinks,
  enhanceBoldText,
} from "@/app/utils/converter";

export async function POST(request: NextRequest) {
  try {
    const { htmlUrl } = await request.json();

    if (!htmlUrl) {
      return NextResponse.json(
        { error: "HTML URL이 필요합니다." },
        { status: 400 }
      );
    }

    const response = await fetch(htmlUrl);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "구글 독스에서 HTML을 가져올 수 없습니다. 문서가 공개되었는지 확인해주세요.",
        },
        { status: 400 }
      );
    }

    const html = await response.text();

    // 디버깅: 원본 HTML에서 볼드 관련 패턴 확인
    console.log("🔍 === 원본 HTML 볼드 패턴 분석 ===");

    // 더 정확한 패턴들로 분석
    const boldPatterns = [
      { name: "b 태그", pattern: /<b[^>]*>.*?<\/b>/gi },
      { name: "strong 태그", pattern: /<strong[^>]*>.*?<\/strong>/gi },
      {
        name: "font-weight 포함 span",
        pattern: /<span[^>]*font-weight[^>]*>.*?<\/span>/gi,
      },
      {
        name: "font-weight:700",
        pattern:
          /<span[^>]*style="[^"]*font-weight:\s*700[^"]*"[^>]*>.*?<\/span>/gi,
      },
      {
        name: "font-weight:bold",
        pattern:
          /<span[^>]*style="[^"]*font-weight:\s*bold[^"]*"[^>]*>.*?<\/span>/gi,
      },
      { name: "모든 span", pattern: /<span[^>]*>.*?<\/span>/gi },
    ];

    boldPatterns.forEach(({ name, pattern }) => {
      const matches = html.match(pattern) || [];
      console.log(`🔍 ${name}: ${matches.length}개`);
      if (matches.length > 0 && matches[0]) {
        console.log(`🔍 ${name} 샘플:`, matches[0].substring(0, 300));
      }
    });

    // 특별히 구글 독스에서 자주 나타나는 패턴 확인
    const googleDocsPatterns = [
      /style="[^"]*font-weight:\s*700[^"]*"/gi,
      /style="[^"]*font-weight:\s*bold[^"]*"/gi,
      /style="[^"]*font-family:[^;]*;[^"]*font-weight[^"]*"/gi,
    ];

    console.log("🔍 === 구글 독스 특수 패턴 ===");
    googleDocsPatterns.forEach((pattern, index) => {
      const matches = html.match(pattern) || [];
      console.log(`🔍 구글독스 패턴 ${index + 1}: ${matches.length}개`);
      if (matches.length > 0) {
        matches.slice(0, 3).forEach((match, i) => {
          console.log(`🔍 샘플 ${i + 1}:`, match);
        });
      }
    });

    // 코멘트에서 링크를 추출
    const commentLinks = extractLinksFromComments(html);

    const $ = cheerio.load(html);

    // 먼저 볼드체 처리 (속성 제거 전에)
    console.log("🔍 볼드체 처리 시작 - Cheerio 단계");

    // 1. 기본 b, strong 태그 처리
    const bStrongCount = $("b, strong").length;
    console.log("🔍 b, strong 태그 개수:", bStrongCount);

    $("b, strong").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";
      console.log("🔍 b/strong 태그 스타일:", existingStyle);

      let cleanStyle = existingStyle.replace(/font-weight\s*:\s*[^;]*;?/gi, "");
      cleanStyle = cleanStyle.replace(/;\s*$/, "");

      const newStyle = cleanStyle
        ? `${cleanStyle}; font-weight: bold !important;`
        : "font-weight: bold !important;";

      $elem.attr("style", newStyle);
      const element = $elem.get(0);
      if (element) {
        element.tagName = "span";
      }
    });

    // 2. font-weight 스타일이 있는 span 처리
    const fontWeightSpans = $("span[style*='font-weight']");
    console.log("🔍 font-weight 스타일 span 개수:", fontWeightSpans.length);

    fontWeightSpans.each((_, elem) => {
      const $elem = $(elem);
      const style = $elem.attr("style") || "";
      console.log("🔍 span 스타일:", style);

      const weightMatch = style.match(
        /font-weight:\s*(bold|bolder|[5-9]\d\d)/i
      );
      if (weightMatch) {
        console.log("🔍 볼드 매치:", weightMatch[1]);
        let cleanStyle = style.replace(/font-weight:\s*[^;]*;?/gi, "");
        cleanStyle = cleanStyle.replace(/;\s*$/, "");

        const newStyle = cleanStyle
          ? `${cleanStyle}; font-weight: bold !important;`
          : "font-weight: bold !important;";

        $elem.attr("style", newStyle);
      }
    });

    // 불필요한 태그만 제거 (스타일은 보존)
    $("script").remove();
    $("meta").remove();
    $("title").remove();

    // 위험한 속성만 제거 (style은 보존, class는 볼드 처리 후 제거)
    $("*").each((_, elem) => {
      $(elem).removeAttr("class");
      $(elem).removeAttr("id");
      $(elem).removeAttr("onclick");
      $(elem).removeAttr("onload");
      $(elem).removeAttr("onerror");
    });

    // 하이퍼링크 보존 및 스타일 적용 (이미지 링크 포함)
    $("a").each((_, elem) => {
      const $elem = $(elem);
      const href = $elem.attr("href");
      const existingStyle = $elem.attr("style") || "";

      // 구글 독스 리다이렉트 URL을 실제 URL로 변환
      if (href && href.includes("www.google.com/url")) {
        try {
          const urlParams = new URL(href).searchParams;
          const actualUrl = urlParams.get("q") || href;
          $elem.attr("href", actualUrl);
        } catch {
          // URL 파싱 실패 시 원본 유지
        }
      }

      // 이미지가 포함된 링크인지 확인
      const hasImage = $elem.find("img").length > 0;

      if (hasImage) {
        // 이미지 링크의 경우 특별 처리
        let linkStyle = existingStyle;

        // 이미지 링크는 밑줄 제거하고 블록 스타일 적용
        if (!linkStyle.includes("text-decoration")) {
          linkStyle += "; text-decoration: none;";
        }
        if (!linkStyle.includes("display")) {
          linkStyle += "; display: inline-block;";
        }
        if (!linkStyle.includes("border")) {
          linkStyle += "; border: none;";
        }

        $elem.attr("style", linkStyle.replace(/^;\s*/, ""));
        $elem.attr("target", "_blank");

        // 이미지에도 클릭 가능 스타일 추가
        $elem.find("img").each((_, img) => {
          const $img = $(img);
          const imgStyle = $img.attr("style") || "";
          if (!imgStyle.includes("cursor")) {
            $img.attr(
              "style",
              `${imgStyle}; cursor: pointer;`.replace(/^;\s*/, "")
            );
          }
        });
      } else {
        // 텍스트 링크의 경우 기존 로직 유지
        const hasExistingColor = existingStyle.includes("color:");
        let linkStyle = existingStyle;

        if (!hasExistingColor) {
          // 기존 색상이 없으면 파란색 적용
          linkStyle = `${existingStyle}; color: #1a73e8;`.replace(/^;\s*/, "");
        }

        // 밑줄과 target은 항상 적용
        if (!linkStyle.includes("text-decoration:")) {
          linkStyle += "; text-decoration: underline;";
        }

        $elem.attr("style", linkStyle.replace(/^;\s*/, ""));
        $elem.attr("target", "_blank");
      }
    });

    $("i, em").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";
      $elem.attr(
        "style",
        `${existingStyle}; font-style: italic;`.replace(/^;\s*/, "")
      );
      const element = $elem.get(0);
      if (element) {
        element.tagName = "span";
      }
    });

    // 밑줄 처리 - 링크가 아닌 경우에만 span으로 변환
    $("u").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";

      // 부모나 자식에 링크가 있는지 확인
      const hasLink =
        $elem.find("a").length > 0 || $elem.parents("a").length > 0;

      if (!hasLink) {
        $elem.attr(
          "style",
          `${existingStyle}; text-decoration: underline;`.replace(/^;\s*/, "")
        );
        const element = $elem.get(0);
        if (element) {
          element.tagName = "span";
        }
      } else {
        // 링크가 있는 경우 밑줄 스타일만 추가
        $elem.attr(
          "style",
          `${existingStyle}; text-decoration: underline;`.replace(/^;\s*/, "")
        );
      }
    });

    // 단락과 헤딩에 메일침프 친화적 스타일 추가
    $("p").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";

      // 기존 폰트 크기가 있으면 보존, 없으면 기본값 적용
      const hasFontSize = existingStyle.includes("font-size");
      const baseStyle = hasFontSize
        ? existingStyle
        : `${existingStyle}; font-size: 14px;`;

      $elem.attr(
        "style",
        `${baseStyle}; margin: 0 0 16px 0; line-height: 1.6;`.replace(
          /^;\s*/,
          ""
        )
      );
    });

    $("h1").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";

      // 기존 폰트 크기가 있으면 보존, 없으면 기본값 적용
      const hasFontSize = existingStyle.includes("font-size");
      const baseStyle = hasFontSize
        ? existingStyle
        : `${existingStyle}; font-size: 24px;`;

      $elem.attr(
        "style",
        `${baseStyle}; font-weight: bold; margin: 20px 0 16px 0; line-height: 1.3;`.replace(
          /^;\s*/,
          ""
        )
      );
    });

    $("h2").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";

      const hasFontSize = existingStyle.includes("font-size");
      const baseStyle = hasFontSize
        ? existingStyle
        : `${existingStyle}; font-size: 20px;`;

      $elem.attr(
        "style",
        `${baseStyle}; font-weight: bold; margin: 18px 0 14px 0; line-height: 1.3;`.replace(
          /^;\s*/,
          ""
        )
      );
    });

    $("h3").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";

      const hasFontSize = existingStyle.includes("font-size");
      const baseStyle = hasFontSize
        ? existingStyle
        : `${existingStyle}; font-size: 18px;`;

      $elem.attr(
        "style",
        `${baseStyle}; font-weight: bold; margin: 16px 0 12px 0; line-height: 1.3;`.replace(
          /^;\s*/,
          ""
        )
      );
    });

    // 리스트 스타일링
    $("ul").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";
      $elem.attr(
        "style",
        `${existingStyle}; margin: 16px 0; padding-left: 20px;`.replace(
          /^;\s*/,
          ""
        )
      );
    });

    $("ol").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";
      $elem.attr(
        "style",
        `${existingStyle}; margin: 16px 0; padding-left: 20px;`.replace(
          /^;\s*/,
          ""
        )
      );
    });

    $("li").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";
      $elem.attr(
        "style",
        `${existingStyle}; margin: 8px 0; line-height: 1.6;`.replace(
          /^;\s*/,
          ""
        )
      );
    });

    // 이미지 처리 (링크는 위에서 이미 처리됨)
    $("img").each((_, elem) => {
      const $elem = $(elem);
      const src = $elem.attr("src");

      // 상대 경로를 절대 경로로 변환
      if (src && src.startsWith("//")) {
        $elem.attr("src", "https:" + src);
      }

      // 이미지에 기본 스타일 추가 (메일 호환성)
      const existingStyle = $elem.attr("style") || "";
      let newStyle = existingStyle;

      // 기본 이미지 스타일 추가 (중복 체크)
      if (!newStyle.includes("max-width")) {
        newStyle += "; max-width: 100%;";
      }
      if (!newStyle.includes("height") || !newStyle.includes("auto")) {
        newStyle += "; height: auto;";
      }
      if (!newStyle.includes("display")) {
        newStyle += "; display: block;";
      }
      if (!newStyle.includes("border")) {
        newStyle += "; border: 0;";
      }

      $elem.attr("style", newStyle.replace(/^;\s*/, ""));
    });

    // 텍스트 요소들의 색상 보존 강화 및 bold 스타일 보강
    $("span, div, p").each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr("style") || "";

      // 기존 스타일이 있으면 보존하고, 라인 높이만 추가
      if (existingStyle) {
        let newStyle = existingStyle;

        // font-weight가 이미 bold로 설정되어 있는데 !important가 없으면 추가
        if (
          existingStyle.includes("font-weight") &&
          existingStyle.includes("bold")
        ) {
          if (!existingStyle.includes("!important")) {
            newStyle = existingStyle.replace(
              /font-weight\s*:\s*bold\s*;?/gi,
              "font-weight: bold !important;"
            );
          }
        }

        // 라인 높이 추가
        if (!newStyle.includes("line-height")) {
          newStyle = `${newStyle}; line-height: 1.6;`;
        }

        $elem.attr("style", newStyle);
      }
    });

    // CTA 텍스트를 찾아서 버튼으로 변환 (모든 텍스트 요소에서 검색)
    $("p, div, span, h1, h2, h3, h4, h5, h6").each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text();
      const html = $elem.html();

      // [cta] 또는 CTA로 시작하는 텍스트 찾기
      if (
        text.trim().match(/^\[cta\]/i) ||
        text.trim().startsWith("CTA") ||
        text.includes("<CTA>")
      ) {
        // [cta] 패턴 처리
        const ctaMatch =
          text.match(/\[cta\]\s*([^\n\r\[]+)(?:\s*\[\/cta\])?/i) ||
          text.match(/CTA[:\s]*([^\n\r]+)/i);

        if (ctaMatch) {
          const buttonText = ctaMatch[1].trim();

          // 1. 먼저 HTML에서 링크 추출 (하이퍼링크가 있는 경우)
          const linkInHtml = html?.match(
            /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i
          );

          let buttonUrl = "#";
          let finalButtonText = buttonText;

          if (linkInHtml) {
            // HTML에 링크가 있는 경우 그 링크 사용
            finalButtonText = linkInHtml[2].trim();
            buttonUrl = linkInHtml[1].trim();

            // 구글 독스 리다이렉트 URL 처리
            if (buttonUrl.includes("www.google.com/url")) {
              try {
                const urlParams = new URL(buttonUrl).searchParams;
                const actualUrl = urlParams.get("q") || buttonUrl;
                buttonUrl = actualUrl;
              } catch {
                // URL 파싱 실패 시 원본 유지
              }
            }
          } else {
            // 2. 텍스트에서 직접 링크 추출
            const linkPatterns = [
              // 일반 URL 패턴
              /(.*?)\s*(https?:\/\/[^\s]+)/,
              // 괄호 안의 링크
              /(.*?)\s*\((https?:\/\/[^)]+)\)/,
              // 마크다운 스타일 링크
              /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/,
              // 텍스트 뒤에 바로 붙은 링크
              /([^h]+)(https?:\/\/[^\s]+)/,
            ];

            for (const pattern of linkPatterns) {
              const linkMatch = buttonText.match(pattern);
              if (linkMatch) {
                finalButtonText = linkMatch[1].trim();
                buttonUrl = linkMatch[2].trim();
                break;
              }
            }

            // 3. 코멘트 링크에서 매칭되는 링크 찾기
            if (buttonUrl === "#") {
              Object.keys(commentLinks).forEach((key) => {
                if (
                  buttonText.toLowerCase().includes(key.toLowerCase()) ||
                  key.toLowerCase().includes(buttonText.toLowerCase())
                ) {
                  buttonUrl = commentLinks[key];
                }
              });
            }
          }

          const buttonHtml = createMailchimpButton(finalButtonText, buttonUrl);
          $elem.replaceWith(buttonHtml);
        }
      }
    });

    // 페이지 구분 감지 및 섹션 간 여백 추가
    let bodyContent = $("body").html() || $.html();

    // 구글 독스의 페이지 구분 패턴들을 감지
    const pageBreakPatterns = [
      // 페이지 구분 관련 클래스나 스타일
      /<div[^>]*page-break[^>]*>/gi,
      /<div[^>]*break-before[^>]*>/gi,
      /<div[^>]*break-after[^>]*>/gi,
      // 구글 독스 특정 페이지 구분 패턴
      /<div[^>]*style="[^"]*page-break[^"]*"[^>]*>/gi,
      // 연속된 빈 줄들 (3개 이상의 br 태그)
      /(<br[^>]*>\s*){3,}/gi,
      // 긴 여백을 가진 div들
      /<div[^>]*style="[^"]*margin-top:\s*[4-9]\d+px[^"]*"[^>]*>/gi,
      /<div[^>]*style="[^"]*margin-bottom:\s*[4-9]\d+px[^"]*"[^>]*>/gi,
    ];

    // 페이지 구분을 섹션 구분으로 변환
    pageBreakPatterns.forEach((pattern) => {
      bodyContent = bodyContent.replace(pattern, (match) => {
        return `<div style="margin: 40px 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 20px;"></div>${match}`;
      });
    });

    // 연속된 단락들 사이의 여백 조정
    bodyContent = bodyContent.replace(/(<\/p>\s*<p[^>]*>)/gi, (match) => {
      return match.replace("<p", '<p style="margin-top: 20px;"');
    });

    // 제목 태그들 사이의 여백 증가
    bodyContent = bodyContent.replace(
      /(<\/h[1-6]>\s*<h[1-6][^>]*>)/gi,
      (match) => {
        return match.replace(/<h([1-6])([^>]*)>/, (hMatch, level, attrs) => {
          return `<h${level} style="margin-top: 35px; margin-bottom: 15px;"${attrs}>`;
        });
      }
    );

    // 리스트와 다른 요소들 사이의 여백 조정
    bodyContent = bodyContent.replace(
      /(<\/ul>\s*<p[^>]*>)|(<\/ol>\s*<p[^>]*>)/gi,
      (match) => {
        return match.replace("<p", '<p style="margin-top: 25px;"');
      }
    );

    bodyContent = bodyContent.replace(
      /(<\/p>\s*<ul[^>]*>)|(<\/p>\s*<ol[^>]*>)/gi,
      (match) => {
        return match.replace(/<(ul|ol)/, '<$1 style="margin-top: 20px;"');
      }
    );

    // CTA 변환을 개선된 함수로 처리
    const ctaProcessedHtml = enhancedCTAConversion(bodyContent, commentLinks);

    // [space] 변환 처리
    const spaceProcessedHtml = convertSpaceToMargin(ctaProcessedHtml);

    // [img-link] 변환 처리
    const imgLinkProcessedHtml = convertImageLinks(spaceProcessedHtml);

    // 기본 이미지 처리 적용
    const imageProcessedHtml =
      convertGoogleImagesToBase64(imgLinkProcessedHtml);

    // 최종 볼드체 처리 강화 (HTML 문자열 레벨에서 추가 패턴 처리)
    const finalHtml = enhanceBoldText(imageProcessedHtml);

    // 디버깅: 최종 처리 후 볼드 스타일 확인
    console.log("🔍 === 최종 처리 결과 ===");
    const boldStyleCount = (
      finalHtml.match(/font-weight:\s*bold\s*!important/gi) || []
    ).length;
    console.log("🔍 최종 볼드 스타일 개수:", boldStyleCount);

    // 최종 HTML에서 볼드 관련 태그들 확인
    const finalBoldPatterns = [
      {
        name: "bold !important",
        pattern: /font-weight:\s*bold\s*!important/gi,
      },
      { name: "span 태그", pattern: /<span[^>]*>.*?<\/span>/gi },
      { name: "남은 b/strong", pattern: /<(b|strong)[^>]*>.*?<\/\1>/gi },
    ];

    finalBoldPatterns.forEach(({ name, pattern }) => {
      const matches = finalHtml.match(pattern) || [];
      console.log(`🔍 최종 ${name}: ${matches.length}개`);
      if (matches.length > 0 && name === "bold !important") {
        matches.slice(0, 3).forEach((match, i) => {
          console.log(`🔍 최종 볼드 샘플 ${i + 1}:`, match);
        });
      }
    });

    const mailchimpFriendlyHtml = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  ${finalHtml}
</div>
    `.trim();

    return NextResponse.json({
      html: mailchimpFriendlyHtml,
      success: true,
    });
  } catch (error) {
    console.error("변환 오류:", error);
    return NextResponse.json(
      { error: "변환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
