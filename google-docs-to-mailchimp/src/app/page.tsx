'use client';

import { useState } from 'react';
import { convertGoogleDocsToHtml } from './utils/converter';

export default function Home() {
  const [googleDocsUrl, setGoogleDocsUrl] = useState('');
  const [htmlOutput, setHtmlOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConvert = async () => {
    if (!googleDocsUrl) {
      setError('구글 독스 URL을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setHtmlOutput('');

    try {
      const html = await convertGoogleDocsToHtml(googleDocsUrl);
      setHtmlOutput(html);
    } catch (err) {
      setError('변환 중 오류가 발생했습니다. URL을 확인해주세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(htmlOutput);
      alert('HTML이 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            구글 독스 → 메일침프 HTML 변환기
          </h1>
          <p className="text-lg text-gray-600">
            구글 독스 URL을 입력하면 메일침프에서 사용할 수 있는 HTML로 변환해드립니다.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              구글 독스 URL
            </label>
            <input
              type="url"
              id="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://docs.google.com/document/d/..."
              value={googleDocsUrl}
              onChange={(e) => setGoogleDocsUrl(e.target.value)}
            />
          </div>

          <button
            onClick={handleConvert}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '변환 중...' : 'HTML로 변환'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {htmlOutput && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">변환된 HTML</h2>
              <button
                onClick={copyToClipboard}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                클립보드에 복사
              </button>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">미리보기</h3>
              <div 
                className="border border-gray-300 rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: htmlOutput }}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">HTML 코드</h3>
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
