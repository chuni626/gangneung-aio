'use client';
import { useState } from 'react';

export function BlogWriter({ storeId }: { storeId: string }) {
  const [loading, setLoading] = useState(false);
  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => { alert("글쓰기 완료!"); setLoading(false); }, 1000);
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100">
      <h2 className="font-bold mb-4">✍️ AI 블로그 작가</h2>
      <button onClick={handleGenerate} disabled={loading} className="bg-blue-600 text-white w-full py-3 rounded-xl">
        {loading ? '생성 중...' : '글쓰기 시작'}
      </button>
    </div>
  );
}