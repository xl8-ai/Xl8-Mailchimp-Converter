"use client";

import { useState } from "react";
import { SimpleDocument } from "./utils/simpleParser";
import BlockEditor from "./components/BlockEditor";
import { FileText, Sparkles, Zap, Shield, Globe, Bold } from "lucide-react";

export default function Home() {
  const [googleDocsUrl, setGoogleDocsUrl] = useState("");
  const [document, setDocument] = useState<SimpleDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<"ko" | "en">("ko");
  const [step, setStep] = useState<"input" | "editing">("input");

  // 다국어 메시지
  const messages = {
    ko: {
      title: "구글 독스 → 메일침프 HTML 변환기",
      subtitle: "AI 기반 스마트 변환 & 시각적 편집기",
      description:
        "구글 독스의 모든 포맷팅을 완벽하게 보존하고, 개발 지식 없이도 쉽게 편집할 수 있습니다.",
      urlLabel: "구글 독스 URL",
      urlPlaceholder: "https://docs.google.com/document/d/...",
      parseButton: "문서 분석하기",
      parsing: "문서 분석 중...",
      enterUrl: "구글 독스 URL을 입력해주세요.",
      parseError: "문서 분석 중 오류가 발생했습니다.",
      languageSwitch: "English",
      features: {
        title: "새로워진 기능들",
        formatting: {
          title: "완벽한 포맷팅 보존",
          description:
            "볼드, 이탤릭, 글자 크기, 색상 등 모든 스타일을 정확히 보존합니다.",
        },
        editor: {
          title: "노션 스타일 블록 편집기",
          description:
            "블록 단위로 쉽게 편집하고 실시간으로 미리보기할 수 있습니다.",
        },
        cta: {
          title: "스마트 CTA 버튼",
          description:
            "[cta] 태그로 간단하게 버튼을 만들고 자동으로 링크를 연결합니다.",
        },
        images: {
          title: "이미지 링크 지원",
          description:
            "이미지에 클릭 가능한 링크를 추가하여 더 인터랙티브한 이메일을 만듭니다.",
        },
      },
      backToInput: "새 문서 변환하기",
    },
    en: {
      title: "Google Docs → Mailchimp HTML Converter",
      subtitle: "AI-Powered Smart Conversion & Visual Editor",
      description:
        "Perfectly preserve all Google Docs formatting and easily edit without coding knowledge.",
      urlLabel: "Google Docs URL",
      urlPlaceholder: "https://docs.google.com/document/d/...",
      parseButton: "Parse Document",
      parsing: "Parsing document...",
      enterUrl: "Please enter a Google Docs URL.",
      parseError: "An error occurred while parsing the document.",
      languageSwitch: "한국어",
      features: {
        title: "New Features",
        formatting: {
          title: "Perfect Formatting Preservation",
          description:
            "Accurately preserve all styles including bold, italic, font size, and colors.",
        },
        editor: {
          title: "Notion-style Block Editor",
          description:
            "Edit easily with block-based interface and real-time preview.",
        },
        cta: {
          title: "Smart CTA Buttons",
          description:
            "Create buttons simply with [cta] tags and automatically connect links.",
        },
        images: {
          title: "Image Link Support",
          description:
            "Add clickable links to images for more interactive emails.",
        },
      },
      backToInput: "Convert New Document",
    },
  };

  const t = messages[language];

  const handleParseDocument = async () => {
    if (!googleDocsUrl) {
      setError(t.enterUrl);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/parse-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ googleDocsUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "문서 파싱에 실패했습니다.");
      }

      const data = await response.json();
      setDocument(data.document);
      setStep("editing");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.parseError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentChange = (newDocument: SimpleDocument) => {
    setDocument(newDocument);
  };

  const handleBackToInput = () => {
    setStep("input");
    setDocument(null);
    setGoogleDocsUrl("");
    setError("");
  };

  const toggleLanguage = () => {
    setLanguage(language === "ko" ? "en" : "ko");
  };

  if (step === "editing" && document) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {document.title}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {document.elements.length}개 요소
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleLanguage}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm"
                >
                  <Globe className="w-4 h-4 inline mr-1" />
                  {t.languageSwitch}
                </button>
                <button
                  onClick={handleBackToInput}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  {t.backToInput}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 편집기 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <BlockEditor
            document={document}
            onDocumentChange={handleDocumentChange}
            className="w-full"
            language={language}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="flex justify-end mb-6">
            <button
              onClick={toggleLanguage}
              className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 py-2 px-4 rounded-full transition-all shadow-sm border border-gray-200"
            >
              <Globe className="w-4 h-4 inline mr-2" />
              {t.languageSwitch}
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <Sparkles className="w-6 h-6 text-purple-500" />
            <div className="p-3 bg-purple-100 rounded-full">
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h1>
          <p className="text-xl text-blue-600 font-medium mb-4">{t.subtitle}</p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.description}
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-12 border border-gray-200">
          <div className="mb-6">
            <label
              htmlFor="url"
              className="block text-lg font-semibold text-gray-800 mb-3"
            >
              {t.urlLabel}
            </label>
            <div className="relative">
              <input
                type="url"
                id="url"
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder={t.urlPlaceholder}
                value={googleDocsUrl}
                onChange={(e) => setGoogleDocsUrl(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          <button
            onClick={handleParseDocument}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg font-semibold shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t.parsing}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                {t.parseButton}
              </div>
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                {error}
              </div>
            </div>
          )}
        </div>

        {/* 기능 소개 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Bold className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t.features.formatting.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {t.features.formatting.description}
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t.features.editor.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {t.features.editor.description}
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t.features.cta.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {t.features.cta.description}
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t.features.images.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {t.features.images.description}
            </p>
          </div>
        </div>

        {/* 사용법 안내 */}
        <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {language === "ko" ? "사용법 가이드" : "Usage Guide"}
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {language === "ko" ? "문서 준비" : "Prepare Document"}
              </h3>
              <p className="text-gray-600 text-sm">
                {language === "ko"
                  ? "Google Docs에서 [cta], [space], [img-link] 태그를 사용해 문서를 작성하세요."
                  : "Create your document in Google Docs using [cta], [space], [img-link] tags."}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {language === "ko" ? "URL 입력" : "Enter URL"}
              </h3>
              <p className="text-gray-600 text-sm">
                {language === "ko"
                  ? "문서를 '링크가 있는 모든 사용자'로 공유하고 URL을 입력하세요."
                  : "Share your document with 'Anyone with the link' and enter the URL."}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {language === "ko" ? "편집 & 내보내기" : "Edit & Export"}
              </h3>
              <p className="text-gray-600 text-sm">
                {language === "ko"
                  ? "노션 스타일 블록 편집기에서 내용을 수정하고 HTML을 Mailchimp에서 사용하세요."
                  : "Edit content in the Notion-style block editor and use the HTML in Mailchimp."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
