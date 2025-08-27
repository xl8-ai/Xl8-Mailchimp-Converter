"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { SimpleDocumentElement, SimpleDocument } from "../utils/simpleParser";
import { HtmlGenerator } from "../utils/htmlGenerator";
import RichTextEditor from "./RichTextEditor";
import {
  Plus,
  GripVertical,
  Type,
  Hash,
  List,
  Image,
  Square,
  Space,
  Trash2,
  Download,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";

interface BlockEditorProps {
  document: SimpleDocument;
  onDocumentChange: (document: SimpleDocument) => void;
  className?: string;
  language?: "ko" | "en";
}

export default function BlockEditor({
  document: docData,
  onDocumentChange,
  className = "",
  language = "ko",
}: BlockEditorProps) {
  // 다국어 메시지
  const messages = {
    ko: {
      preview: "미리보기",
      hidePreview: "미리보기 숨기기",
      showPreview: "미리보기 보기",
      livePreview: "실시간 미리보기",
      copyHtml: "HTML 복사",
      download: "다운로드",
      backToInput: "새 문서 변환하기",
      htmlCopied: "HTML이 클립보드에 복사되었습니다!",
      blockTypes: {
        text: "텍스트",
        heading: "제목",
        list: "목록",
        image: "이미지",
        button: "버튼",
        space: "공백",
      },
      placeholders: {
        heading: "제목을 입력하세요...",
        text: "텍스트를 입력하세요...",
        list: "목록 항목을 입력하세요...",
        buttonText: "버튼 텍스트",
        buttonUrl: "버튼 링크 URL",
        imageUrl: "이미지 URL",
        imageLink: "이미지 클릭 링크 (선택사항)",
      },
    },
    en: {
      preview: "Preview",
      hidePreview: "Hide Preview",
      showPreview: "Show Preview",
      livePreview: "Live Preview",
      copyHtml: "Copy HTML",
      download: "Download",
      backToInput: "Convert New Document",
      htmlCopied: "HTML copied to clipboard!",
      blockTypes: {
        text: "Text",
        heading: "Heading",
        list: "List",
        image: "Image",
        button: "Button",
        space: "Space",
      },
      placeholders: {
        heading: "Enter heading...",
        text: "Enter text...",
        list: "Enter list item...",
        buttonText: "Button text",
        buttonUrl: "Button link URL",
        imageUrl: "Image URL",
        imageLink: "Image click link (optional)",
      },
    },
  };

  const t = messages[language];

  const [htmlContent, setHtmlContent] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 스크롤 동기화를 위한 ref
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const htmlGenerator = useMemo(() => new HtmlGenerator(), []);

  // HTML 업데이트
  useEffect(() => {
    const html = htmlGenerator.generateHtml(docData);
    setHtmlContent(html);
  }, [docData, htmlGenerator]);

  // 스크롤 동기화
  useEffect(() => {
    const editorElement = editorRef.current;
    const previewElement = previewRef.current;

    if (!editorElement || !previewElement || !showPreview) return;

    let isEditorScrolling = false;
    let isPreviewScrolling = false;

    const handleEditorScroll = () => {
      if (isPreviewScrolling) return;

      isEditorScrolling = true;

      const editorScrollHeight =
        editorElement.scrollHeight - editorElement.clientHeight;
      const previewScrollHeight =
        previewElement.scrollHeight - previewElement.clientHeight;

      if (editorScrollHeight > 0 && previewScrollHeight > 0) {
        const scrollPercentage = editorElement.scrollTop / editorScrollHeight;
        const previewScrollTop = scrollPercentage * previewScrollHeight;
        previewElement.scrollTop = previewScrollTop;
      }

      setTimeout(() => {
        isEditorScrolling = false;
      }, 100);
    };

    const handlePreviewScroll = () => {
      if (isEditorScrolling) return;

      isPreviewScrolling = true;

      const editorScrollHeight =
        editorElement.scrollHeight - editorElement.clientHeight;
      const previewScrollHeight =
        previewElement.scrollHeight - previewElement.clientHeight;

      if (editorScrollHeight > 0 && previewScrollHeight > 0) {
        const scrollPercentage = previewElement.scrollTop / previewScrollHeight;
        const editorScrollTop = scrollPercentage * editorScrollHeight;
        editorElement.scrollTop = editorScrollTop;
      }

      setTimeout(() => {
        isPreviewScrolling = false;
      }, 100);
    };

    editorElement.addEventListener("scroll", handleEditorScroll, {
      passive: true,
    });
    previewElement.addEventListener("scroll", handlePreviewScroll, {
      passive: true,
    });

    return () => {
      editorElement.removeEventListener("scroll", handleEditorScroll);
      previewElement.removeEventListener("scroll", handlePreviewScroll);
    };
  }, [showPreview]);

  // 블록 추가
  const addBlock = (type: SimpleDocumentElement["type"], index?: number) => {
    const newBlock: SimpleDocumentElement = {
      type,
      content: type === "space" ? "" : getDefaultContent(type),
      ...(type === "heading" && { level: 2 }),
      ...(type === "cta" && { ctaText: "Button Text", ctaUrl: "#" }),
    };

    const newElements = [...docData.elements];
    const insertIndex = index !== undefined ? index + 1 : newElements.length;
    newElements.splice(insertIndex, 0, newBlock);

    onDocumentChange({
      ...docData,
      elements: newElements,
    });
  };

  // 블록 삭제
  const deleteBlock = (index: number) => {
    const newElements = docData.elements.filter((_, i) => i !== index);
    onDocumentChange({
      ...docData,
      elements: newElements,
    });
  };

  // 블록 업데이트
  const updateBlock = (
    index: number,
    updates: Partial<SimpleDocumentElement>
  ) => {
    const newElements = docData.elements.map((el, i) =>
      i === index ? { ...el, ...updates } : el
    );
    onDocumentChange({
      ...docData,
      elements: newElements,
    });
  };

  // 기본 콘텐츠 생성
  const getDefaultContent = (type: SimpleDocumentElement["type"]): string => {
    switch (type) {
      case "heading":
        return "New Heading";
      case "paragraph":
        return "Enter your text here...";
      case "list":
        return "List item";
      case "image":
        return "Image";
      case "cta":
        return "Button Text";
      default:
        return "";
    }
  };

  // 블록 타입별 아이콘
  const getBlockIcon = (type: SimpleDocumentElement["type"]) => {
    switch (type) {
      case "heading":
        return <Hash className="w-4 h-4" />;
      case "paragraph":
        return <Type className="w-4 h-4" />;
      case "list":
        return <List className="w-4 h-4" />;
      case "image":
        return <Image className="w-4 h-4" />;
      case "cta":
        return <Square className="w-4 h-4" />;
      case "space":
        return <Space className="w-4 h-4" />;
      default:
        return <Type className="w-4 h-4" />;
    }
  };

  // HTML 복사
  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      alert(t.htmlCopied);
    } catch (err) {
      console.error("Copy failed:", err);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {docData.elements.length}{" "}
              {language === "ko" ? "개 블록" : "blocks"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                showPreview
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {showPreview ? (
                <EyeOff className="w-4 h-4 inline mr-1" />
              ) : (
                <Eye className="w-4 h-4 inline mr-1" />
              )}
              {showPreview ? t.hidePreview : t.showPreview}
            </button>
            <button
              onClick={copyHtml}
              className="px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 text-sm flex items-center gap-1"
            >
              <Copy className="w-4 h-4" />
              {t.copyHtml}
            </button>
            <button
              onClick={downloadHtml}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              {t.download}
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
      </div>

      <div className="flex">
        {/* 편집 영역 */}
        <div
          ref={editorRef}
          className={`${
            showPreview ? "w-1/2" : "w-full"
          } p-6 border-r border-gray-200 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100`}
        >
          <div className="space-y-1">
            {docData.elements.map((element, index) => (
              <div key={index}>
                {/* 블록 사이 추가 버튼 */}
                <BlockSeparator
                  onAddBlock={(type) => addBlock(type, index - 1)}
                />

                <BlockItem
                  element={element}
                  isHovered={hoveredIndex === index}
                  onUpdate={(updates) => updateBlock(index, updates)}
                  onDelete={() => deleteBlock(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  getBlockIcon={getBlockIcon}
                  t={t}
                />
              </div>
            ))}

            {/* 마지막 블록 사이 추가 버튼 */}
            <BlockSeparator
              onAddBlock={(type) => addBlock(type)}
              isLast={true}
            />
          </div>
        </div>

        {/* 미리보기 영역 */}
        {showPreview && (
          <div className="w-1/2 p-6 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t.livePreview}
            </h3>
            <div
              ref={previewRef}
              className="bg-white rounded-md p-4 shadow-sm max-h-[calc(100vh-280px)] overflow-y-auto border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// 개별 블록 컴포넌트
interface BlockItemProps {
  element: SimpleDocumentElement;
  isHovered: boolean;
  onUpdate: (updates: Partial<SimpleDocumentElement>) => void;
  onDelete: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  getBlockIcon: (type: SimpleDocumentElement["type"]) => React.ReactNode;
  t: {
    preview: string;
    hidePreview: string;
    showPreview: string;
    livePreview: string;
    copyHtml: string;
    download: string;
    backToInput: string;
    htmlCopied: string;
    blockTypes: {
      text: string;
      heading: string;
      list: string;
      image: string;
      button: string;
      space: string;
    };
    placeholders: {
      heading: string;
      text: string;
      list: string;
      buttonText: string;
      buttonUrl: string;
      imageUrl: string;
      imageLink: string;
    };
  };
}

function BlockItem({
  element,
  isHovered,
  onUpdate,
  onDelete,
  onMouseEnter,
  onMouseLeave,
  getBlockIcon,
  t,
}: BlockItemProps) {
  return (
    <div
      className={`group relative border rounded-lg p-3 transition-all ${
        isHovered
          ? "border-blue-300 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 블록 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-2 text-gray-500">
          <GripVertical className="w-4 h-4 cursor-move" />
          {getBlockIcon(element.type)}

          {/* 블록 타입 변경 드롭다운 */}
          <select
            value={element.type}
            onChange={(e) => {
              const newType = e.target.value as SimpleDocumentElement["type"];
              const updates: Partial<SimpleDocumentElement> = { type: newType };

              // 타입별 기본값 설정
              if (newType === "heading" && !element.level) {
                updates.level = 2;
              } else if (newType === "cta") {
                updates.ctaText = element.content || "Button Text";
                updates.ctaUrl = element.ctaUrl || "#";
              } else if (newType === "space") {
                updates.level = 1;
                updates.content = "";
              }

              onUpdate(updates);
            }}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
          >
            <option value="paragraph">{t.blockTypes.text}</option>
            <option value="heading">{t.blockTypes.heading}</option>
            <option value="list">{t.blockTypes.list}</option>
            <option value="image">{t.blockTypes.image}</option>
            <option value="cta">{t.blockTypes.button}</option>
            <option value="space">{t.blockTypes.space}</option>
          </select>

          {element.type === "heading" && (
            <select
              value={element.level || 2}
              onChange={(e) => onUpdate({ level: parseInt(e.target.value) })}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
              <option value={4}>H4</option>
              <option value={5}>H5</option>
              <option value={6}>H6</option>
            </select>
          )}
        </div>

        {/* 블록 액션 */}
        {isHovered && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 블록 콘텐츠 */}
      <BlockContent element={element} onUpdate={onUpdate} t={t} />
    </div>
  );
}

// 블록 콘텐츠 컴포넌트
interface BlockContentProps {
  element: SimpleDocumentElement;
  onUpdate: (updates: Partial<SimpleDocumentElement>) => void;
  t: {
    preview: string;
    hidePreview: string;
    showPreview: string;
    livePreview: string;
    copyHtml: string;
    download: string;
    backToInput: string;
    htmlCopied: string;
    blockTypes: {
      text: string;
      heading: string;
      list: string;
      image: string;
      button: string;
      space: string;
    };
    placeholders: {
      heading: string;
      text: string;
      list: string;
      buttonText: string;
      buttonUrl: string;
      imageUrl: string;
      imageLink: string;
    };
  };
}

function BlockContent({ element, onUpdate, t }: BlockContentProps) {
  if (element.type === "space") {
    return (
      <div className="text-center py-4 text-gray-400 border-2 border-dashed border-gray-300 rounded">
        <Space className="w-6 h-6 mx-auto mb-1" />
        <span className="text-sm">Space</span>
      </div>
    );
  }

  if (element.type === "heading") {
    return (
      <div className="space-y-2">
        <RichTextEditor
          value={element.content}
          onChange={(value) => onUpdate({ content: value })}
          placeholder={t.placeholders.heading}
          className="border-none"
        />
      </div>
    );
  }

  if (element.type === "cta") {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={element.ctaText || element.content}
          onChange={(e) =>
            onUpdate({ ctaText: e.target.value, content: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded"
          placeholder={t.placeholders.buttonText}
        />
        <input
          type="url"
          value={element.ctaUrl || ""}
          onChange={(e) => onUpdate({ ctaUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          placeholder={t.placeholders.buttonUrl}
        />
      </div>
    );
  }

  if (element.type === "image") {
    return (
      <div className="space-y-2">
        <input
          type="url"
          value={element.url || ""}
          onChange={(e) => onUpdate({ url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          placeholder="Image URL"
        />
        <input
          type="text"
          value={element.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          placeholder={t.placeholders.imageUrl}
        />
        <input
          type="url"
          value={element.ctaUrl || ""}
          onChange={(e) => onUpdate({ ctaUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          placeholder={t.placeholders.imageLink}
        />
        {element.url && (
          <div className="space-y-2">
            <div className="relative">
              <img
                src={
                  element.url.includes("googleusercontent.com")
                    ? `/api/image-proxy?url=${encodeURIComponent(element.url)}`
                    : element.url
                }
                alt={element.content}
                className="max-w-full h-32 object-cover rounded border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const errorDiv = target.parentElement?.querySelector(
                    ".error-message"
                  ) as HTMLElement;
                  if (errorDiv) errorDiv.style.display = "block";
                }}
                onLoad={(e) => {
                  const target = e.target as HTMLImageElement;
                  const errorDiv = target.parentElement?.querySelector(
                    ".error-message"
                  ) as HTMLElement;
                  if (errorDiv) errorDiv.style.display = "none";
                }}
              />
              <div className="error-message hidden p-4 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                <div className="flex items-start gap-2">
                  <span className="text-red-600">❌</span>
                  <div>
                    <strong>이미지 로드 실패</strong>
                    <p className="mt-1">이 이미지 URL에 접근할 수 없습니다.</p>
                    <p className="mt-1 text-xs text-red-600">
                      Google Docs 이미지는 권한 문제로 표시되지 않을 수
                      있습니다.
                    </p>
                    <p className="mt-1 text-xs">
                      다른 이미지 URL을 사용하거나 이미지를 다시 업로드해주세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 기본 텍스트 입력 (paragraph, list)
  return (
    <div className="space-y-2">
      <RichTextEditor
        value={element.content}
        onChange={(value) => onUpdate({ content: value })}
        placeholder={
          element.type === "list" ? t.placeholders.list : t.placeholders.text
        }
        className="border-none"
      />
      {element.url && (
        <input
          type="url"
          value={element.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          placeholder={t.placeholders.imageLink}
        />
      )}
    </div>
  );
}

// 블록 사이 구분선 및 추가 버튼
interface BlockSeparatorProps {
  onAddBlock: (type: SimpleDocumentElement["type"]) => void;
  isLast?: boolean;
}

function BlockSeparator({ onAddBlock, isLast = false }: BlockSeparatorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [stableHover, setStableHover] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      if (showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showMenu]);

  // 안정적인 호버 상태 관리
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
    // 약간의 지연 후 안정적인 호버 상태로 전환
    hoverTimeoutRef.current = setTimeout(() => {
      setStableHover(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
    // 메뉴가 열려있으면 호버 상태 유지
    if (!showMenu) {
      // 약간의 지연 후 호버 상태 해제
      hoverTimeoutRef.current = setTimeout(() => {
        setStableHover(false);
      }, 150);
    }
  };

  // 메뉴가 닫힐 때 호버 상태 정리
  useEffect(() => {
    if (!showMenu && !isHovered) {
      hoverTimeoutRef.current = setTimeout(() => {
        setStableHover(false);
      }, 150);
    }
  }, [showMenu, isHovered]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`relative group ${isLast ? "py-4" : "py-2"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Notion 스타일: 항상 보이는 구분선 + 호버 시 버튼 */}
      <div className="relative flex items-center">
        {/* 항상 보이는 구분선 */}
        <div
          className={`flex-1 h-px transition-colors duration-200 ${
            stableHover || showMenu ? "bg-blue-300" : "bg-gray-200"
          }`}
        />

        {/* 중앙의 + 버튼 (항상 존재하지만 투명도로 제어) */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`w-6 h-6 rounded-full border transition-all duration-200 flex items-center justify-center ${
              stableHover || showMenu || isLast
                ? "bg-white border-blue-400 text-blue-600 shadow-sm opacity-100"
                : "bg-gray-100 border-gray-300 text-gray-400 opacity-30 group-hover:opacity-100"
            } hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700`}
            title="Add Block"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 블록 타입 메뉴 */}
      {showMenu && (
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 min-w-[300px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-3 gap-2">
            <BlockTypeButton
              type="paragraph"
              icon={<Type className="w-5 h-5" />}
              label="Text"
              onClick={(type) => {
                onAddBlock(type);
                setShowMenu(false);
              }}
            />
            <BlockTypeButton
              type="heading"
              icon={<Hash className="w-5 h-5" />}
              label="Heading"
              onClick={(type) => {
                onAddBlock(type);
                setShowMenu(false);
              }}
            />
            <BlockTypeButton
              type="list"
              icon={<List className="w-5 h-5" />}
              label="List"
              onClick={(type) => {
                onAddBlock(type);
                setShowMenu(false);
              }}
            />
            <BlockTypeButton
              type="image"
              icon={<Image className="w-5 h-5" />}
              label="Image"
              onClick={(type) => {
                onAddBlock(type);
                setShowMenu(false);
              }}
            />
            <BlockTypeButton
              type="cta"
              icon={<Square className="w-5 h-5" />}
              label="Button"
              onClick={(type) => {
                onAddBlock(type);
                setShowMenu(false);
              }}
            />
            <BlockTypeButton
              type="space"
              icon={<Space className="w-5 h-5" />}
              label="Space"
              onClick={(type) => {
                onAddBlock(type);
                setShowMenu(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// 블록 타입 버튼
interface BlockTypeButtonProps {
  type: SimpleDocumentElement["type"];
  icon: React.ReactNode;
  label: string;
  onClick: (type: SimpleDocumentElement["type"]) => void;
}

function BlockTypeButton({ type, icon, label, onClick }: BlockTypeButtonProps) {
  return (
    <button
      onClick={() => onClick(type)}
      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
    >
      <div className="text-gray-600">{icon}</div>
      <span className="text-xs text-gray-700 font-medium">{label}</span>
    </button>
  );
}
