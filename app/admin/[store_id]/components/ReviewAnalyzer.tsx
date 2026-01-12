'use client';
import { useState } from 'react';

// 🔥 export function으로 변경
export function ReviewAnalyzer({ storeId }: { storeId: string }) {
  // ... 내부 로직 기존과 동일 ...
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return alert("리뷰를 입력하세요");
    setLoading(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: text, storeName: storeId })
      });
      const data = await res.json();
      if (data.success) setResult(data.result);
      else alert("실패: " + data.error);
    } catch (e) { alert("오류"); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-lg border border-pink-100">
        <h2 className="text-2xl font-black text-slate-800 mb-6">🗣️ 리뷰 분석 <span className="text-xs bg-pink-100 text-pink-600 px-2 py-1 rounded-full">Beta</span></h2>
        <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
                <textarea className="w-full h-40 p-4 border-2 rounded-xl bg-slate-50 text-sm resize-none outline-none" placeholder="리뷰 붙여넣기..." value={text} onChange={(e) => setText(e.target.value)} />
                <button onClick={handleAnalyze} disabled={loading} className="w-full mt-3 py-3 bg-pink-500 text-white font-bold rounded-xl">
                    {loading ? "분석 중..." : "🔎 분석 시작"}
                </button>
            </div>
            {/* 결과창 생략 (기존과 동일) */}
        </div>
    </div>
  );
}