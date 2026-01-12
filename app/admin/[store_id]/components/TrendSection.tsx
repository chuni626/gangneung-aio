'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; // 🔥 [수정] 라이브러리 직접 호출

// 🔥 [수정] Supabase 클라이언트 직접 생성 (에러 해결)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TrendSection({ storeId }: { storeId: string }) {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 모달 및 단계(Step) 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<'INPUT' | 'ANALYZING' | 'RESULT'>('INPUT');
  
  const [selectedTrend, setSelectedTrend] = useState<any>(null);
  const [targetStoreInput, setTargetStoreInput] = useState(storeId || '영진횟집'); 
  const [strategies, setStrategies] = useState<any[]>([]);

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    const { data } = await supabase
      .from('local_data')
      .select('*')
      .neq('image_url', null) 
      .order('created_at', { ascending: false })
      .limit(6);
      
    if (data) setTrends(data);
    setLoading(false);
  };

  const openAnalysisModal = (trend: any) => {
    setSelectedTrend(trend);
    setTargetStoreInput(storeId || '영진횟집'); 
    setStep('INPUT'); 
    setStrategies([]);
    setIsModalOpen(true);
  };

  const handleAnalyzeStart = async () => {
    if (!targetStoreInput.trim()) return alert("분석할 가게 이름을 입력해주세요!");

    setStep('ANALYZING'); 

    try {
      const res = await fetch('/api/trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keyword: selectedTrend.title, 
          storeId: targetStoreInput,
          location: "강릉" 
        })
      });
      const result = await res.json();
      
      const strategies = result.strategies || result.concepts || [];
      if (strategies.length > 0) {
        setStrategies(strategies);
        setStep('RESULT'); 
      } else {
        alert("전략 수립 실패. 다시 시도해주세요.");
        setStep('INPUT');
      }
    } catch (e) {
      console.error(e);
      alert('서버 오류가 발생했습니다.');
      setStep('INPUT');
    }
  };

  const handleCreateBlog = async (strategy: any) => {
    if (!confirm(`'${strategy.title}' 전략으로 글을 작성하시겠습니까?`)) return;

    setIsModalOpen(false);
    alert("🤖 AI 작가가 글을 쓰고 있습니다... (약 20초 소요)");

    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: targetStoreInput, 
          topic: strategy.title,
          concept: strategy.content || strategy.description,
          group_name: selectedTrend.group_name
        })
      });

      const result = await res.json();
      if (result.success) {
        alert(`🎉 블로그 발행 완료!\n제목: ${result.title}`);
      } else {
        alert(`실패: ${result.message || result.error}`);
      }
    } catch (e) {
      alert("통신 오류가 발생했습니다.");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">트렌드 로딩 중...</div>;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
        🔥 우리 동네 뜨는 맛집 <span className="text-sm font-normal text-slate-500">(벤치마킹)</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trends.map((trend) => (
          <div key={trend.id} onClick={() => openAnalysisModal(trend)} className="group relative rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all cursor-pointer bg-white">
            <div className="aspect-video bg-slate-100 relative">
              <img src={trend.image_url} alt={trend.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />
              <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-slate-700">
                {trend.group_name}
              </span>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-white text-blue-600 px-4 py-2 rounded-full font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all text-sm">
                  🕵️‍♂️ AI 전략실 입장
                </span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-slate-800 line-clamp-1">{trend.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{new Date(trend.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  🕵️‍♂️ AI 마케팅 전략실
                </h3>
                <p className="text-sm text-slate-500">
                  {step === 'INPUT' && "1단계: 분석 대상 설정"}
                  {step === 'ANALYZING' && "2단계: AI 분석 중..."}
                  {step === 'RESULT' && "3단계: 전략 선택 및 실행"}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl px-2">&times;</button>
            </div>

            <div className="p-8 overflow-y-auto bg-slate-50/50 flex-1">
              {step === 'INPUT' && (
                <div className="flex flex-col items-center justify-center py-10 space-y-6">
                  <div className="text-center">
                    <div className="text-5xl mb-4">🏪</div>
                    <h4 className="text-xl font-bold text-slate-800">어떤 가게를 위해 전략을 짤까요?</h4>
                    <p className="text-slate-500 mt-2">입력하신 가게의 특성과 트렌드를 연결해드립니다.</p>
                  </div>
                  <div className="w-full max-w-md">
                    <label className="block text-sm font-bold text-slate-700 mb-2">내 가게 이름 (또는 ID)</label>
                    <input type="text" value={targetStoreInput} onChange={(e) => setTargetStoreInput(e.target.value)} className="w-full p-4 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" autoFocus />
                  </div>
                  <button onClick={handleAnalyzeStart} className="w-full max-w-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">🚀 전략 분석 시작하기</button>
                </div>
              )}

              {step === 'ANALYZING' && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <h4 className="text-xl font-bold text-slate-800 animate-pulse">AI가 데이터를 연결하고 있습니다...</h4>
                </div>
              )}

              {step === 'RESULT' && (
                <div className="grid md:grid-cols-3 gap-5">
                  {strategies.map((strategy, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all flex flex-col h-full relative group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="text-4xl mb-4">{['🎯', '💡', '⚡'][idx]}</div>
                      <h4 className="text-lg font-bold text-slate-800 mb-3 leading-snug">{strategy.title}</h4>
                      <div className="flex-1 overflow-y-auto max-h-[200px] mb-4 pr-2 custom-scrollbar">
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{strategy.content || strategy.description}</p>
                      </div>
                      <button onClick={() => handleCreateBlog(strategy)} className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white mt-auto">
                        ✍️ 이 전략으로 글쓰기
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}