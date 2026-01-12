'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 
import { useParams, useRouter } from 'next/navigation';

// 🏗️ 부품 가져오기 (경로 수정됨)
import { TrendChart } from '@/app/components/TrendChart';
import { BlogWriter } from '@/app/components/BlogWriter';
import { ReviewAnalyzer } from '@/app/components/ReviewAnalyzer';

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const router = useRouter();
  const params = useParams();
  const rawStoreId = params?.store_id; 
  const storeId = typeof rawStoreId === 'string' ? decodeURIComponent(rawStoreId) : '';

  const WEBHOOK_URL = "https://hook.eu1.make.com/mz00d2wpgrogth8njgcim5efuu9ussv6"; 

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dataCount, setDataCount] = useState(0);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [newsInput, setNewsInput] = useState("");
  
  // 🆕 추가된 상태: 크롤링용 URL
  const [crawlUrl, setCrawlUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // 개발 중 편의를 위해 로그인 체크 잠시 해제 (필요시 주석 해제)
        // router.replace('/login');
        setUser({ email: 'admin@test.com' });
        if (storeId) fetchData();
      } else {
        setUser(session.user);
        if (storeId) fetchData();
      }
    };
    checkSession();
  }, [storeId, router]);

  const fetchData = async () => {
    try {
        const { count } = await supabase.from('gangneung_stores').select('*', { count: 'exact', head: true });
        setDataCount(count || 0);

        // 최신 소식 1개 가져오기
        const { data: store } = await supabase.from('gangneung_stores')
            .select('raw_info')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        if (store) setNewsInput(store.raw_info || "");

        // 차트용 가짜 데이터
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

  // 🆕 기능: Firecrawl 자동 수집 요청
  const handleCrawl = async () => {
    if (!crawlUrl) return alert("URL을 입력해주세요!");
    setIsCrawling(true);
    
    try {
        const res = await fetch('/api/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: crawlUrl, storeId: storeId })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert("✅ 수집 성공! 내용이 자동으로 입력되었습니다.");
        
        // 수집된 데이터를 입력창에 바로 반영 (UX 향상)
        if (data.data && data.data.length > 0) {
            setNewsInput(data.data[0].content);
        }
        
        // 데이터 카운트 새로고침
        fetchData();
        
    } catch (e: any) {
        alert("⚠️ 수집 실패: " + e.message);
    } finally {
        setIsCrawling(false);
    }
  };

  const handleUpdateNews = async () => {
    if (!newsInput) return alert("내용이 비어있습니다.");
    
    const { error } = await supabase.from('gangneung_stores').upsert({ 
        store_id: storeId, 
        store_name: storeId, 
        raw_info: newsInput 
    });

    if (error) return alert("저장 실패: " + error.message);

    // 웹훅 전송
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
            alert("✅ 등록 & 전송 완료!");
        } catch (e) {
            alert("저장은 됐지만 전송 실패");
        }
    } else {
        alert("✅ 저장 완료");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="p-10 text-center font-bold">데이터 댐 로딩 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 헤더 */}
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase">Admin Dashboard</h1>
            <p className="text-slate-500 font-bold">관리 코드: <span className="text-blue-600">{storeId}</span></p>
          </div>
          <div className="flex items-center gap-3">
             <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">● 서비스 가동중</span>
             <button onClick={handleLogout} className="text-xs bg-white border px-3 py-1 rounded hover:bg-slate-100">로그아웃</button>
          </div>
        </header>

        {/* 1열: 차트 + 데이터 카운트 (기존 레이아웃 유지) */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <TrendChart data={trendData} />
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mb-4">💎</div>
             <p className="text-slate-400 font-bold text-sm mb-1 uppercase tracking-wider">누적 수집 데이터</p>
             <h3 className="text-4xl font-black text-slate-800 mb-2">{dataCount} <span className="text-lg font-normal text-slate-400">건</span></h3>
             <p className="text-green-500 text-xs font-bold">▲ AI 학습 중</p>
          </div>
        </div>

        {/* 🆕 2열: [신규 기능] 외부 데이터 자동 수집 (여기에 끼워 넣음!) */}
        <div className="bg-indigo-600 rounded-3xl p-6 shadow-lg text-white">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🕷️</span>
                <h2 className="text-lg font-bold">외부 데이터 자동 수집기 (Firecrawl)</h2>
            </div>
            <p className="text-indigo-200 text-sm mb-4">
                네이버 블로그나 플레이스 주소를 입력하면, AI가 자동으로 읽어와서 내용을 요약해줍니다.
            </p>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    placeholder="https://blog.naver.com/..." 
                    className="flex-1 p-3 bg-indigo-500/30 border border-indigo-400/50 rounded-xl text-white placeholder-indigo-300 focus:ring-2 focus:ring-white outline-none" 
                />
                <button 
                    onClick={handleCrawl}
                    disabled={isCrawling}
                    className="bg-white text-indigo-700 px-6 rounded-xl font-bold hover:bg-indigo-50 disabled:opacity-70 transition-all whitespace-nowrap"
                >
                    {isCrawling ? '수집 중...' : '수집 시작'}
                </button>
            </div>
        </div>

        {/* 3열: 실시간 매장 소식 (기존 기능) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-slate-700">📢 실시간 매장 소식</h2>
                <span className="text-xs text-slate-400">구글 검색결과에 즉시 반영됩니다</span>
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={newsInput} 
                    onChange={(e) => setNewsInput(e.target.value)} 
                    placeholder="예: 오늘 대방어 5마리 입고! 소진 시 마감합니다." 
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
                <button 
                    onClick={handleUpdateNews} 
                    className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                    등록
                </button>
            </div>
        </div>

        {/* 4열: 블로그 작가 + 보고서 (기존 파란색 박스 유지!) */}
        <div className="grid md:grid-cols-2 gap-6">
            {/* 여기가 아까 예쁘다고 하신 파란색 블로그 작가 부분 */}
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
            
            {/* 월간 보고서 */}
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