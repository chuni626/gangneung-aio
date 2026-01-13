'use client';

import { useState, useEffect, useRef } from 'react'; 
import { createClient } from '@supabase/supabase-js'; 
import { useParams, useRouter } from 'next/navigation';
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
  const [trendData, setTrendData] = useState<any[]>([]);
  const [newsInput, setNewsInput] = useState("");
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const preventOverwrite = useRef(false);

  // 🕵️ 탐정 진단 로그
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);

  useEffect(() => {
    if (storeId) fetchData();
  }, [storeId]);

  const fetchData = async () => {
    if (preventOverwrite.current) return;
    try {
        const { data: store } = await supabase.from('gangneung_stores')
            .select('*').eq('store_id', storeId).maybeSingle();
        if (store) {
            setNewsInput(store.raw_info || ""); 
            setStoreImage(store.image_url || null);
            addLog("✅ DB 연결 성공");
        }
        setTrendData([{ name: '1주', visitor: 10 }, { name: '2주', visitor: 25 }, { name: '3주', visitor: 15 }, { name: '4주', visitor: 50 }]);
    } catch (e: any) { addLog(`❌ 로딩 에러: ${e.message}`); } finally { setLoading(false); }
  };

  // 📸 사진 저장 (핵심 수정 부분)
  const handleImageUploadComplete = async (url: string) => {
    addLog("⏳ DB에 사진 주소 기록 중...");
    const { data, error } = await supabase.from('gangneung_stores').upsert({
        store_id: storeId,
        image_url: url,
        store_name: '영진횟집'
    }, { onConflict: 'store_id' }).select();
    
    if(!error && data) {
        addLog("✅ DB 기록 성공!");
        setStoreImage(url);
        alert("✅ 사진이 성공적으로 저장되었습니다!");
    } else {
        addLog(`❌ 실패: ${error?.message}`);
        alert("❌ 저장 실패: " + error?.message);
    }
  };

  // 🕷️ 데이터 수집기 (Firecrawl)
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
        if (data.data) {
            setNewsInput(data.data[0].content);
            addLog("🕷️ 수집 완료");
            alert("✅ 수집 완료!");
        }
    } catch (e: any) { addLog(`❌ 수집 실패: ${e.message}`); } finally { setIsCrawling(false); }
  };

  // 📢 소식 저장 및 웹훅 전송
  const handleUpdateNews = async () => {
    const { error } = await supabase.from('gangneung_stores').upsert({ 
        store_id: storeId, 
        raw_info: newsInput,
        store_name: '영진횟집',
        image_url: storeImage
    }, { onConflict: 'store_id' });

    if (error) {
        addLog(`❌ 저장 에러: ${error.message}`);
        return alert("저장 실패: " + error.message);
    }

    if (WEBHOOK_URL) {
        await fetch(WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ storeId, content: newsInput }) });
    }
    addLog("✅ 소식 저장 완료");
    alert("✅ 저장 및 전송 완료!");
  };

  if (loading) return <div className="p-10 text-center font-bold">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans relative">
      
      {/* 🕵️‍♂️ [실시간 탐정 진단창] - 화면 우측 상단에 고정됩니다. */}
      <div className="fixed top-4 right-4 z-[9999] w-72 bg-black text-green-400 p-4 rounded-2xl font-mono text-[10px] shadow-2xl border border-green-500">
        <p className="font-bold text-white border-b border-green-900 mb-2 pb-1">🕵️ 실시간 DB 상황 중계</p>
        <p>● 접속 ID: {storeId}</p>
        <div className="space-y-1 mt-2">
          {logs.map((log, i) => <p key={i}>{log}</p>)}
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6 text-left">
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase">Admin Dashboard</h1>
            <p className="text-slate-500 font-bold">관리 코드: <span className="text-blue-600">{storeId}</span></p>
          </div>
          <button onClick={() => {supabase.auth.signOut(); router.push('/login');}} className="text-xs bg-white border px-3 py-1 rounded">로그아웃</button>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2"><TrendChart data={trendData} /></div>
          <ImageUploader storeId={storeId} currentImage={storeImage} onUploadComplete={handleImageUploadComplete} />
        </div>

        <div className="bg-indigo-600 rounded-3xl p-6 shadow-lg text-white">
            <h2 className="text-lg font-bold mb-3">🕷️ 외부 데이터 자동 수집기</h2>
            <div className="flex gap-2">
                <input type="text" value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} placeholder="https://blog.naver.com/..." className="flex-1 p-3 bg-indigo-500/30 border border-indigo-400/50 rounded-xl text-white outline-none" />
                <button onClick={handleCrawl} className="bg-white text-indigo-700 px-6 rounded-xl font-bold">{isCrawling ? '수집 중...' : '수집 시작'}</button>
            </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-4">📢 실시간 매장 소식 편집</h2>
            <div className="flex flex-col md:flex-row gap-4">
                <textarea value={newsInput} onChange={(e) => setNewsInput(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl h-32" />
                <button onClick={handleUpdateNews} className="bg-slate-900 text-white px-8 rounded-xl font-bold h-32">최종 등록 💾</button>
            </div>
        </div>

        {/* 📸 AI 블로그 작가 및 성과 보고서 기능 복구 */}
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-600 p-6 rounded-3xl shadow-lg text-white">
                 <h2 className="text-lg font-bold mb-4">📸 AI 블로그 작가</h2>
                 <textarea className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white mb-4 h-32" placeholder="주제를 입력하세요." />
                 <div className="flex gap-2">
                    <button onClick={() => alert("사진 선택 기능을 실행합니다.")} className="flex-1 bg-blue-500 py-3 rounded-xl font-bold">📸 사진 추가</button>
                    <button onClick={() => alert("AI가 글을 발행합니다.")} className="flex-1 bg-white text-blue-600 py-3 rounded-xl font-bold">글 발행 🚀</button>
                 </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                 <h2 className="text-lg font-bold text-slate-700 mb-6">📄 월간 성과 보고서</h2>
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <div className="text-4xl mb-2 opacity-30">📊</div>
                    <p className="text-sm">데이터 수집 및 분석 중입니다.</p>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
}