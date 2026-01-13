'use client';

import { useState, useEffect, useRef } from 'react'; 
import { createClient } from '@supabase/supabase-js'; 
import { useParams, useRouter } from 'next/navigation';

// 🏗️ 부품들
import { TrendChart } from '@/app/components/TrendChart';
import { ImageUploader } from '@/app/components/ImageUploader'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const router = useRouter();
  const params = useParams();
  const rawStoreId = params?.store_id; 
  const storeId = typeof rawStoreId === 'string' ? decodeURIComponent(rawStoreId) : '';

  const WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ""; 

  const [loading, setLoading] = useState(true);
  const [dataCount, setDataCount] = useState(0);
  const [trendData, setTrendData] = useState<any[]>([]);
  
  // 📝 텍스트 상태
  const [newsInput, setNewsInput] = useState("");
  // 📸 [NEW] 이미지 상태 추가!
  const [storeImage, setStoreImage] = useState<string | null>(null);

  const [crawlUrl, setCrawlUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);

  const preventOverwrite = useRef(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
         if (storeId) fetchData();
      } else {
         if (storeId) fetchData();
      }
    };
    checkSession();
  }, [storeId]);

  const fetchData = async () => {
    if (preventOverwrite.current) return;

    try {
        const { count } = await supabase.from('gangneung_stores').select('*', { count: 'exact', head: true });
        setDataCount(count || 0);

        // 이미지 URL도 같이 가져오기
        const { data: store } = await supabase.from('gangneung_stores')
            .select('raw_info, image_url')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        if (store) {
            setNewsInput(store.raw_info || ""); 
            // 📸 [NEW] 가져온 이미지를 상태에 저장!
            setStoreImage(store.image_url || null);
        }

        setTrendData([
            { name: '1주차', score: 20, visitor: 10 },
            { name: '2주차', score: 45, visitor: 25 },
            { name: '3주차', score: 30, visitor: 15 },
            { name: '4주차', score: 80, visitor: 50 },
        ]);
    } catch (e) {
        console.error("로딩 에러:", e);
    } finally {
        setLoading(false);
    }
  };

  const handleCrawl = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault(); 
    if (!crawlUrl) return alert("URL을 입력해주세요!");

    setIsCrawling(true);
    preventOverwrite.current = true; 
    
    try {
        const res = await fetch('/api/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: crawlUrl, storeId: storeId })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.data && data.data.length > 0) {
            setNewsInput(data.data[0].content); 
            alert(`✅ 수집 완료!\n\n내용이 입력창에 들어갔습니다.`);
        } else {
            alert("✅ 수집 성공했으나 텍스트가 없습니다.");
        }
    } catch (e: any) {
        alert("⚠️ 수집 실패: " + e.message);
        preventOverwrite.current = false;
    } finally {
        setIsCrawling(false);
    }
  };

  const handleUpdateNews = async () => {
    if (!newsInput) return alert("내용이 비어있습니다.");
    
    // 이미지 정보는 유지하면서 텍스트만 업데이트
    const { error } = await supabase.from('gangneung_stores').upsert({ 
        store_id: storeId, 
        store_name: storeId, 
        raw_info: newsInput,
        // image_url은 굳이 안 써도 기존거 유지됨 (upsert 특성상)
    });

    if (error) return alert("저장 실패: " + error.message);
    preventOverwrite.current = false; 

    if (WEBHOOK_URL.includes("http")) {
        try {
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: storeId,
                    content: newsInput,
                    timestamp: new Date().toISOString()
                })
            });
            alert("✅ 저장 및 전송 완료!");
        } catch (e) {
            alert("✅ 저장 완료 (전송 실패)");
        }
    } else {
        alert("✅ 저장 완료");
    }
  };

  // 이미지 업로드 완료되면 DB에 저장하고 화면 갱신
  const handleImageUploadComplete = async (url: string) => {
    const { error } = await supabase.from('gangneung_stores').upsert({
        store_id: storeId,
        image_url: url
    });
    
    if(!error) {
        setStoreImage(url); // 화면 즉시 갱신
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="p-10 text-center font-bold">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase">Admin Dashboard</h1>
            <p className="text-slate-500 font-bold">관리 코드: <span className="text-blue-600">{storeId}</span></p>
          </div>
          <button onClick={handleLogout} className="text-xs bg-white border px-3 py-1 rounded hover:bg-slate-100">로그아웃</button>
        </header>

        {/* 1열: 차트 + 이미지 업로더 */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <TrendChart data={trendData} />
          </div>
          
          {/* 📸 [NEW] currentImage 속성을 추가해서 이미지를 전달합니다! */}
          <div className="h-full">
            <ImageUploader 
               storeId={storeId} 
               currentImage={storeImage} 
               onUploadComplete={handleImageUploadComplete} 
            />
          </div>
        </div>

        {/* 2열: Firecrawl 수집기 */}
        <div className="bg-indigo-600 rounded-3xl p-6 shadow-lg text-white">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🕷️</span>
                <h2 className="text-lg font-bold">외부 데이터 자동 수집기</h2>
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    placeholder="https://blog.naver.com/..." 
                    className="flex-1 p-3 bg-indigo-500/30 border border-indigo-400/50 rounded-xl text-white placeholder-indigo-300 focus:ring-2 focus:ring-white outline-none" 
                />
                <button 
                    type="button" 
                    onClick={handleCrawl}
                    disabled={isCrawling}
                    className="bg-white text-indigo-700 px-6 rounded-xl font-bold hover:bg-indigo-50 disabled:opacity-70 transition-all whitespace-nowrap"
                >
                    {isCrawling ? '수집 중...' : '수집 시작'}
                </button>
            </div>
        </div>

        {/* 3열: 실시간 소식 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-slate-700">📢 실시간 매장 소식 편집</h2>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
                <textarea 
                    value={newsInput} 
                    onChange={(e) => setNewsInput(e.target.value)} 
                    placeholder="내용을 입력하세요." 
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32 text-base leading-relaxed" 
                />
                <button 
                    type="button"
                    onClick={handleUpdateNews} 
                    className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-slate-800 transition-all h-32 shadow-lg flex items-center justify-center whitespace-nowrap"
                >
                    최종 등록 💾
                </button>
            </div>
        </div>

        {/* 4열: 블로그 작가 + 보고서 */}
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-600 p-6 rounded-3xl shadow-lg text-white">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        📸 AI 블로그 작가 <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">PRO</span>
                    </h2>
                 </div>
                 <textarea 
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 outline-none focus:bg-white/20 h-32 resize-none mb-4"
                    placeholder="글 주제 (예: 비 오는 날 데이트 코스)"
                 />
                 <div className="flex gap-2">
                    <button className="flex-1 bg-blue-500 hover:bg-blue-400 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                        📸 사진 추가
                    </button>
                    <button className="flex-1 bg-white text-blue-600 hover:bg-blue-50 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                        글 발행 🚀
                    </button>
                 </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-700">📄 월간 성과 보고서</h2>
                    <button className="text-xs bg-slate-100 px-3 py-1 rounded-lg font-bold text-slate-500 hover:bg-slate-200">새로 고침</button>
                 </div>
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <div className="text-4xl mb-2 opacity-30">📊</div>
                    <p className="text-sm">데이터가 부족합니다.</p>
                 </div>
            </div>
        </div>

      </div>
    </div>
  );
}