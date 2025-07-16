"use client";

import { useState } from "react";
import { convertGoogleDocsToHtml } from "./utils/converter";

export default function Home() {
  const [googleDocsUrl, setGoogleDocsUrl] = useState("");
  const [htmlOutput, setHtmlOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<"ko" | "en">("ko");

  // 다국어 메시지
  const messages = {
    ko: {
      title: "구글 독스 → 메일침프 HTML 변환기",
      description:
        "구글 독스 URL을 입력하면 메일침프에서 사용할 수 있는 HTML로 변환해드립니다.",
      urlLabel: "구글 독스 URL",
      urlPlaceholder: "https://docs.google.com/document/d/...",
      convertButton: "HTML로 변환",
      converting: "변환 중...",
      convertedHtml: "변환된 HTML",
      preview: "미리보기",
      htmlCode: "HTML 코드",
      copyToClipboard: "클립보드에 복사",
      downloadHtml: "HTML 다운로드",
      goToMailchimp: "메일침프로 이동",
      copiedSuccess: "HTML이 클립보드에 복사되었습니다!",
      enterUrl: "구글 독스 URL을 입력해주세요.",
      conversionError: "변환 중 오류가 발생했습니다. URL을 확인해주세요.",
      languageSwitch: "English",
    },
    en: {
      title: "Google Docs → Mailchimp HTML Converter",
      description:
        "Convert Google Docs URL to HTML that can be used in Mailchimp.",
      urlLabel: "Google Docs URL",
      urlPlaceholder: "https://docs.google.com/document/d/...",
      convertButton: "Convert to HTML",
      converting: "Converting...",
      convertedHtml: "Converted HTML",
      preview: "Preview",
      htmlCode: "HTML Code",
      copyToClipboard: "Copy to Clipboard",
      downloadHtml: "Download HTML",
      goToMailchimp: "Go to Mailchimp",
      copiedSuccess: "HTML copied to clipboard!",
      enterUrl: "Please enter a Google Docs URL.",
      conversionError:
        "An error occurred during conversion. Please check the URL.",
      languageSwitch: "한국어",
    },
  };

  const t = messages[language];

  const handleConvert = async () => {
    if (!googleDocsUrl) {
      setError(t.enterUrl);
      return;
    }

    setLoading(true);
    setError("");
    setHtmlOutput("");

    try {
      const html = await convertGoogleDocsToHtml(googleDocsUrl);
      setHtmlOutput(html);
    } catch (err) {
      setError(t.conversionError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(htmlOutput);
      alert(t.copiedSuccess);
    } catch (err) {
      console.error("클립보드 복사 실패:", err);
    }
  };

  const downloadHtml = () => {
    const blob = new Blob([htmlOutput], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mailchimp-template.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const goToMailchimp = () => {
    window.open(
      "https://us11.admin.mailchimp.com/templates/create-template/",
      "_blank"
    );
  };

  const toggleLanguage = () => {
    setLanguage(language === "ko" ? "en" : "ko");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 언어 전환 버튼 */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleLanguage}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md transition-colors"
          >
            {t.languageSwitch}
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t.title}</h1>
          <p className="text-lg text-gray-600">{t.description}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t.urlLabel}
            </label>
            <input
              type="url"
              id="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t.urlPlaceholder}
              value={googleDocsUrl}
              onChange={(e) => setGoogleDocsUrl(e.target.value)}
            />
          </div>

          {/* 사용법 안내 */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              {language === "ko"
                ? "💡 CTA 버튼 만들기"
                : "💡 Creating CTA Buttons"}
            </h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>
                {language === "ko"
                  ? "구글 독스에서 다음과 같이 입력하면 주황색 버튼이 생성됩니다:"
                  : "Type the following in Google Docs to create orange buttons:"}
              </p>
              <code className="bg-blue-100 px-2 py-1 rounded text-xs block">
                [cta] {language === "ko" ? "버튼 텍스트" : "Button Text"}
              </code>

              <div className="text-xs space-y-1 mt-2">
                <p className="font-medium">
                  {language === "ko"
                    ? "📎 링크 연결 방법:"
                    : "📎 Link Connection Methods:"}
                </p>
                <p>
                  {language === "ko"
                    ? "1. 텍스트를 선택하고 하이퍼링크 추가 (가장 권장)"
                    : "1. Select text and add hyperlink (most recommended)"}
                </p>
                <p>
                  {language === "ko"
                    ? "2. 텍스트 뒤에 URL 직접 입력"
                    : "2. Type URL directly after text"}
                </p>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs block">
                  [cta] {language === "ko" ? "구매하기" : "Buy Now"}{" "}
                  https://example.com
                </code>
                <p>
                  {language === "ko"
                    ? "3. 마크다운 스타일 링크"
                    : "3. Markdown style link"}
                </p>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs block">
                  [cta] [{language === "ko" ? "구매하기" : "Buy Now"}]
                  (https://example.com)
                </code>
                <p className="text-xs text-blue-600 mt-2">
                  {language === "ko"
                    ? "💡 구글 독스의 폰트 크기와 스타일도 자동으로 보존됩니다!"
                    : "💡 Google Docs font size and styles are automatically preserved!"}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {language === "ko"
                    ? "✅ 일반 텍스트, 제목(H1~H6) 모두에서 사용 가능합니다!"
                    : "✅ Works in regular text and headings (H1~H6)!"}
                </p>
              </div>
            </div>
          </div>

          {/* 여백 추가 기능 안내 */}
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-sm font-medium text-green-900 mb-2">
              {language === "ko" ? "📏 여백 추가하기" : "📏 Adding Spacing"}
            </h3>
            <div className="text-sm text-green-700 space-y-2">
              <p>
                {language === "ko"
                  ? "구글 독스에서 다음과 같이 입력하면 15px 여백이 추가됩니다:"
                  : "Type the following in Google Docs to add 15px spacing:"}
              </p>
              <code className="bg-green-100 px-2 py-1 rounded text-xs block">
                [space]
              </code>
              <p className="text-xs text-green-600 mt-2">
                {language === "ko"
                  ? "💡 섹션 간 구분이나 시각적 여백이 필요할 때 사용하세요!"
                  : "💡 Use this to separate sections or add visual spacing!"}
              </p>
            </div>
          </div>

          <button
            onClick={handleConvert}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? t.converting : t.convertButton}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {htmlOutput && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {t.convertedHtml}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={copyToClipboard}
                  className="bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                  </svg>
                  {t.copyToClipboard}
                </button>
                <button
                  onClick={downloadHtml}
                  className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                  </svg>
                  {t.downloadHtml}
                </button>
                <button
                  onClick={goToMailchimp}
                  className="bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                    <path d="M2 12l3.09 6.26L10 16l-5-4 5-4L5.09 5.74 2 12zm10.91-6.26L10 8l5 4-5 4 2.91 2.26L18 12l-5.09-6.26z" />
                  </svg>
                  {t.goToMailchimp}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t.preview}
              </h3>
              <div
                className="border border-gray-300 rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: htmlOutput }}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t.htmlCode}
              </h3>
              <textarea
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                value={htmlOutput}
                readOnly
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
