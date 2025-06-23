export function extractDocumentId(url: string): string {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('유효하지 않은 구글 독스 URL입니다.');
  }
  return match[1];
}

export function getPublicHtmlUrl(documentId: string): string {
  return `https://docs.google.com/document/d/${documentId}/export?format=html`;
}

export async function convertGoogleDocsToHtml(googleDocsUrl: string): Promise<string> {
  try {
    const documentId = extractDocumentId(googleDocsUrl);
    const htmlUrl = getPublicHtmlUrl(documentId);
    
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ htmlUrl }),
    });

    if (!response.ok) {
      throw new Error('HTML 변환에 실패했습니다.');
    }

    const data = await response.json();
    return data.html;
  } catch (error) {
    console.error('변환 오류:', error);
    throw error;
  }
}

export function sanitizeHtmlForMailchimp(html: string): string {
  let cleanHtml = html;

  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  cleanHtml = cleanHtml.replace(/style="[^"]*"/gi, '');
  
  cleanHtml = cleanHtml.replace(/<meta[^>]*>/gi, '');
  cleanHtml = cleanHtml.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  cleanHtml = cleanHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  
  cleanHtml = cleanHtml.replace(/<html[^>]*>/gi, '');
  cleanHtml = cleanHtml.replace(/<\/html>/gi, '');
  cleanHtml = cleanHtml.replace(/<body[^>]*>/gi, '');
  cleanHtml = cleanHtml.replace(/<\/body>/gi, '');
  
  cleanHtml = cleanHtml.replace(/\s+/g, ' ').trim();
  
  return cleanHtml;
}

export function preserveStylesForMailchimp(html: string): string {
  let processedHtml = html;

  // 스크립트와 위험한 태그만 제거
  processedHtml = processedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  processedHtml = processedHtml.replace(/<meta[^>]*>/gi, '');
  processedHtml = processedHtml.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  processedHtml = processedHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  processedHtml = processedHtml.replace(/<html[^>]*>/gi, '');
  processedHtml = processedHtml.replace(/<\/html>/gi, '');
  processedHtml = processedHtml.replace(/<body[^>]*>/gi, '');
  processedHtml = processedHtml.replace(/<\/body>/gi, '');

  return processedHtml;
}

export function processGoogleDocsLinks(html: string): string {
  let processedHtml = html;
  
  // 구글 독스 리다이렉트 링크를 실제 링크로 변환
  processedHtml = processedHtml.replace(/href="([^"]*www\.google\.com\/url[^"]*)"/, (match, url) => {
    try {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const actualUrl = urlParams.get('q') || url;
      return `href="${actualUrl}"`;
    } catch {
      return match;
    }
  });
  
  // 링크에 메일침프 친화적 스타일 적용
  processedHtml = processedHtml.replace(/<a([^>]*)>/gi, (match, attributes) => {
    // 기존 스타일 확인
    const styleMatch = attributes.match(/style="([^"]*)"/i);
    const existingStyle = styleMatch ? styleMatch[1] : '';
    
    // 새로운 스타일 추가
    const newStyle = `${existingStyle}; color: #1a73e8; text-decoration: underline;`.replace(/^;\s*/, '');
    
    // 속성에서 기존 스타일 제거하고 새 스타일과 target="_blank" 추가
    let newAttributes = attributes.replace(/style="[^"]*"/gi, '');
    newAttributes = newAttributes.replace(/target="[^"]*"/gi, '');
    newAttributes += ` style="${newStyle}" target="_blank"`;
    
    return `<a${newAttributes}>`;
  });
  
  return processedHtml;
}

export function convertGoogleImagesToBase64(html: string): string {
  // 구글 독스 이미지를 그대로 유지 (URL 수정하지 않음)
  return html;
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
    /src="(\/\/[^"]*googleusercontent\.com[^"]*)"/gi
  ];

  imagePatterns.forEach(pattern => {
    processedHtml = processedHtml.replace(pattern, (match, url) => {
      let fixedUrl = url;
      
      // 상대 경로면 https: 추가
      if (url.startsWith('//')) {
        fixedUrl = 'https:' + url;
      }
      
      // 이미지 URL에 필요한 파라미터 추가 (크기 제한 등)
      if (fixedUrl.includes('googleusercontent.com') && !fixedUrl.includes('=w')) {
        fixedUrl += fixedUrl.includes('?') ? '&w=600' : '?w=600';
      }
      
      return `src="${fixedUrl}"`;
    });
  });

  // 이미지 태그에 안전한 속성 추가
  processedHtml = processedHtml.replace(/<img([^>]*?)>/gi, (match, attributes) => {
    let newAttributes = attributes;
    
    // alt 속성이 없으면 추가
    if (!attributes.includes('alt=')) {
      newAttributes += ' alt="이미지"';
    }
    
    // loading 속성 추가 (일부 이메일 클라이언트에서 지원)
    if (!attributes.includes('loading=')) {
      newAttributes += ' loading="lazy"';
    }
    
    return `<img${newAttributes}>`;
  });

  return processedHtml;
}

export function extractGoogleDocsComments(html: string): { [key: string]: string } {
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
    /<a[^>]*href="[^"]*commentId=([^"&]*)[^"]*"[^>]*>([^<]+)<\/a>/gi
  ];
  
  commentPatterns.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const commentId = match[1] || `comment_${index}_${Object.keys(comments).length}`;
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
  processedHtml = processedHtml.replace(/<(b|strong)([^>]*)>/gi, '<span style="font-weight: bold;">');
  processedHtml = processedHtml.replace(/<\/(b|strong)>/gi, '</span>');

  // 이탤릭 처리 (i, em 태그를 인라인 스타일로)
  processedHtml = processedHtml.replace(/<(i|em)([^>]*)>/gi, '<span style="font-style: italic;">');
  processedHtml = processedHtml.replace(/<\/(i|em)>/gi, '</span>');

  // 밑줄 처리 - 링크가 있는지 확인 후 처리
  processedHtml = processedHtml.replace(/<u([^>]*)>(.*?)<\/u>/gi, (match, attributes, content) => {
    // 내용에 링크가 포함되어 있는지 확인
    if (content.includes('<a ') || content.includes('<a>')) {
      // 링크가 있는 경우, u 태그는 제거하고 내용만 유지 (링크 자체에 밑줄이 있음)
      return content;
    } else {
      // 링크가 없는 경우 span으로 변환
      return `<span style="text-decoration: underline;">${content}</span>`;
    }
  });

  // 줄바꿈 처리 (br 태그 강화)
  processedHtml = processedHtml.replace(/<br\s*\/?>/gi, '<br style="line-height: 1.6;">');

  // 단락 처리 (p 태그에 기본 스타일 추가)
  processedHtml = processedHtml.replace(/<p([^>]*)>/gi, '<p style="margin: 0 0 16px 0; line-height: 1.6;">');

  // 헤딩 태그들을 메일침프 친화적 스타일로 변환
  processedHtml = processedHtml.replace(/<h1([^>]*)>/gi, '<h1 style="font-size: 24px; font-weight: bold; margin: 20px 0 16px 0; line-height: 1.3;">');
  processedHtml = processedHtml.replace(/<h2([^>]*)>/gi, '<h2 style="font-size: 20px; font-weight: bold; margin: 18px 0 14px 0; line-height: 1.3;">');
  processedHtml = processedHtml.replace(/<h3([^>]*)>/gi, '<h3 style="font-size: 18px; font-weight: bold; margin: 16px 0 12px 0; line-height: 1.3;">');

  // 리스트 처리
  processedHtml = processedHtml.replace(/<ul([^>]*)>/gi, '<ul style="margin: 16px 0; padding-left: 20px;">');
  processedHtml = processedHtml.replace(/<ol([^>]*)>/gi, '<ol style="margin: 16px 0; padding-left: 20px;">');
  processedHtml = processedHtml.replace(/<li([^>]*)>/gi, '<li style="margin: 8px 0; line-height: 1.6;">');

  return processedHtml;
}

export function convertCTAToButton(html: string): string {
  let processedHtml = html;
  
  // <CTA>텍스트</CTA> 형식이나 <CTA>텍스트 패턴을 찾아서 버튼으로 변환
  processedHtml = processedHtml.replace(/<CTA>([^<]+)(?:<\/CTA>)?/gi, (match, buttonText) => {
    const cleanText = buttonText.trim();
    return createMailchimpButton(cleanText, '#');
  });
  
  // CTA: 텍스트 형식도 감지
  processedHtml = processedHtml.replace(/CTA:\s*([^\n\r<]+)/gi, (match, buttonText) => {
    const cleanText = buttonText.trim();
    return createMailchimpButton(cleanText, '#');
  });

  return processedHtml;
}

export function createMailchimpButton(text: string, url: string = '#'): string {
  return `
<table cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">
  <tr>
    <td style="padding: 0; background-color: #007cba; border-radius: 6px;">
      <a href="${url}" style="
        display: block;
        padding: 12px 24px;
        background-color: #007cba !important;
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
</table>`.trim();
}

export function extractLinksFromComments(html: string): { [key: string]: string } {
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
    /([^:\n\r]+):\s*(https?:\/\/[^\s\n\r]+)/gi
  ];
  
  commentPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (match[2]) {
        // 두 그룹이 있는 경우 (텍스트, URL)
        const key = match[1].trim().replace(/[<>]/g, '');
        const url = match[2].trim();
        if (key && url) {
          links[key] = url;
        }
      } else if (match[1] && match[1].includes('http')) {
        // 한 그룹에 URL이 포함된 경우
        const urlMatch = match[1].match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          const key = match[1].replace(urlMatch[0], '').trim().replace(/[:\-,<>]/g, '').trim();
          if (key) {
            links[key] = urlMatch[0];
          }
        }
      }
    }
  });
  
  return links;
}

export function enhancedCTAConversion(html: string, commentLinks: { [key: string]: string }): string {
  let processedHtml = html;
  
  // CTA 패턴들을 순서대로 처리
  const ctaPatterns = [
    // <CTA>텍스트</CTA>
    /<CTA>([^<]+)<\/CTA>/gi,
    // <CTA>텍스트 (닫는 태그 없음)
    /<CTA>([^<\n\r]+)/gi,
    // CTA: 텍스트
    /CTA:\s*([^\n\r<]+)/gi,
    // CTA 텍스트 (콜론 없음)
    /CTA\s+([^\n\r<]+)/gi
  ];
  
  ctaPatterns.forEach(pattern => {
    processedHtml = processedHtml.replace(pattern, (match, buttonText) => {
      const cleanText = buttonText.trim();
      
      // 코멘트 링크에서 매칭되는 링크 찾기
      let buttonUrl = '#';
      const textLower = cleanText.toLowerCase();
      
      // 정확한 매칭 먼저 시도
      Object.keys(commentLinks).forEach(key => {
        const keyLower = key.toLowerCase();
        if (textLower === keyLower || 
            textLower.includes(keyLower) || 
            keyLower.includes(textLower)) {
          buttonUrl = commentLinks[key];
        }
      });
      
      return createMailchimpButton(cleanText, buttonUrl);
    });
  });
  
  return processedHtml;
}