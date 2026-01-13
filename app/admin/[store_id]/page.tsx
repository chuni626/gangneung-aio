'use client';

import { useState, useEffect, useRef } from 'react'; 
import { createClient } from '@supabase/supabase-js'; 
import { useParams, useRouter } from 'next/navigation';

// 🏗️ 부품 가져오기
import { TrendChart } from '@/app/components/TrendChart';
import { BlogWriter } from '@/app/components/BlogWriter';
import { ReviewAnalyzer } from '@/app/components/ReviewAnalyzer';

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
  const [user, setUser] = useState<any>(null);
  const [dataCount, setDataCount] = useState(0);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [newsInput, setNewsInput] = useState("");
  
  const [crawlUrl, setCrawlUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);

  // 🔒 덮어쓰기 방지 잠금장치
  const preventOverwrite = useRef(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser({ email: 'admin@test.com' });
        if (storeId) fetchData();
      } else {
        setUser(session.user);
        if (storeId) fetchData();
      }
    };
    checkSession();
  }, [storeId]);

  const fetchData = async () => {
    console.log("🕵️‍♂️ [DB 조회 시도] fetchData() 실행됨");

    if (preventOverwrite.current) {
        console.log("🛡️ [방어 성공] 방금 수집된 데이터가 있어 DB 조회를 막았습니다.");
        return;
    }

    try {
        const { count } = await supabase.from('gangneung_stores').select('*', { count: 'exact', head: true });
        setDataCount(count || 0);

        // DB에서 저장된 소식 가져오기
        const { data: store } = await supabase.from('gangneung_stores')
            .select('raw_info')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        if (store) {
            console.log("💾 [DB 로드] 저장된 소식:", store.raw_info);
            // 여기가 범인! DB에 '홍게'가 있으면 이걸 불러옵니다.
            setNewsInput(store.raw_info || ""); 
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

    console.log("🕵️‍♂️ [수집 시작]");
    setIsCrawling(true);
    preventOverwrite.current = true; // 잠금!
    
    try {
        const res = await fetch('/api/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: crawlUrl, storeId: storeId })
        });
        
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        if (data.data && data.data.length > 0) {
            const newContent = data.data[0].content;
            console.log("✅ [UI 적용] 화면 갱신:", newContent);
            setNewsInput(newContent); 
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
    
    // DB에 새로운 내용 저장 (홍게 내용을 덮어씀)
    const { error } = await supabase.from('gangneung_stores').upsert({ 
        store_id: storeId, 
        store_name: storeId, 
        raw_info: newsInput 
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

        {/* 차트 영역 */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <TrendChart data={trendData} />
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mb-4">💎</div>
             <p className="text-slate-400 font-bold text-sm mb-1 uppercase tracking-wider">누적 수집 데이터</p>
             <h3 className="text-4xl font-black text-slate-800 mb-2">{dataCount} <span className="text-lg font-normal text-slate-400">건</span></h3>
          </div>
        </div>

        {/* 수집기 영역 */}
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

        {/* 📢 실시간 소식 (여기가 바뀝니다! textarea) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-slate-700">📢 실시간 매장 소식 편집</h2>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
                {/* 🛠️ 한 줄(input)이 아니라 넓은 박스(textarea)로 바꿨습니다 */}
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

        <div className="grid md:grid-cols-2 gap-6">
            <BlogWriter storeId={storeId} />
            <ReviewAnalyzer storeId={storeId} />
        </div>
      </div>
    </div>
  );
}