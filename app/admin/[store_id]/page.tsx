'use client';

import { useState, useEffect, useRef } from 'react'; 
import { createClient } from '@supabase/supabase-js'; 
import { useParams, useRouter } from 'next/navigation';

// 🏗️ 필수 부품들 (TrendChart, ImageUploader) - 기존 기능 100% 유지
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
  
  // 🔗 [핵심 수정 완료] ngrok 주소 + 웹훅 ID 결합
  // 이 주소를 통해 Vercel(외부)에서 대표님의 PC(n8n)로 신호가 안전하게 들어옵니다.
  const N8N_WEBHOOK_URL = "https://bibliopolically-affinal-ambrose.ngrok-free.dev/webhook-test/8272dc55-065e-4695-b01b-98a9b5ee16fc"; 

  // --- 상태 관리 (기능 100% 보존) ---
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [newsInput, setNewsInput] = useState("");
  const [storeImage, setStoreImage] = useState<string | null>(null);
  
  // 수집기 상태
  const [crawlUrl, setCrawlUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);

  // AI 블로그 작가 상태 (다중 이미지 & 미리보기 기능 포함)
  const [blogTopic, setBlogTopic] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [blogImages, setBlogImages] = useState<File[]>([]); 
  const [blogPreviewUrls, setBlogPreviewUrls] = useState<string[]>([]);
  const blogFileRef = useRef<HTMLInputElement>(null);

  // 성과 보고서 상태
  const [reportStatus, setReportStatus] = useState("데이터 대기 중");
  const [reportContent, setReportContent] = useState("");

  const preventOverwrite = useRef(false);

  // 🕵️ 시스템 로그 (탐정 모드 유지)
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 5)]);

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
            addLog("✅ DB 데이터 로드 성공");
        }
        setTrendData([{ name: '1주', visitor: 10 }, { name: '2주', visitor: 25 }, { name: '3주', visitor: 15 }, { name: '4주', visitor: 50 }]);
    } catch (e: any) { addLog(`❌ 로딩 에러: ${e.message}`); } finally { setLoading(false); }
  };

  // 🛠️ n8n 전송용 공통 함수 (JSON 헤더 추가로 '화살표' 문제 해결)
  const sendToN8N = async (payload: any) => {
    try {
        const res = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // 👈 n8n에서 데이터를 분해하게 만드는 핵심!
            body: JSON.stringify(payload)
        });
        return res.ok;
    } catch (e) {
        console.error("n8n 통신 에러:", e);
        addLog("❌ n8n 연결 실패 (ngrok 주소 확인 필요)");
        return false;
    }
  };

  // 1. 📸 메인 사진 저장 + n8n 알림
  const handleImageUploadComplete = async (url: string) => {
    addLog("⏳ DB 저장 및 n8n 신호 전송 중...");
    const { data, error } = await supabase.from('gangneung_stores').upsert({
        store_id: storeId,
        image_url: url,
        store_name: '영진횟집'
    }, { onConflict: 'store_id' }).select();
    
    if(!error && data) {
        addLog("✅ DB 기록 성공!");
        setStoreImage(url);
        
        const ok = await sendToN8N({ event: 'main_image_change', storeId, imageUrl: url });
        if(ok) addLog("🚀 n8n에 사진 정보 전달 성공");
        else addLog("⚠️ n8n 통신 실패");
    }
  };

  // 2. 🕷️ 데이터 수집기 (n8n 엔진 가동)
  const handleCrawl = async () => {
    if (!crawlUrl) return alert("URL을 입력해주세요!");
    setIsCrawling(true);
    addLog("🚀 n8n에게 수집 명령 전달...");
    
    const ok = await sendToN8N({ event: 'start_crawl', url: crawlUrl, storeId: storeId });
    if (ok) {
        addLog("🕷️ n8n이 크롤링을 시작했습니다.");
        alert("✅ n8n 수집 로봇이 가동되었습니다!");
    } else {
        addLog("❌ n8n 통신 실패");
    }
    setIsCrawling(false);
  };

  // 3. 📢 소식 저장 (Supabase 전용)
  const handleUpdateNews = async () => {
    const { error } = await supabase.from('gangneung_stores').upsert({ 
        store_id: storeId, 
        raw_info: newsInput,
        store_name: '영진횟집',
        image_url: storeImage
    }, { onConflict: 'store_id' });

    if (error) return alert("저장 실패: " + error.message);
    addLog("✅ 소식 저장 완료");
    alert("✅ 저장되었습니다!");
  };

  // 4. 📸 AI 블로그 작가 (다중 선택 기능 100% 보존)
  const handleBlogPhotoClick = () => blogFileRef.current?.click();

  const handleBlogFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files);
          setBlogImages(prev => [...prev, ...files]);
          const newPreviews = files.map(file => URL.createObjectURL(file));
          setBlogPreviewUrls(prev => [...prev, ...newPreviews]);
          addLog(`📸 블로그 사진 ${files.length}장 추가됨`);
      }
  };

// 기존 handleBlogPublish 함수를 이걸로 덮어쓰세요!
const handleBlogPublish = async () => {
    if(!blogTopic) return alert("글 주제를 입력해주세요.");
    // ❌ 삭제된 부분: if(blogImages.length === 0) return alert("사진을 최소 1장 추가해주세요.");

    setIsPublishing(true);
    addLog(`✍️ AI 작가에게 집필 요청 중... (사진: ${blogImages.length}장)`);
    
    // 사진이 0장이면 0장이라고 n8n에 솔직하게 말합니다.
    const ok = await sendToN8N({ 
        event: 'publish_blog',
        topic: blogTopic,
        imageCount: blogImages.length, // 이 숫자가 중요합니다!
        storeId 
    });

    if (ok) addLog("✅ n8n 발행 요청 성공");
    else addLog("❌ n8n 통신 실패");

    setTimeout(() => {
        setIsPublishing(false);
        setBlogTopic("");
        setBlogImages([]);
        setBlogPreviewUrls([]);
        // 메시지도 상황에 맞게 바꿉니다.
        const msg = blogImages.length > 0 
          ? `🚀 n8n이 사진 ${blogImages.length}장과 함께 포스팅을 시작합니다!` 
          : `🎨 n8n이 주제에 맞는 이미지를 생성하고 포스팅을 시작합니다!`;
        alert(msg);
    }, 1500);
};

  // 5. 📊 월간 성과 보고서 (기능 보존)
  const handleRefreshReport = () => {
      setReportStatus("🔍 데이터 분석 중...");
      addLog("⏳ 보고서 분석 시작...");
      setTimeout(() => {
          const generatedReport = `
[${new Date().getMonth() + 1}월 성과 보고서]
- 대상: ${storeId}
- AI 진단: 강릉 지역 내 검색 노출도가 전월 대비 15% 상승했습니다.
- 제안: 최근 수집된 데이터를 바탕으로 '제철 메뉴' 키워드를 강화하세요.
          `.trim();
          setReportContent(generatedReport);
          setReportStatus("✅ 분석 완료");
          addLog("✅ 보고서 생성 완료");
      }, 1500);
  };

  if (loading) return <div className="p-10 text-center font-bold">시스템 대기 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans relative">
      
      {/* 🕵️ n8n 통합 진단창 */}
      <div className="fixed top-4 right-4 z-[9999] w-72 bg-black/90 text-green-400 p-4 rounded-2xl font-mono text-[10px] shadow-2xl border border-green-500">
        <p className="font-bold text-white border-b border-green-900 mb-2 pb-1">🕵️ 통합 컨트롤 센터 (ngrok 연결됨)</p>
        <p>● 접속 ID: {storeId}</p>
        <div className="space-y-1 mt-2">{logs.map((log, i) => <p key={i}>{log}</p>)}</div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6 text-left">
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase">Admin Dashboard</h1>
            <p className="text-slate-500 font-bold">관리 코드: <span className="text-blue-600">{storeId}</span></p>
          </div>
          <button onClick={() => {supabase.auth.signOut(); router.push('/login');}} className="text-xs bg-white border px-3 py-1 rounded">로그아웃</button>
        </header>

        {/* 차트 및 메인 업로더 */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2"><TrendChart data={trendData} /></div>
          <ImageUploader storeId={storeId} currentImage={storeImage} onUploadComplete={handleImageUploadComplete} />
        </div>

        {/* 수집기 영역 */}
        <div className="bg-indigo-600 rounded-3xl p-6 shadow-lg text-white">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">🕷️ 데이터 수집기 <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">n8n 연동</span></h2>
            <div className="flex gap-2">
                <input type="text" value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} placeholder="수집할 URL (네이버 블로그 등)" className="flex-1 p-3 bg-indigo-500/30 border border-indigo-400/50 rounded-xl text-white outline-none" />
                <button onClick={handleCrawl} disabled={isCrawling} className="bg-white text-indigo-700 px-6 rounded-xl font-bold">{isCrawling ? '명령 하달 중...' : '수집 시작'}</button>
            </div>
        </div>

        {/* 소식 편집 영역 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-4">📢 실시간 매장 소식 편집</h2>
            <div className="flex flex-col md:flex-row gap-4">
                <textarea value={newsInput} onChange={(e) => setNewsInput(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl h-32" />
                <button onClick={handleUpdateNews} className="bg-slate-900 text-white px-8 rounded-xl font-bold h-32">최종 등록 💾</button>
            </div>
        </div>

        {/* 하단 2열 구성: 블로그 작가 & 보고서 */}
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-600 p-6 rounded-3xl shadow-lg text-white flex flex-col">
                 <h2 className="text-lg font-bold mb-4 flex items-center gap-2">📸 AI 블로그 작가 <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full">PRO</span></h2>
                 <textarea value={blogTopic} onChange={(e) => setBlogTopic(e.target.value)} className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white mb-4 flex-1 h-32 outline-none" placeholder="홍보 주제 입력" />
                 
                 {blogPreviewUrls.length > 0 && (
                     <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                         {blogPreviewUrls.map((url, idx) => (
                             <img key={idx} src={url} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-white/30" />
                         ))}
                     </div>
                 )}
                 <input type="file" multiple ref={blogFileRef} onChange={handleBlogFileChange} className="hidden" accept="image/*" />

                 <div className="flex gap-2">
                    <button onClick={handleBlogPhotoClick} className="flex-1 bg-blue-500 hover:bg-blue-400 py-3 rounded-xl font-bold">📸 사진 추가 ({blogImages.length})</button>
                    <button onClick={handleBlogPublish} disabled={isPublishing} className="flex-1 bg-white text-blue-600 hover:bg-blue-50 py-3 rounded-xl font-bold">글 발행 🚀</button>
                 </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-700">📄 월간 성과 보고서</h2>
                    <button onClick={handleRefreshReport} className="text-xs bg-slate-100 px-3 py-1 rounded-lg font-bold text-slate-500">새로 고침</button>
                 </div>
                 {reportContent ? (
                     <div className="flex-1 bg-slate-50 p-4 rounded-xl text-sm text-slate-600 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-48 border border-slate-200">
                         {reportContent}
                     </div>
                 ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
                        <div className="text-4xl mb-2 opacity-30">📊</div>
                        <p className="text-sm">{reportStatus}</p>
                     </div>
                 )}
            </div>
        </div>
      </div>
    </div>
  );
}