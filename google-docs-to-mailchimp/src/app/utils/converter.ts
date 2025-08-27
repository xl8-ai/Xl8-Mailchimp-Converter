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

export async function convertGoogleDocsToHtml(
  googleDocsUrl: string
): Promise<string> {
  try {
    const documentId = extractDocumentId(googleDocsUrl);
    const htmlUrl = getPublicHtmlUrl(documentId);

    const response = await fetch("/api/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ htmlUrl }),
    });

    if (!response.ok) {
      throw new Error("HTML 변환에 실패했습니다.");
    }

    const data = await response.json();
    return data.html;
  } catch (error) {
    console.error("변환 오류:", error);
    throw error;
  }
}

export function sanitizeHtmlForMailchimp(html: string): string {
  let cleanHtml = html;

  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  cleanHtml = cleanHtml.replace(/style="[^"]*"/gi, "");

  cleanHtml = cleanHtml.replace(/<meta[^>]*>/gi, "");
  cleanHtml = cleanHtml.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
  cleanHtml = cleanHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  cleanHtml = cleanHtml.replace(/<html[^>]*>/gi, "");
  cleanHtml = cleanHtml.replace(/<\/html>/gi, "");
  cleanHtml = cleanHtml.replace(/<body[^>]*>/gi, "");
  cleanHtml = cleanHtml.replace(/<\/body>/gi, "");

  cleanHtml = cleanHtml.replace(/\s+/g, " ").trim();

  return cleanHtml;
}

export function preserveStylesForMailchimp(html: string): string {
  let processedHtml = html;

  // 스크립트와 위험한 태그만 제거
  processedHtml = processedHtml.replace(
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    ""
  );
  processedHtml = processedHtml.replace(/<meta[^>]*>/gi, "");
  processedHtml = processedHtml.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
  processedHtml = processedHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
  processedHtml = processedHtml.replace(/<html[^>]*>/gi, "");
  processedHtml = processedHtml.replace(/<\/html>/gi, "");
  processedHtml = processedHtml.replace(/<body[^>]*>/gi, "");
  processedHtml = processedHtml.replace(/<\/body>/gi, "");

  return processedHtml;
}

export function processGoogleDocsLinks(html: string): string {
  let processedHtml = html;

  // 구글 독스 리다이렉트 링크를 실제 링크로 변환
  processedHtml = processedHtml.replace(
    /href="([^"]*www\.google\.com\/url[^"]*)"/,
    (match, url) => {
      try {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        const actualUrl = urlParams.get("q") || url;
        return `href="${actualUrl}"`;
      } catch {
        return match;
      }
    }
  );

  // 링크에 메일침프 친화적 스타일 적용
  processedHtml = processedHtml.replace(/<a([^>]*)>/gi, (match, attributes) => {
    // 기존 스타일 확인
    const styleMatch = attributes.match(/style="([^"]*)"/i);
    const existingStyle = styleMatch ? styleMatch[1] : "";

    // 새로운 스타일 추가
    const newStyle =
      `${existingStyle}; color: #1a73e8; text-decoration: underline;`.replace(
        /^;\s*/,
        ""
      );

    // 속성에서 기존 스타일 제거하고 새 스타일과 target="_blank" 추가
    let newAttributes = attributes.replace(/style="[^"]*"/gi, "");
    newAttributes = newAttributes.replace(/target="[^"]*"/gi, "");
    newAttributes += ` style="${newStyle}" target="_blank"`;

    return `<a${newAttributes}>`;
  });

  return processedHtml;
}

export function convertGoogleImagesToBase64(html: string): string {
  let processedHtml = html;

  // 이미지 URL 패턴들 - 링크로 감싸진 이미지도 고려
  const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

  // 모든 이미지 태그를 찾아서 처리
  processedHtml = processedHtml.replace(imageRegex, (match, imageUrl) => {
    let fixedUrl = imageUrl;

    // 상대 경로 처리 (// 로 시작하는 URL)
    if (fixedUrl.startsWith("//")) {
      fixedUrl = "https:" + fixedUrl;
    }

    // 구글 이미지 URL 최적화
    if (
      fixedUrl.includes("googleusercontent.com") &&
      !fixedUrl.includes("=w")
    ) {
      fixedUrl += fixedUrl.includes("?") ? "&w=600" : "?w=600";
    }

    // 이미지 태그에 이메일 친화적 속성 추가
    let newImg = match.replace(/src=["']([^"']+)["']/i, `src="${fixedUrl}"`);

    // 기본 스타일 추가 (기존 스타일 보존)
    const existingStyle = newImg.match(/style=["']([^"']*)["']/i);
    const currentStyle = existingStyle ? existingStyle[1] : "";

    let newStyle = currentStyle;

    // 필수 이미지 스타일 추가 (중복 체크)
    if (!newStyle.includes("max-width")) {
      newStyle += "; max-width: 100%";
    }
    if (!newStyle.includes("height") || !newStyle.includes("auto")) {
      newStyle += "; height: auto";
    }
    if (!newStyle.includes("border") || !newStyle.includes("0")) {
      newStyle += "; border: 0";
    }

    // display는 링크 안의 이미지인지 확인 후 설정
    // (링크 안의 이미지는 inline-block이 더 적절)
    if (!newStyle.includes("display")) {
      newStyle += "; display: block";
    }

    // 스타일 정리 및 적용
    newStyle = newStyle.replace(/^;\s*/, "").replace(/;\s*$/, "");

    if (existingStyle) {
      newImg = newImg.replace(/style=["'][^"']*["']/i, `style="${newStyle}"`);
    } else {
      newImg = newImg.replace("<img", `<img style="${newStyle}"`);
    }

    // alt 속성이 없으면 추가
    if (!newImg.includes("alt=")) {
      newImg = newImg.replace("<img", '<img alt="이미지"');
    }

    return newImg;
  });

  return processedHtml;
}

export function improveImageHandling(html: string): string {
  let processedHtml = html;

  // 다양한 구글 독스 이미지 URL 패턴 처리
  const imagePatterns = [
    // 표준 googleusercontent.com 이미지
    /src="(https:\/\/[^"]*googleusercontent\.com[^"]*)"/gi,
    // docs.google.com에서 직접 호스팅되는 이미지
    /src="(https:\/\/docs\.google\.com\/[^"]*)/gi,
    // drive.google.com 이미지
    /src="(https:\/\/drive\.google\.com\/[^"]*)/gi,
    // 상대 경로 이미지 (// 로 시작)
    /src="(\/\/[^"]*googleusercontent\.com[^"]*)"/gi,
  ];

  imagePatterns.forEach((pattern) => {
    processedHtml = processedHtml.replace(pattern, (match, url) => {
      let fixedUrl = url;

      // 상대 경로면 https: 추가
      if (url.startsWith("//")) {
        fixedUrl = "https:" + url;
      }

      // 이미지 URL에 필요한 파라미터 추가 (크기 제한 등)
      if (
        fixedUrl.includes("googleusercontent.com") &&
        !fixedUrl.includes("=w")
      ) {
        fixedUrl += fixedUrl.includes("?") ? "&w=600" : "?w=600";
      }

      return `src="${fixedUrl}"`;
    });
  });

  // 이미지 태그에 안전한 속성 추가
  processedHtml = processedHtml.replace(
    /<img([^>]*?)>/gi,
    (match, attributes) => {
      let newAttributes = attributes;

      // alt 속성이 없으면 추가
      if (!attributes.includes("alt=")) {
        newAttributes += ' alt="이미지"';
      }

      // loading 속성 추가 (일부 이메일 클라이언트에서 지원)
      if (!attributes.includes("loading=")) {
        newAttributes += ' loading="lazy"';
      }

      return `<img${newAttributes}>`;
    }
  );

  return processedHtml;
}

export function extractGoogleDocsComments(html: string): {
  [key: string]: string;
} {
  const comments: { [key: string]: string } = {};

  // 구글 독스의 댓글/제안 패턴들
  const commentPatterns = [
    // 댓글 데이터 속성
    /data-comment-id="([^"]*)"[^>]*>([^<]+)</gi,
    /data-suggestion-id="([^"]*)"[^>]*>([^<]+)</gi,
    // 댓글 마커
    /<span[^>]*class="[^"]*comment[^"]*"[^>]*>([^<]+)<\/span>/gi,
    // 제안된 변경사항
    /<span[^>]*class="[^"]*suggestion[^"]*"[^>]*>([^<]+)<\/span>/gi,
    // HTML 댓글 형식
    /<!--\s*댓글:\s*([^>]+)\s*-->/gi,
    /<!--\s*comment:\s*([^>]+)\s*-->/gi,
    // 구글 독스 특정 댓글 구조
    /<a[^>]*href="[^"]*commentId=([^"&]*)[^"]*"[^>]*>([^<]+)<\/a>/gi,
  ];

  commentPatterns.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const commentId =
        match[1] || `comment_${index}_${Object.keys(comments).length}`;
      const commentText = match[2] || match[1];

      if (commentText && commentText.trim()) {
        comments[commentId] = commentText.trim();
      }
    }
  });

  return comments;
}

export function enhanceMarkdownStyles(html: string): string {
  let processedHtml = html;

  // 굵은 글씨 처리 (b, strong 태그를 인라인 스타일로)
  // 이모지와 특수문자가 포함된 텍스트도 안전하게 처리
  processedHtml = processedHtml.replace(
    /<(b|strong)([^>]*)>(.*?)<\/(b|strong)>/gi,
    (match, openTag, attributes, content) => {
      return `<span style="font-weight: bold !important;">${content}</span>`;
    }
  );

  // 중첩된 span 태그가 있는 경우 bold 스타일 보강
  processedHtml = processedHtml.replace(
    /<span([^>]*?)>(.*?)<\/span>/gi,
    (match, attributes, content) => {
      // 이미 font-weight가 있거나 bold 클래스가 있는 경우 !important 추가
      if (attributes.includes("font-weight") || attributes.includes("bold")) {
        let newAttributes = attributes.replace(/font-weight:\s*[^;]*;?/gi, "");
        newAttributes = newAttributes.replace(/font-weight/gi, "");
        return `<span${newAttributes} style="font-weight: bold !important;">${content}</span>`;
      }
      return match;
    }
  );

  // 이탤릭 처리 (i, em 태그를 인라인 스타일로)
  // 이모지와 특수문자가 포함된 텍스트도 안전하게 처리
  processedHtml = processedHtml.replace(
    /<(i|em)([^>]*)>(.*?)<\/(i|em)>/gi,
    (match, openTag, attributes, content) => {
      return `<span style="font-style: italic;">${content}</span>`;
    }
  );

  // 밑줄 처리 - 구글 독스의 밑줄은 항상 유지
  processedHtml = processedHtml.replace(
    /<u([^>]*)>(.*?)<\/u>/gi,
    (match, attributes, content) => {
      // 링크가 포함된 경우에도 밑줄 스타일 적용
      if (content.includes("<a ") || content.includes("<a>")) {
        // 링크 내부에 밑줄 스타일 추가
        return content.replace(
          /<a([^>]*)>/gi,
          '<a$1 style="text-decoration: underline !important;">'
        );
      } else {
        // 일반 텍스트는 span으로 변환
        return `<span style="text-decoration: underline !important;">${content}</span>`;
      }
    }
  );

  // 줄바꿈 처리 (br 태그 강화)
  processedHtml = processedHtml.replace(
    /<br\s*\/?>/gi,
    '<br style="line-height: 1.6;">'
  );

  // 단락 처리 (p 태그에 기본 스타일 추가)
  processedHtml = processedHtml.replace(
    /<p([^>]*)>/gi,
    '<p style="margin: 0 0 16px 0; line-height: 1.6;">'
  );

  // 헤딩 태그들을 메일침프 친화적 스타일로 변환
  processedHtml = processedHtml.replace(
    /<h1([^>]*)>/gi,
    '<h1 style="font-size: 24px; font-weight: bold; margin: 20px 0 16px 0; line-height: 1.3;">'
  );
  processedHtml = processedHtml.replace(
    /<h2([^>]*)>/gi,
    '<h2 style="font-size: 20px; font-weight: bold; margin: 18px 0 14px 0; line-height: 1.3;">'
  );
  processedHtml = processedHtml.replace(
    /<h3([^>]*)>/gi,
    '<h3 style="font-size: 18px; font-weight: bold; margin: 16px 0 12px 0; line-height: 1.3;">'
  );

  // 리스트 처리
  processedHtml = processedHtml.replace(
    /<ul([^>]*)>/gi,
    '<ul style="margin: 16px 0; padding-left: 20px;">'
  );
  processedHtml = processedHtml.replace(
    /<ol([^>]*)>/gi,
    '<ol style="margin: 16px 0; padding-left: 20px;">'
  );
  processedHtml = processedHtml.replace(
    /<li([^>]*)>/gi,
    '<li style="margin: 8px 0; line-height: 1.6;">'
  );

  return processedHtml;
}

export function convertCTAToButton(html: string): string {
  let processedHtml = html;

  // <CTA>텍스트</CTA> 형식이나 <CTA>텍스트 패턴을 찾아서 버튼으로 변환
  processedHtml = processedHtml.replace(
    /<CTA>([^<]+)(?:<\/CTA>)?/gi,
    (match, buttonText) => {
      const cleanText = buttonText.trim();
      return createMailchimpButton(cleanText, "#");
    }
  );

  // CTA: 텍스트 형식도 감지
  processedHtml = processedHtml.replace(
    /CTA:\s*([^\n\r<]+)/gi,
    (match, buttonText) => {
      const cleanText = buttonText.trim();
      return createMailchimpButton(cleanText, "#");
    }
  );

  return processedHtml;
}

export function createMailchimpButton(text: string, url: string = "#"): string {
  return `
<table cellpadding="0" cellspacing="0" style="margin: 20px auto; border-collapse: collapse; width: 100%;">
  <tr>
    <td style="text-align: center;">
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: collapse;">
        <tr>
          <td style="padding: 0; background-color: #ff6b35; border-radius: 6px;">
            <a href="${url}" style="
              display: block;
              padding: 12px 24px;
              background-color: #ff6b35 !important;
              color: #ffffff !important;
              text-decoration: none !important;
              border-radius: 6px;
              font-weight: bold;
              font-size: 16px;
              line-height: 1.2;
              text-align: center;
              border: none;
              font-family: Arial, sans-serif;
              mso-line-height-rule: exactly;
            " target="_blank">
              <font color="#ffffff" style="color: #ffffff !important; text-decoration: none !important;">
                <span style="color: #ffffff !important; text-decoration: none !important;">
                  ${text}
                </span>
              </font>
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

export function extractLinksFromComments(html: string): {
  [key: string]: string;
} {
  const links: { [key: string]: string } = {};

  // 구글 독스 코멘트에서 링크 추출 (다양한 패턴들)
  const commentPatterns = [
    // HTML 코멘트 형식
    /<!--\s*([^:]+):\s*(https?:\/\/[^\s>]+)\s*-->/gi,
    // 데이터 속성 형식
    /data-comment="([^"]*(?:https?:\/\/[^\s"]+)[^"]*?)"/gi,
    // 마크다운 형식
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi,
    // 구글 독스 링크 형식
    /href="(https?:\/\/[^"]+)"[^>]*>([^<]+)</gi,
    // 일반 링크 형식 (텍스트: URL)
    /([^:\n\r]+):\s*(https?:\/\/[^\s\n\r]+)/gi,
  ];

  commentPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (match[2]) {
        // 두 그룹이 있는 경우 (텍스트, URL)
        const key = match[1].trim().replace(/[<>]/g, "");
        const url = match[2].trim();
        if (key && url) {
          links[key] = url;
        }
      } else if (match[1] && match[1].includes("http")) {
        // 한 그룹에 URL이 포함된 경우
        const urlMatch = match[1].match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          const key = match[1]
            .replace(urlMatch[0], "")
            .trim()
            .replace(/[:\-,<>]/g, "")
            .trim();
          if (key) {
            links[key] = urlMatch[0];
          }
        }
      }
    }
  });

  return links;
}

export function enhancedCTAConversion(
  html: string,
  commentLinks: { [key: string]: string }
): string {
  let processedHtml = html;

  // [cta] 패턴 처리 - 가장 우선순위로 처리
  processedHtml = processedHtml.replace(
    /\[cta\]\s*([^\n\r<\[]+)(?:\s*\[\/cta\])?/gi,
    (match, buttonText) => {
      const cleanText = buttonText.trim();

      // 텍스트에서 링크 추출 (다양한 패턴 지원)
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

      let finalButtonText = cleanText;
      let buttonUrl = "#";

      // 각 패턴으로 링크 추출 시도
      for (const pattern of linkPatterns) {
        const linkMatch = cleanText.match(pattern);
        if (linkMatch) {
          finalButtonText = linkMatch[1].trim();
          buttonUrl = linkMatch[2].trim();
          break;
        }
      }

      // 링크를 찾지 못한 경우 코멘트 링크에서 찾기
      if (buttonUrl === "#") {
        const textLower = finalButtonText.toLowerCase();
        Object.keys(commentLinks).forEach((key) => {
          const keyLower = key.toLowerCase();
          if (
            textLower === keyLower ||
            textLower.includes(keyLower) ||
            keyLower.includes(textLower)
          ) {
            buttonUrl = commentLinks[key];
          }
        });
      }

      return createMailchimpButton(finalButtonText, buttonUrl);
    }
  );

  // 기존 CTA 패턴들을 순서대로 처리
  const ctaPatterns = [
    // <CTA>텍스트</CTA>
    /<CTA>([^<]+)<\/CTA>/gi,
    // <CTA>텍스트 (닫는 태그 없음)
    /<CTA>([^<\n\r]+)/gi,
    // CTA: 텍스트
    /CTA:\s*([^\n\r<]+)/gi,
    // CTA 텍스트 (콜론 없음)
    /CTA\s+([^\n\r<]+)/gi,
  ];

  ctaPatterns.forEach((pattern) => {
    processedHtml = processedHtml.replace(pattern, (match, buttonText) => {
      const cleanText = buttonText.trim();

      // 텍스트에서 링크 추출 (다양한 패턴 지원)
      const linkPatterns = [
        /(.*?)\s*(https?:\/\/[^\s]+)/,
        /(.*?)\s*\((https?:\/\/[^)]+)\)/,
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/,
        /([^h]+)(https?:\/\/[^\s]+)/,
      ];

      let finalButtonText = cleanText;
      let buttonUrl = "#";

      for (const pattern of linkPatterns) {
        const linkMatch = cleanText.match(pattern);
        if (linkMatch) {
          finalButtonText = linkMatch[1].trim();
          buttonUrl = linkMatch[2].trim();
          break;
        }
      }

      // 링크를 찾지 못한 경우 코멘트 링크에서 찾기
      if (buttonUrl === "#") {
        const textLower = finalButtonText.toLowerCase();
        Object.keys(commentLinks).forEach((key) => {
          const keyLower = key.toLowerCase();
          if (
            textLower === keyLower ||
            textLower.includes(keyLower) ||
            keyLower.includes(textLower)
          ) {
            buttonUrl = commentLinks[key];
          }
        });
      }

      return createMailchimpButton(finalButtonText, buttonUrl);
    });
  });

  return processedHtml;
}

export function convertSpaceToMargin(html: string): string {
  let processedHtml = html;

  // [space] 패턴을 여백으로 변환 (크기 조정: 20px -> 15px)
  processedHtml = processedHtml.replace(
    /\[space\]/gi,
    '<div style="margin: 15px 0; height: 15px; line-height: 15px;">&nbsp;</div>'
  );

  // 텍스트 요소 안에 [space]가 있는 경우도 처리
  processedHtml = processedHtml.replace(
    /<(p|div|span|h[1-6])[^>]*>([^<]*)\[space\]([^<]*)<\/\1>/gi,
    (match, tag, beforeText, afterText) => {
      const trimmedBefore = beforeText.trim();
      const trimmedAfter = afterText.trim();

      let result = "";

      // 앞 텍스트가 있으면 추가
      if (trimmedBefore) {
        result += match.replace(/\[space\].*$/, trimmedBefore + `</${tag}>`);
      }

      // 여백 추가 (크기 조정: 20px -> 15px)
      result +=
        '<div style="margin: 15px 0; height: 15px; line-height: 15px;">&nbsp;</div>';

      // 뒤 텍스트가 있으면 추가
      if (trimmedAfter) {
        result += `<${tag}>${trimmedAfter}</${tag}>`;
      }

      return result;
    }
  );

  return processedHtml;
}

export function convertImageLinks(html: string): string {
  let processedHtml = html;

  // [img-link:URL] 패턴을 찾아서 다음 이미지에 링크 적용
  processedHtml = processedHtml.replace(
    /\[img-link:\s*(https?:\/\/[^\]]+)\]/gi,
    (match, url) => {
      // 패턴을 임시 마커로 교체
      return `<!--IMG_LINK_MARKER:${url}-->`;
    }
  );

  // 임시 마커 다음에 나오는 이미지를 링크로 감싸기
  processedHtml = processedHtml.replace(
    /<!--IMG_LINK_MARKER:(https?:\/\/[^-->]+)-->\s*(<img[^>]*>)/gi,
    (match, url, imgTag) => {
      return `<a href="${url}" target="_blank" style="display: inline-block; text-decoration: none; border: none;">${imgTag}</a>`;
    }
  );

  // [img-link] URL 패턴도 지원 (띄어쓰기로 구분)
  processedHtml = processedHtml.replace(
    /\[img-link\]\s*(https?:\/\/[^\s<]+)/gi,
    (match, url) => {
      return `<!--IMG_LINK_MARKER:${url}-->`;
    }
  );

  // 다시 임시 마커 처리
  processedHtml = processedHtml.replace(
    /<!--IMG_LINK_MARKER:(https?:\/\/[^-->]+)-->\s*(<img[^>]*>)/gi,
    (match, url, imgTag) => {
      return `<a href="${url}" target="_blank" style="display: inline-block; text-decoration: none; border: none;">${imgTag}</a>`;
    }
  );

  // 이미지 바로 앞의 링크 패턴도 처리 (이미지와 같은 줄에 있는 경우)
  processedHtml = processedHtml.replace(
    /\[link:\s*(https?:\/\/[^\]]+)\]\s*(<img[^>]*>)/gi,
    (match, url, imgTag) => {
      return `<a href="${url}" target="_blank" style="display: inline-block; text-decoration: none; border: none;">${imgTag}</a>`;
    }
  );

  // 남아있는 마커들 제거 (이미지가 없는 경우)
  processedHtml = processedHtml.replace(/<!--IMG_LINK_MARKER:[^-->]+-->/gi, "");

  return processedHtml;
}

// 볼드체 처리를 위한 전용 함수 - 더 강력하고 포괄적인 처리
export function enhanceBoldText(html: string): string {
  let processedHtml = html;

  // 1. 구글 독스의 다양한 볼드 패턴들을 모두 처리
  const boldPatterns = [
    // font-weight: 700, 800, 900 등의 숫자값 (더 넓은 범위)
    /<span([^>]*style="[^"]*font-weight:\s*([6-9]\d\d|bold|bolder)[^"]*"[^>]*)>(.*?)<\/span>/gi,
    // b, strong 태그
    /<(b|strong)([^>]*)>(.*?)<\/\1>/gi,
    // 클래스 기반 볼드
    /<span([^>]*class="[^"]*(?:bold|fw-bold|font-bold|font-weight-bold)[^"]*"[^>]*)>(.*?)<\/span>/gi,
    // 구글 독스 특수 패턴 (font-family와 함께 오는 경우)
    /<span([^>]*style="[^"]*font-family:[^;]*;[^"]*font-weight:\s*([6-9]\d\d|bold)[^"]*"[^>]*)>(.*?)<\/span>/gi,
    // 구글 독스에서 자주 나타나는 패턴: font-weight만 있는 경우
    /<span([^>]*style="[^"]*font-weight:\s*7\d\d[^"]*"[^>]*)>(.*?)<\/span>/gi,
    // 더 광범위한 font-weight 패턴 (500 이상도 볼드로 처리)
    /<span([^>]*style="[^"]*font-weight:\s*([5-9]\d\d)[^"]*"[^>]*)>(.*?)<\/span>/gi,
  ];

  boldPatterns.forEach((pattern) => {
    processedHtml = processedHtml.replace(pattern, (match, ...groups) => {
      // 마지막 그룹이 항상 content
      const content = groups[groups.length - 1];

      // 이미 볼드 처리된 것인지 확인
      if (match.includes("font-weight: bold !important")) {
        return match;
      }

      return `<span style="font-weight: bold !important;">${content}</span>`;
    });
  });

  // 2. 중첩된 볼드 태그 정리 (불필요한 중복 제거)
  processedHtml = processedHtml.replace(
    /<span style="font-weight: bold !important;">([^<]*)<span style="font-weight: bold !important;">([^<]*)<\/span>([^<]*)<\/span>/gi,
    '<span style="font-weight: bold !important;">$1$2$3</span>'
  );

  // 3. 빈 볼드 태그 제거
  processedHtml = processedHtml.replace(
    /<span style="font-weight: bold !important;">\s*<\/span>/gi,
    ""
  );

  // 4. 구글 독스에서 자주 나타나는 특수 케이스 처리
  // 예: <span style="font-weight:700;color:#000000">텍스트</span>
  processedHtml = processedHtml.replace(
    /<span([^>]*style="[^"]*font-weight:\s*7\d\d[^"]*"[^>]*)>(.*?)<\/span>/gi,
    (match, attributes, content) => {
      // 기존 font-weight 제거하고 다른 스타일은 유지
      const otherStyles = attributes.match(/style="([^"]*)"/);
      if (otherStyles) {
        let styleContent = otherStyles[1].replace(
          /font-weight:\s*[^;]*;?/gi,
          ""
        );
        styleContent = styleContent.replace(/;+/g, ";").replace(/^;|;$/g, "");

        if (styleContent) {
          return `<span style="${styleContent}; font-weight: bold !important;">${content}</span>`;
        }
      }
      return `<span style="font-weight: bold !important;">${content}</span>`;
    }
  );

  return processedHtml;
}
