import { NextRequest, NextResponse } from "next/server";
import { parseGoogleDocsDocument } from "@/app/utils/simpleParser";

export async function POST(request: NextRequest) {
  try {
    const { googleDocsUrl } = await request.json();

    if (!googleDocsUrl) {
      return NextResponse.json(
        { error: "Google Docs URL이 필요합니다." },
        { status: 400 }
      );
    }

    // URL 유효성 검사
    if (!googleDocsUrl.includes("docs.google.com/document")) {
      return NextResponse.json(
        { error: "유효한 Google Docs URL이 아닙니다." },
        { status: 400 }
      );
    }

    console.log("📄 문서 파싱 시작:", googleDocsUrl);

    try {
      // Google Docs 문서 파싱
      const parsedDocument = await parseGoogleDocsDocument(googleDocsUrl);

      console.log("✅ 문서 파싱 완료:", {
        title: parsedDocument.title,
        elementsCount: parsedDocument.elements.length,
        elementTypes: parsedDocument.elements.reduce((acc, el) => {
          acc[el.type] = (acc[el.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      });

      // 파싱된 요소들의 상세 정보 로깅
      parsedDocument.elements.forEach((element, index) => {
        console.log(`📝 요소 ${index + 1}:`, {
          type: element.type,
          content:
            element.content.substring(0, 50) +
            (element.content.length > 50 ? "..." : ""),
          formatting: element.formatting,
          level: element.level,
          url: element.url,
        });
      });

      return NextResponse.json({
        document: parsedDocument,
        success: true,
      });
    } catch (innerError) {
      console.error("❌ 내부 파싱 오류:", innerError);
      throw innerError;
    }
  } catch (error) {
    console.error("❌ 문서 파싱 오류:", error);

    let errorMessage = "문서 파싱 중 오류가 발생했습니다.";

    if (error instanceof Error) {
      if (error.message.includes("유효하지 않은")) {
        errorMessage = error.message;
      } else if (error.message.includes("공개되었는지")) {
        errorMessage =
          "문서에 접근할 수 없습니다. 문서가 '링크가 있는 모든 사용자'로 공유되었는지 확인해주세요.";
      } else if (error.message.includes("fetch")) {
        errorMessage =
          "문서를 가져올 수 없습니다. 네트워크 연결을 확인해주세요.";
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
