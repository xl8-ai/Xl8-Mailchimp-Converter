import { NextRequest, NextResponse } from "next/server";
import { HtmlGenerator } from "@/app/utils/htmlGenerator";
import { SimpleDocument } from "@/app/utils/simpleParser";

export async function POST(request: NextRequest) {
  try {
    const { document, options = {} } = await request.json();

    if (!document) {
      return NextResponse.json(
        { error: "문서 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    console.log("🔄 HTML 생성 시작:", {
      title: document.title,
      elementsCount: document.elements?.length || 0,
    });

    // HTML 생성기 초기화
    const htmlGenerator = new HtmlGenerator(options);

    // HTML 생성
    const html = htmlGenerator.generateHtml(document as SimpleDocument);

    console.log("✅ HTML 생성 완료:", {
      htmlLength: html.length,
      hasElements: document.elements?.length > 0,
    });

    // 생성된 HTML의 주요 특징 분석
    const htmlStats = {
      headings: (html.match(/<h[1-6]/g) || []).length,
      paragraphs: (html.match(/<p/g) || []).length,
      images: (html.match(/<img/g) || []).length,
      ctaButtons: (html.match(/background-color:\s*#ff6b35/g) || []).length,
      links: (html.match(/<a\s+href/g) || []).length,
      boldText: (html.match(/font-weight:\s*bold/g) || []).length,
    };

    console.log("📊 HTML 통계:", htmlStats);

    return NextResponse.json({
      html,
      stats: htmlStats,
      success: true,
    });
  } catch (error) {
    console.error("❌ HTML 생성 오류:", error);

    let errorMessage = "HTML 생성 중 오류가 발생했습니다.";

    if (error instanceof Error) {
      if (error.message.includes("document")) {
        errorMessage = "문서 데이터가 올바르지 않습니다.";
      } else if (error.message.includes("elements")) {
        errorMessage = "문서 요소를 처리할 수 없습니다.";
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
