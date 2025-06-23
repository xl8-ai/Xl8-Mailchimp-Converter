import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { preserveStylesForMailchimp, convertGoogleImagesToBase64, enhancedCTAConversion, extractLinksFromComments, createMailchimpButton } from '@/app/utils/converter';

export async function POST(request: NextRequest) {
  try {
    const { htmlUrl } = await request.json();

    if (!htmlUrl) {
      return NextResponse.json(
        { error: 'HTML URL이 필요합니다.' },
        { status: 400 }
      );
    }

    const response = await fetch(htmlUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: '구글 독스에서 HTML을 가져올 수 없습니다. 문서가 공개되었는지 확인해주세요.' },
        { status: 400 }
      );
    }

    const html = await response.text();
    
    // 코멘트에서 링크를 추출
    const commentLinks = extractLinksFromComments(html);
    
    const $ = cheerio.load(html);
    
    // 불필요한 태그만 제거 (스타일은 보존)
    $('script').remove();
    $('meta').remove();
    $('title').remove();
    
    // 위험한 속성만 제거 (style은 보존)
    $('*').each((_, elem) => {
      $(elem).removeAttr('class');
      $(elem).removeAttr('id');
      $(elem).removeAttr('onclick');
      $(elem).removeAttr('onload');
      $(elem).removeAttr('onerror');
    });
    
    // 하이퍼링크 보존 및 스타일 적용
    $('a').each((_, elem) => {
      const $elem = $(elem);
      const href = $elem.attr('href');
      const existingStyle = $elem.attr('style') || '';
      
      // 구글 독스 리다이렉트 URL을 실제 URL로 변환
      if (href && href.includes('www.google.com/url')) {
        try {
          const urlParams = new URL(href).searchParams;
          const actualUrl = urlParams.get('q') || href;
          $elem.attr('href', actualUrl);
        } catch {
          // URL 파싱 실패 시 원본 유지
        }
      }
      
      // 링크 스타일 적용
      $elem.attr('style', `${existingStyle}; color: #1a73e8; text-decoration: underline;`.replace(/^;\s*/, ''));
      $elem.attr('target', '_blank');
    });

    // 굵은 글씨와 이탤릭을 인라인 스타일로 변환
    $('b, strong').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; font-weight: bold;`.replace(/^;\s*/, ''));
      $elem.get(0).tagName = 'span';
    });
    
    $('i, em').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; font-style: italic;`.replace(/^;\s*/, ''));
      $elem.get(0).tagName = 'span';
    });
    
    // 밑줄 처리 - 링크가 아닌 경우에만 span으로 변환
    $('u').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      
      // 부모나 자식에 링크가 있는지 확인
      const hasLink = $elem.find('a').length > 0 || $elem.parents('a').length > 0;
      
      if (!hasLink) {
        $elem.attr('style', `${existingStyle}; text-decoration: underline;`.replace(/^;\s*/, ''));
        $elem.get(0).tagName = 'span';
      } else {
        // 링크가 있는 경우 밑줄 스타일만 추가
        $elem.attr('style', `${existingStyle}; text-decoration: underline;`.replace(/^;\s*/, ''));
      }
    });
    
    // 단락과 헤딩에 메일침프 친화적 스타일 추가
    $('p').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; margin: 0 0 16px 0; line-height: 1.6;`.replace(/^;\s*/, ''));
    });
    
    $('h1').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; font-size: 24px; font-weight: bold; margin: 20px 0 16px 0; line-height: 1.3;`.replace(/^;\s*/, ''));
    });
    
    $('h2').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; font-size: 20px; font-weight: bold; margin: 18px 0 14px 0; line-height: 1.3;`.replace(/^;\s*/, ''));
    });
    
    $('h3').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; font-size: 18px; font-weight: bold; margin: 16px 0 12px 0; line-height: 1.3;`.replace(/^;\s*/, ''));
    });
    
    // 리스트 스타일링
    $('ul').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; margin: 16px 0; padding-left: 20px;`.replace(/^;\s*/, ''));
    });
    
    $('ol').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; margin: 16px 0; padding-left: 20px;`.replace(/^;\s*/, ''));
    });
    
    $('li').each((_, elem) => {
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; margin: 8px 0; line-height: 1.6;`.replace(/^;\s*/, ''));
    });
    
    // 이미지는 기본 처리만 (원본 유지)
    $('img').each((_, elem) => {
      const src = $(elem).attr('src');
      if (src && src.startsWith('//')) {
        $(elem).attr('src', 'https:' + src);
      }
      // 이미지에도 기본 스타일 추가 (메일 호환성)
      const $elem = $(elem);
      const existingStyle = $elem.attr('style') || '';
      $elem.attr('style', `${existingStyle}; max-width: 100%; height: auto; display: block;`.replace(/^;\s*/, ''));
    });
    
    // CTA 텍스트를 찾아서 버튼으로 변환
    $('p, div, span').each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text();
      
      // CTA로 시작하는 텍스트 찾기
      if (text.trim().startsWith('CTA') || text.includes('<CTA>')) {
        const ctaMatch = text.match(/CTA[:\s]*([^\n\r]+)/i);
        if (ctaMatch) {
          const buttonText = ctaMatch[1].trim();
          
          // 코멘트 링크에서 해당 버튼 텍스트와 매칭되는 링크 찾기
          let buttonUrl = '#';
          Object.keys(commentLinks).forEach(key => {
            if (buttonText.toLowerCase().includes(key.toLowerCase()) || 
                key.toLowerCase().includes(buttonText.toLowerCase())) {
              buttonUrl = commentLinks[key];
            }
          });
          
          const buttonHtml = createMailchimpButton(buttonText, buttonUrl);
          $elem.replaceWith(buttonHtml);
        }
      }
    });

    let bodyContent = $('body').html() || '';
    
    if (!bodyContent) {
      bodyContent = $.html();
    }
    
    // CTA 변환을 개선된 함수로 처리
    let processedHtml = enhancedCTAConversion(bodyContent, commentLinks);
    
    // 기본 이미지 처리만 적용
    const finalHtml = convertGoogleImagesToBase64(processedHtml);
    
    const mailchimpFriendlyHtml = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  ${finalHtml}
</div>
    `.trim();

    return NextResponse.json({ 
      html: mailchimpFriendlyHtml,
      success: true 
    });

  } catch (error) {
    console.error('변환 오류:', error);
    return NextResponse.json(
      { error: '변환 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}