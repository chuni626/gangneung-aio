'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 
import { useParams, useRouter } from 'next/navigation'; // useRouter 추가됨

// 🏗️ 부품 가져오기
import { TrendChart } from './components/TrendChart';
import { BlogWriter } from './components/BlogWriter';
import { ReviewAnalyzer } from './components/ReviewAnalyzer';

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const router = useRouter(); // 페이지 이동 도구
  const params = useParams();
  const rawStoreId = params?.store_id || params?.storeId;
  const storeId = typeof rawStoreId === 'string' ? decodeURIComponent(rawStoreId) : '';

  // 웹훅 주소
  const WEBHOOK_URL = "https://hook.eu1.make.com/mz00d2wpgrogth8njgcim5efuu9ussv6"; 

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // 로그인한 유저 정보 담을 그릇
  const [dataCount, setDataCount] = useState(0);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [newsInput, setNewsInput] = useState("");

  // 🔐 1. 페이지 켜지자마자 로그인 검사
  useEffect(() => {
    const checkSession = async () => {
      // 현재 로그인된 세션 확인
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // 로그인이 안 되어 있다면? -> 로그인 페이지로 쫓아냄
        alert("로그인이 필요한 페이지입니다!");
        router.replace('/login');
      } else {
        // 로그인 되어 있다면? -> 유저 정보 저장하고 데이터 불러오기 시작
        setUser(session.user);
        if (storeId) fetchData();
      }
    };

    checkSession();
  }, [storeId, router]);

  const fetchData = async () => {
    try {
        const { count } = await supabase.from('local_data').select('*', { count: 'exact', head: true });
        setDataCount(count || 0);

        const { data: store } = await supabase.from('gangneung_stores').select('raw_info').eq('store_id', storeId).maybeSingle();
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
            alert("✅ 소식 등록 & SNS 전송 요청 완료!");
        } catch (e) {
            alert("⚠️ DB엔 저장됐지만, Make 전송은 실패했습니다.");
        }
    } else {
        alert("✅ DB 저장 완료 (웹훅 주소 미설정)");
    }
  };

  // 🚪 로그아웃 기능
  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert("안전하게 로그아웃 되었습니다.");
    router.push('/login');
  };

  // 로딩 화면
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
      <div className="animate-spin text-4xl">🔐</div>
      <p className="font-bold text-slate-500">보안 구역 접속 중...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 헤더 부분 */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">ADMIN DASHBOARD</h1>
            <p className="text-slate-500 font-bold italic">관리 코드: <span className="text-blue-600 underline">{storeId}</span></p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">
                    {user?.email} 님 접속 중
                </span>
                <button 
                    onClick={handleLogout}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all"
                >
                    로그아웃
                </button>
            </div>
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm animate-pulse border border-green-200">
                ● 서비스 가동중
            </div>
          </div>
        </header>

        {/* 1. 트렌드 차트 */}
        <div className="grid md:grid-cols-3 gap-6">
          <TrendChart data={trendData} />
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mb-4">💎</div>
            <p className="text-slate-400 font-bold text-sm mb-1 uppercase tracking-wider">누적 수집 데이터</p>
            <h3 className="text-4xl font-black text-slate-800 mb-2">{dataCount} <span className="text-lg font-normal text-slate-400">건</span></h3>
            <p className="text-blue-500 text-xs font-bold animate-bounce">▲ AI 학습 최적화 완료</p>
          </div>
        </div>

        {/* 2. 실시간 소식 & 웹훅 전송 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-slate-700">📢 실시간 매장 데이터 주입</h2>
                <span className="text-xs text-slate-400">네이버/인스타/페이스북 동시 배포</span>
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={newsInput} 
                    onChange={(e) => setNewsInput(e.target.value)} 
                    placeholder="예: 오늘 영진해변 자연산 광어 대량 입고! 10% 할인 이벤트 중" 
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
                />
                <button 
                    onClick={handleUpdateNews} 
                    className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-slate-800 hover:shadow-lg transition-all"
                >
                    데이터 전송
                </button>
            </div>
        </div>

        {/* 3. 블로그 작가 */}
        <div className="grid md:grid-cols-2 gap-6">
            <BlogWriter storeId={storeId} />
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-700">📄 월간 데이터 성과 보고서</h2>
                    <button className="text-xs bg-slate-100 px-3 py-1 rounded-lg font-bold text-slate-500 hover:bg-slate-200">새로고침</button>
                </div>
                <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center text-slate-400 border-dashed">
                    <div className="text-5xl mb-4 opacity-50">📊</div>
                    <p className="text-sm font-bold">충분한 데이터가 쌓이지 않았습니다.</p>
                </div>
            </div>
        </div>

        {/* 4. 리뷰 분석기 */}
        <ReviewAnalyzer storeId={storeId} />

      </div>
    </div>
  );
}