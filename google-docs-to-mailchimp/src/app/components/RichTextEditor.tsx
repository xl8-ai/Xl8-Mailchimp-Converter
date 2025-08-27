"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bold, Italic, Underline, Link } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // 에디터 내용이 변경될 때
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  // 포맷팅 명령 실행
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // 링크 추가
  const addLink = () => {
    if (linkUrl.trim()) {
      execCommand("createLink", linkUrl);
      setIsLinkMode(false);
      setLinkUrl("");
    }
  };

  // 선택된 텍스트가 있는지 확인
  const hasSelection = () => {
    const selection = window.getSelection();
    return selection && selection.toString().length > 0;
  };

  // 에디터 초기화
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      {/* 툴바 */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            if (hasSelection()) {
              setIsLinkMode(true);
            } else {
              alert("Please select text first to add a link");
            }
          }}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Add Link"
        >
          <Link className="w-4 h-4" />
        </button>

        {/* 링크 입력 모드 */}
        {isLinkMode && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL"
              className="px-2 py-1 text-xs border border-gray-300 rounded"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink();
                } else if (e.key === "Escape") {
                  setIsLinkMode(false);
                  setLinkUrl("");
                }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={addLink}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLinkMode(false);
                setLinkUrl("");
              }}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* 에디터 */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-3 min-h-[100px] outline-none"
        style={{
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        [contenteditable] strong {
          font-weight: bold;
        }

        [contenteditable] em {
          font-style: italic;
        }

        [contenteditable] u {
          text-decoration: underline;
        }

        [contenteditable] a {
          color: #2563eb;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
