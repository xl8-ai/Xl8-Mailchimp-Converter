"use client";

import React, { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { SimpleDocumentElement, SimpleDocument } from "../utils/simpleParser";
import { HtmlGenerator } from "../utils/htmlGenerator";
import {
  Eye,
  Code,
  Download,
  Copy,
  ExternalLink,
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  Square,
  List,
  Hash,
  Type,
  Palette,
} from "lucide-react";

interface VisualEditorProps {
  document: SimpleDocument;
  onDocumentChange: (document: SimpleDocument) => void;
  className?: string;
}

export default function VisualEditor({
  document,
  onDocumentChange,
  className = "",
}: VisualEditorProps) {
  const [mode, setMode] = useState<"visual" | "code" | "preview">("visual");
  const [markdownContent, setMarkdownContent] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [showFormatPanel, setShowFormatPanel] = useState(false);

  const htmlGenerator = new HtmlGenerator();

  // 문서를 마크다운으로 변환
  const documentToMarkdown = (doc: SimpleDocument): string => {
    return doc.elements
      .map((element) => {
        switch (element.type) {
          case "heading":
            const hashes = "#".repeat(element.level || 1);
            return `${hashes} ${element.content}`;

          case "paragraph":
            let text = element.content;
            if (element.formatting?.bold) text = `**${text}**`;
            if (element.formatting?.italic) text = `*${text}*`;
            if (element.url) text = `[${text}](${element.url})`;
            return text;

          case "list":
            const prefix = element.listType === "ordered" ? "1." : "-";
            return `${prefix} ${element.content}`;

          case "image":
            return `![${element.alt || "이미지"}](${element.url})`;

          case "cta":
            return `[CTA: ${element.ctaText}](${element.ctaUrl})`;

          case "space":
            return "\n---\n";

          default:
            return element.content;
        }
      })
      .join("\n\n");
  };

  // 마크다운을 문서로 변환
  const markdownToDocument = (markdown: string): SimpleDocument => {
    const lines = markdown.split("\n");
    const elements: SimpleDocumentElement[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 헤딩
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        elements.push({
          type: "heading",
          content: headingMatch[2],
          level: headingMatch[1].length,
        });
        continue;
      }

      // 리스트
      const listMatch =
        trimmed.match(/^[-*+]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/);
      if (listMatch) {
        elements.push({
          type: "list",
          content: listMatch[1],
          listType: trimmed.match(/^\d+\./) ? "ordered" : "unordered",
        });
        continue;
      }

      // 이미지
      const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        elements.push({
          type: "image",
          content: imageMatch[1],
          url: imageMatch[2],
          alt: imageMatch[1],
        });
        continue;
      }

      // CTA
      const ctaMatch = trimmed.match(/^\[CTA:\s*([^\]]+)\]\(([^)]+)\)$/);
      if (ctaMatch) {
        elements.push({
          type: "cta",
          content: ctaMatch[1],
          ctaText: ctaMatch[1],
          ctaUrl: ctaMatch[2],
        });
        continue;
      }

      // 구분선 (space)
      if (trimmed === "---") {
        elements.push({
          type: "space",
          content: "",
        });
        continue;
      }

      // 일반 단락
      let content = trimmed;
      const formatting: SimpleDocumentElement["formatting"] = {};
      let url: string | undefined;

      // 볼드 처리
      const boldMatch = content.match(/\*\*([^*]+)\*\*/);
      if (boldMatch) {
        formatting.bold = true;
        content = content.replace(/\*\*([^*]+)\*\*/g, "$1");
      }

      // 이탤릭 처리
      const italicMatch = content.match(/\*([^*]+)\*/);
      if (italicMatch) {
        formatting.italic = true;
        content = content.replace(/\*([^*]+)\*/g, "$1");
      }

      // 링크 처리
      const linkMatch = content.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        content = linkMatch[1];
        url = linkMatch[2];
      }

      elements.push({
        type: "paragraph",
        content,
        formatting: Object.keys(formatting).length > 0 ? formatting : undefined,
        url,
      });
    }

    return {
      ...document,
      elements,
    };
  };

  // 문서가 변경될 때 마크다운과 HTML 업데이트
  useEffect(() => {
    const markdown = documentToMarkdown(document);
    setMarkdownContent(markdown);

    const html = htmlGenerator.generateHtml(document);
    setHtmlContent(html);
  }, [document]);

  // 마크다운 변경 처리
  const handleMarkdownChange = (value: string) => {
    setMarkdownContent(value);
    const newDocument = markdownToDocument(value);
    onDocumentChange(newDocument);
  };

  // 요소 추가
  const addElement = (type: SimpleDocumentElement["type"]) => {
    const newElement: SimpleDocumentElement = {
      type,
      content: type === "space" ? "" : `새로운 ${type}`,
      ...(type === "heading" && { level: 2 }),
      ...(type === "cta" && { ctaText: "버튼 텍스트", ctaUrl: "#" }),
    };

    const newDocument = {
      ...document,
      elements: [...document.elements, newElement],
    };

    onDocumentChange(newDocument);
  };

  // 요소 삭제
  const deleteElement = (index: number) => {
    const newDocument = {
      ...document,
      elements: document.elements.filter((_, i) => i !== index),
    };
    onDocumentChange(newDocument);
  };

  // 요소 편집
  const editElement = (
    index: number,
    updates: Partial<SimpleDocumentElement>
  ) => {
    const newDocument = {
      ...document,
      elements: document.elements.map((el, i) =>
        i === index ? { ...el, ...updates } : el
      ),
    };
    onDocumentChange(newDocument);
  };

  // HTML 복사
  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      alert("HTML이 클립보드에 복사되었습니다!");
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  // HTML 다운로드
  const downloadHtml = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mailchimp-template.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* 툴바 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">문서 편집기</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("visual")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                mode === "visual"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Eye className="w-4 h-4 inline mr-1" />
              시각적
            </button>
            <button
              onClick={() => setMode("code")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                mode === "code"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Code className="w-4 h-4 inline mr-1" />
              마크다운
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                mode === "preview"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Eye className="w-4 h-4 inline mr-1" />
              미리보기
            </button>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyHtml}
            className="px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 text-sm flex items-center gap-1"
          >
            <Copy className="w-4 h-4" />
            HTML 복사
          </button>
          <button
            onClick={downloadHtml}
            className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            다운로드
          </button>
          <button
            onClick={() =>
              window.open(
                "https://us11.admin.mailchimp.com/templates/create-template/",
                "_blank"
              )
            }
            className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 text-sm flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            Mailchimp
          </button>
        </div>
      </div>

      {/* 편집 영역 */}
      <div className="p-4">
        {mode === "visual" && (
          <div className="space-y-4">
            {/* 요소 추가 툴바 */}
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md">
              <button
                onClick={() => addElement("heading")}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center gap-1"
              >
                <Hash className="w-4 h-4" />
                제목
              </button>
              <button
                onClick={() => addElement("paragraph")}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center gap-1"
              >
                <Type className="w-4 h-4" />
                단락
              </button>
              <button
                onClick={() => addElement("list")}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center gap-1"
              >
                <List className="w-4 h-4" />
                리스트
              </button>
              <button
                onClick={() => addElement("cta")}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center gap-1"
              >
                <Square className="w-4 h-4" />
                CTA 버튼
              </button>
              <button
                onClick={() => addElement("image")}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center gap-1"
              >
                <Image className="w-4 h-4" />
                이미지
              </button>
              <button
                onClick={() => addElement("space")}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                여백
              </button>
            </div>

            {/* 요소 목록 */}
            <div className="space-y-2">
              {document.elements.map((element, index) => (
                <div
                  key={index}
                  className={`border rounded-md p-3 ${
                    selectedElement === index
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                  onClick={() => setSelectedElement(index)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {element.type === "cta" ? "CTA 버튼" : element.type}
                      {element.type === "heading" && ` (H${element.level})`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(index);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      삭제
                    </button>
                  </div>

                  {element.type === "space" ? (
                    <div className="text-gray-400 text-sm">여백</div>
                  ) : (
                    <input
                      type="text"
                      value={element.content}
                      onChange={(e) =>
                        editElement(index, { content: e.target.value })
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  {element.type === "cta" && (
                    <input
                      type="url"
                      value={element.ctaUrl || ""}
                      onChange={(e) =>
                        editElement(index, { ctaUrl: e.target.value })
                      }
                      placeholder="버튼 링크 URL"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  {element.url && element.type !== "cta" && (
                    <input
                      type="url"
                      value={element.url}
                      onChange={(e) =>
                        editElement(index, { url: e.target.value })
                      }
                      placeholder="링크 URL"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "code" && (
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <CodeMirror
              value={markdownContent}
              height="500px"
              extensions={[markdown()]}
              onChange={handleMarkdownChange}
              theme={oneDark}
            />
          </div>
        )}

        {mode === "preview" && (
          <div className="border border-gray-300 rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        )}
      </div>
    </div>
  );
}
