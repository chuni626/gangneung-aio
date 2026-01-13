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
  const [debugInfo, setDebugInfo] = useState<any>(null); // 🕵️ 진단용 데이터

  const fetchStoreData = async () => {
    try {
      // 🚨 1. DB에서 데이터를 가져올 때 '캐시'를 무시하고 새로 가져오도록 설정
      const { data, error } = await supabase
        .from('gangneung_stores')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (error) throw error;

      setStore(data);
      setDebugInfo(data); // 🕵️ 현재 DB 상태를 진단창에 기록
    } catch (err) {
      console.error("로딩 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storeId) return;
    fetchStoreData();

    // 📡 실시간 감시 (변경되면 즉시 다시 가져오기)
    const subscription = supabase
      .channel('store-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gangneung_stores' }, () => {
        fetchStoreData();
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [storeId]);

  if (loading) return <div className="p-10 text-center">데이터 확인 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* 🕵️‍♂️ [자가 진단창] - 성공하면 나중에 이 부분만 지우면 됩니다 */}
      <div className="max-w-md mx-auto bg-black text-green-400 p-4 text-[10px] font-mono break-all z-50 relative">
        <p className="font-bold border-b border-green-800 mb-2">[🕵️ 실시간 DB 진단 모드]</p>
        <p>● 접속 URL ID: {storeId}</p>
        <p>● DB에서 찾은 store_id: {debugInfo?.store_id || '❌ 없음'}</p>
        <p>● DB에 등록된 이미지 주소: <br/>{debugInfo?.image_url || '❌ 없음'}</p>
        {debugInfo?.image_url && <p className="text-yellow-400 mt-1">✅ 사진 주소가 DB에 있습니다! 안 보인다면 브라우저 새로고침(F5)을 세게 눌러보세요.</p>}
      </div>

      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative overflow-hidden">
        {/* 📸 사진 출력 영역 */}
        {store?.image_url ? (
            <div className="w-full h-80 relative">
                <img 
                  key={store.image_url} // 주소가 바뀌면 이미지를 새로 강제 렌더링
                  src={store.image_url} 
                  className="w-full h-full object-cover"
                  alt="가게 사진"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white text-left">
                    <h1 className="text-4xl font-black">{store.store_name}</h1>
                </div>
            </div>
        ) : (
            <div className="bg-blue-600 p-10 pt-24 text-white text-left">
                <h1 className="text-3xl font-black">{store?.store_name || "가게 이름 없음"}</h1>
                <p className="mt-2 opacity-70">사진이 아직 DB에 반영되지 않았습니다.</p>
            </div>
        )}

        <div className="p-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 -mt-16 relative z-10 text-left">
                <h2 className="font-bold text-slate-800 text-lg mb-4">📢 실시간 소식</h2>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {store?.raw_info || "소식이 없습니다."}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}