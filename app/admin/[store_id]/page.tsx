'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 
import { useParams, useRouter } from 'next/navigation';

// 🛠️ app 폴더를 경로에 꼭 써줘야 합니다!
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
  // Next.js 15 대응: params 처리
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
        // router.replace('/login'); // 개발 편의상 일단 주석처리 (로그인 귀찮으실까봐)
        // 실제 운영시엔 주석 해제하세요!
        setUser({ email: 'test@admin.com' }); // 테스트용 가짜 유저
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

        const { data: store } = await supabase.from('gangneung_stores')
            .select('raw_info')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        if (store) setNewsInput(store.raw_info || "");

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
    if (!crawlUrl) return alert("네이버 플레이스나 블로그 URL을 입력해주세요!");
    setIsCrawling(true);
    
    try {
        const res = await fetch('/api/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: crawlUrl, storeId: storeId })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert("✅ 수집 성공! 데이터가 DB에 저장되었습니다.");
        fetchData(); // 화면 새로고침
        setNewsInput("방금 수집된 최신 데이터가 반영되었습니다."); // UX 업데이트
    } catch (e: any) {
        alert("⚠️ 수집 실패: " + e.message);
    } finally {
        setIsCrawling(false);
    }
  };

  const handleUpdateNews = async () => {
    if (!newsInput) return alert("소식을 입력해주세요!");
    
    const { error } = await supabase.from('gangneung_stores').upsert({ 
        store_id: storeId, 
        store_name: storeId, 
        raw_info: newsInput 
    });

    if (error) return alert("DB 저장 실패: " + error.message);

    if (WEBHOOK_URL && WEBHOOK_URL.includes("http")) {
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
            alert("✅ 등록 & SNS 전송 완료!");
        } catch (e) {
            alert("⚠️ DB 저장 완료 / Make 전송 실패");
        }
    } else {
        alert("✅ DB 저장 완료");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="p-10">로딩중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">ADMIN DASHBOARD</h1>
            <p className="text-slate-500 font-bold italic">관리 코드: <span className="text-blue-600 underline">{storeId}</span></p>
          </div>
          <button onClick={handleLogout} className="text-xs bg-white border px-3 py-1 rounded">로그아웃</button>
        </header>

        {/* 🆕 섹션: 자동 수집 엔진 */}
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🕷️</span>
                <h2 className="text-lg font-bold text-indigo-900">외부 데이터 자동 수집 (Firecrawl)</h2>
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    placeholder="네이버 플레이스 또는 블로그 URL을 입력하세요 (https://...)" 
                    className="flex-1 p-4 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
                <button 
                    onClick={handleCrawl}
                    disabled={isCrawling}
                    className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-indigo-300 transition-all flex items-center gap-2"
                >
                    {isCrawling ? '수집 중...' : '자동 수집 시작'}
                </button>
            </div>
            <p className="text-xs text-indigo-400 mt-2 ml-1">
                * 입력한 URL의 텍스트를 긁어와서 자동으로 '실시간 소식'에 채워넣습니다.
            </p>
        </div>

        {/* 기존: 수동 입력 섹션 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-slate-700">📢 데이터 편집 및 전송</h2>
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={newsInput} 
                    onChange={(e) => setNewsInput(e.target.value)} 
                    placeholder="수집된 데이터가 여기에 표시됩니다. 수정 후 전송하세요." 
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
                <button 
                    onClick={handleUpdateNews} 
                    className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                    최종 저장
                </button>
            </div>
        </div>

        {/* 나머지 차트 및 기능들 */}
        <div className="grid md:grid-cols-3 gap-6">
          <TrendChart data={trendData} />
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <h3 className="text-4xl font-black text-slate-800 mb-2">{dataCount} <span className="text-lg font-normal text-slate-400">건</span></h3>
            <p className="text-slate-400 font-bold text-sm">누적 데이터</p>
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