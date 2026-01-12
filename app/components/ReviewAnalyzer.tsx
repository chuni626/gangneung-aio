'use client';
export function ReviewAnalyzer({ storeId }: { storeId: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100">
      <h2 className="font-bold mb-4">⭐ 리뷰 분석</h2>
      <div className="bg-slate-50 p-4 rounded-xl text-sm">리뷰 데이터 대기 중...</div>
    </div>
  );
}