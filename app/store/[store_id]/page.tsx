'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StorePage() {
  const params = useParams();
  const rawStoreId = params?.store_id;
  const storeId = typeof rawStoreId === 'string' ? decodeURIComponent(rawStoreId) : '';

  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStoreInfo = async () => {
    if (!storeId) return;
    try {
      // 1. DB에서 데이터 가져오기
      const { data, error } = await supabase
        .from('gangneung_stores')
        .select('*') 
        .eq('store_id', storeId)
        .maybeSingle();

      if (error) throw error;
      setStore(data);
    } catch (err) {
      console.error("데이터 로딩 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreInfo();

    // 2. 실시간 감시 (관리자가 수정하면 손님 화면도 즉시 변경)
    const subscription = supabase
      .channel('public:gangneung_stores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gangneung_stores', filter: `store_id=eq.${storeId}` }, () => {
        console.log("🔔 실시간 업데이트 감지!");
        fetchStoreInfo();
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [storeId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative overflow-hidden">
        
        {/* 📸 대표 사진 (여기가 핵심!) */}
        {store?.image_url ? (
            <div className="w-full h-96 relative bg-slate-200">
                <img 
                  key={store.image_url} // 이미지가 바뀌면 깜빡임 없이 부드럽게 전환
                  src={store.image_url} 
                  alt={store.store_name} 
                  className="w-full h-full object-cover animate-fade-in"
                />
                {/* 고급스러운 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                
                <div className="absolute bottom-8 left-6 right-6 text-white text-left">
                    <span className="bg-blue-600/90 px-3 py-1 rounded-full text-[11px] font-bold mb-3 inline-block backdrop-blur-md shadow-lg">
                        🌊 강릉 로컬 인증 맛집
                    </span>
                    <h1 className="text-4xl font-black drop-shadow-xl leading-tight mb-1">{store.store_name}</h1>
                    <p className="text-sm text-white/80 font-medium">강원 강릉시 • 횟집/해산물</p>
                </div>
            </div>
        ) : (
            /* 사진 없을 때 */
            <div className="bg-blue-600 h-80 flex flex-col justify-end p-8 text-white">
                <h1 className="text-4xl font-black">{store?.store_name || "가게 이름"}</h1>
                <p className="mt-2 opacity-70">대표 사진을 등록해 주세요.</p>
            </div>
        )}

        {/* 📢 AI 실시간 브리핑 카드 */}
        <div className="px-6 -mt-8 relative z-10">
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-7 text-left">
                <div className="flex items-center gap-3 mb-5 border-b border-slate-50 pb-4">
                    <span className="text-2xl animate-bounce">📢</span>
                    <div>
                        <h2 className="font-bold text-slate-900 text-lg">실시간 매장 소식</h2>
                        <p className="text-[11px] text-slate-400">사장님이 직접 전하는 이야기</p>
                    </div>
                </div>
                
                <div className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-wrap">
                    {store?.raw_info || "등록된 소식이 없습니다."}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-[11px] font-medium text-slate-400">
                    <span className="text-blue-500 flex items-center gap-1">
                        🤖 Gemini 1.5 Pro 분석
                    </span>
                    <span>2026. 01. 13. 기준</span>
                </div>
            </div>
        </div>

        {/* 🔥 인기 키워드 섹션 */}
        <div className="px-6 mt-8 pb-10 text-left">
            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                🔥 지금 뜨는 인기 키워드
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 p-5 rounded-[2rem] border border-orange-100/50 hover:bg-orange-100 transition-colors cursor-pointer">
                    <span className="text-3xl mb-3 block">🐟</span>
                    <h4 className="font-bold text-orange-900 mb-1">제철 대방어</h4>
                    <p className="text-[11px] text-orange-600/80">"기름기가 꽉 찼어요"</p>
                </div>
                <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100/50 hover:bg-blue-100 transition-colors cursor-pointer">
                    <span className="text-3xl mb-3 block">🌊</span>
                    <h4 className="font-bold text-blue-900 mb-1">오션뷰 명당</h4>
                    <p className="text-[11px] text-blue-600/80">"창가 자리 추천해요"</p>
                </div>
            </div>
        </div>

        {/* 🚦 하단 고정 버튼 (액션 유도) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 max-w-md mx-auto z-50">
            <div className="flex gap-3">
                <button className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95 text-sm">
                    📍 길찾기
                </button>
                <button className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 text-base">
                    📞 예약 / 전화 문의
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}