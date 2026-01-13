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
  // Next.js 15버전 대응 (params가 Promise일 수도 있음)
  const rawStoreId = params?.store_id;
  const storeId = typeof rawStoreId === 'string' ? decodeURIComponent(rawStoreId) : '';

  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStoreInfo = async () => {
      if (!storeId) return;
      try {
        // 1. DB에서 'image_url'도 같이 가져오라고 명령!
        const { data, error } = await supabase
          .from('gangneung_stores')
          .select('store_name, raw_info, image_url') 
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

    fetchStoreInfo();
  }, [storeId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">로딩 중...</div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center bg-slate-50">가게 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl overflow-hidden relative">
        
        {/* 📸 [NEW] 대표 사진 영역 (사진이 있을 때만 보여줌) */}
        {store.image_url ? (
            <div className="w-full h-64 relative">
                <img 
                  src={store.image_url} 
                  alt={store.store_name} 
                  className="w-full h-full object-cover"
                />
                {/* 사진 위에 살짝 그라데이션을 줘서 글씨가 잘 보이게 함 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                    <h1 className="text-3xl font-black drop-shadow-md">{store.store_name}</h1>
                </div>
            </div>
        ) : (
            /* 사진 없으면 기존처럼 파란 배경 */
            <div className="bg-blue-600 p-8 pt-20 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block backdrop-blur-sm">
                        🌊 강릉 로컬 인증 맛집
                    </span>
                    <h1 className="text-3xl font-black mb-2">{store.store_name}</h1>
                    <p className="opacity-90 text-sm">AI가 실시간으로 분석한 로컬 정보입니다.</p>
                </div>
                {/* 장식용 원 */}
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>
        )}

        {/* 📢 AI 실시간 브리핑 */}
        <div className="p-6 -mt-4 relative z-20">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                    <span className="text-2xl animate-pulse">📢</span>
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg">AI 실시간 브리핑</h2>
                        <p className="text-xs text-slate-400">방금 업데이트된 소식입니다</p>
                    </div>
                </div>
                
                <div className="prose prose-slate text-slate-600 leading-relaxed text-sm">
                    {/* 줄바꿈 문자를 HTML 줄바꿈으로 변환해서 보여줌 */}
                    {store.raw_info ? (
                        store.raw_info.split('\n').map((line: string, i: number) => (
                            <p key={i} className="mb-2 last:mb-0">{line}</p>
                        ))
                    ) : (
                        <p className="text-slate-400 text-center py-4">아직 등록된 소식이 없습니다.</p>
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
                    <span>🤖 Gemini 1.5 Pro 분석</span>
                    <span>{new Date().toLocaleDateString()} 기준</span>
                </div>
            </div>

            {/* 메뉴 추천 (고정된 예시) */}
            <h3 className="font-bold text-slate-800 text-lg mb-4 px-1">🔥 지금 뜨는 인기 키워드</h3>
            <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <span className="text-2xl mb-2 block">🐟</span>
                    <h4 className="font-bold text-orange-800">대방어 맛집</h4>
                    <p className="text-xs text-orange-600 mt-1">"기름기가 꽉 찼어요"</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <span className="text-2xl mb-2 block">🌊</span>
                    <h4 className="font-bold text-blue-800">오션뷰 최강</h4>
                    <p className="text-xs text-blue-600 mt-1">"창가 자리 추천해요"</p>
                </div>
            </div>

            {/* 예약/길찾기 버튼 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 md:max-w-md md:mx-auto">
                <div className="flex gap-2">
                    <button className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                        📍 길찾기
                    </button>
                    <button className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">
                        📞 예약 문의하기
                    </button>
                </div>
            </div>
            
            {/* 하단 여백 (버튼에 가리지 않게) */}
            <div className="h-20"></div>
        </div>
      </div>
    </div>
  );
}