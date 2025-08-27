import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "이미지 URL이 필요합니다." },
        { status: 400 }
      );
    }

    console.log("🖼️ 이미지 프록시 요청:", imageUrl);

    // Google 이미지 URL 최적화
    let optimizedUrl = imageUrl;
    if (imageUrl.includes("googleusercontent.com")) {
      // 기존 크기 파라미터 제거
      optimizedUrl = imageUrl.replace(/[&?]w=\d+/g, "");
      optimizedUrl = optimizedUrl.replace(/[&?]h=\d+/g, "");

      // 새로운 크기 파라미터 추가
      const separator = optimizedUrl.includes("?") ? "&" : "?";
      optimizedUrl += `${separator}w=800&h=600`;
    }

    // 이미지 가져오기
    const imageResponse = await fetch(optimizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
    });

    if (!imageResponse.ok) {
      console.error(
        "이미지 가져오기 실패:",
        imageResponse.status,
        imageResponse.statusText
      );
      return NextResponse.json(
        { error: "이미지를 가져올 수 없습니다." },
        { status: imageResponse.status }
      );
    }

    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await imageResponse.arrayBuffer();

    console.log("✅ 이미지 프록시 성공:", {
      contentType,
      size: imageBuffer.byteLength,
    });

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // 24시간 캐시
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("이미지 프록시 오류:", error);
    return NextResponse.json(
      { error: "이미지 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
