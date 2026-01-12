'use client';

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import TrendSection from '@/components/TrendSection';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ITEMS_PER_PAGE = 24;
// 🔥 [수정] 'review' 탭 추가
type TabType = 'all' | 'store' | 'net' | 'sniper' | 'review';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [inputValue, setInputValue] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [allData, setAllData] = useState<any[]>([]);
  const [displayData, setDisplayData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [groups, setGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const [isBlogLoading, setIsBlogLoading] = useState(false); 
  const [blogData, setBlogData] = useState<any>(null); 
  const [instaData, setInstaData] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<'blog' | 'instagram'>('blog');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [step, setStep] = useState<'INPUT' | 'ANALYZING' | 'RESULT'>('INPUT');
  const [trendConcepts, setTrendConcepts] = useState<any[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [myStoreName, setMyStoreName] = useState("영진횟집");
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkList, setBulkList] = useState("");

  // 🔥 [신규] 리뷰 분석용 State
  const [reviewText, setReviewText] = useState("");
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [isReviewAnalyzing, setIsReviewAnalyzing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let filtered = allData;
    if (activeTab === 'store') filtered = allData.filter(item => item.collection_mode === 'store');
    else if (activeTab === 'net') filtered = allData.filter(item => item.collection_mode === 'net');
    else if (activeTab === 'sniper') filtered = allData.filter(item => item.collection_mode === 'sniper');
    // review 탭은 별도 화면이므로 필터링 필요 없음

    if (activeTab === 'store' && activeGroup) {
      filtered = filtered.filter(item => item.group_name === activeGroup);
    }

    setDisplayData(filtered);
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab, activeGroup, allData]);

  const fetchData = async () => {
    const { data } = await supabase.from("local_data").select("*").order("created_at", { ascending: false });
    if (data) {
      setAllData(data);
      const storeData = data.filter(item => item.collection_mode === 'store');
      const uniqueGroups = Array.from(new Set(storeData.map(item => item.group_name).filter(Boolean)));
      setGroups(uniqueGroups as string[]);
    }
  };

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = displayData.slice(indexOfFirstItem, indexOfLastItem);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(item => item !== id));
    else setSelectedIds(prev => [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return alert("삭제할 항목을 선택해주세요.");
    if (!confirm(`정말 ${selectedIds.length}개의 데이터를 삭제하시겠습니까?`)) return;
    try {
      const { error } = await supabase.from('local_data').delete().in('id', selectedIds);
      if (error) throw error;
      alert("삭제 완료! 🧹");
      fetchData();
    } catch (error: any) { alert(`실패: ${error.message}`); }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === currentItems.length) setSelectedIds([]);
    else setSelectedIds(currentItems.map(item => item.id));
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processSingleUrl = async (url: string, keyword?: string, groupName?: string, collectionMode?: string) => {
    try {
      const response = await fetch("/api/crawl", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, keyword, groupName, collectionMode }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "알 수 없는 오류");
      return { success: true, count: result.count };
    } catch (error: any) { return { success: false, message: error.message }; }
  };

  const filterNewUrlsOnly = async (urls: string[]) => {
    if (urls.length === 0) return { newUrls: [], duplicateCount: 0 };
    const { data: existingItems } = await supabase.from('local_data').select('source_url').in('source_url', urls);
    const existingUrls = new Set(existingItems?.map(item => item.source_url) || []);
    const newUrls = urls.filter(url => !existingUrls.has(url));
    return { newUrls, duplicateCount: urls.length - newUrls.length };
  };

  const handleBulkStart = async () => {
    if (!bulkList.trim()) return alert("수집할 명단을 입력해주세요.");
    const targets = bulkList.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    if (!confirm(`총 ${targets.length}곳의 데이터를 연속으로 수집하시겠습니까?`)) return;
    setIsBulkOpen(false); setIsLoading(true);
    setLogs([`🚀 [대량 수집 모드] 가동! 목표: ${targets.length}곳`]);
    for (let i = 0; i < targets.length; i++) {
      const keyword = targets[i];
      setLogs(prev => [...prev, `\n🔄 [${i + 1}/${targets.length}] "${keyword}" 탐색 시작...`]);
      try {
        const searchRes = await fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: keyword, collectionMode: 'net' }),
        });
        const searchResult = await searchRes.json();
        if (searchResult.success && searchResult.urls.length > 0) {
          const topUrls = searchResult.urls.slice(0, 3);
          for (const url of topUrls) {
             const crawlRes = await processSingleUrl(url, keyword, undefined, 'net');
             if (crawlRes.success) setLogs(prev => [...prev, `   ✅ 수집 성공 (${crawlRes.count}건)`]);
          }
        } else {
          setLogs(prev => [...prev, `   ⚠️ 검색 결과 없음`]);
        }
      } catch (e) {
        setLogs(prev => [...prev, `   ❌ 에러: ${keyword}`]);
      }
      await delay(3000); fetchData();
    }
    setLogs(prev => [...prev, "\n🎉 대량 수집 완료!"]); setIsLoading(false);
  };

  const handleStart = async () => {
    if (activeTab === 'all' || activeTab === 'review') return alert("업체나 그물망 모드를 선택해주세요.");
    if (!inputValue) return alert("검색어를 입력해주세요!");
    setIsLoading(true); setLogs([]); setActiveGroup(null); 
    try {
      if (activeTab === 'sniper') {
        setLogs(["🎯 [스나이퍼 모드] 정밀 분석..."]);
        const res = await processSingleUrl(inputValue, undefined, undefined, 'sniper');
        if (res.success) { setLogs(prev => [...prev, `✅ 완료.`]); setInputValue(""); } 
        else { setLogs(prev => [...prev, `❌ 실패: ${res.message}`]); }
      } 
      else {
        const isStoreMode = activeTab === 'store';
        const collectionMode = isStoreMode ? 'store' : 'net';
        const targetGroup = isStoreMode ? inputValue : undefined;
        setLogs([`${isStoreMode ? '🏢 [업체 모드]' : '🕸️ [그물망 모드]'} "${inputValue}" 검색 중...`]);
        const searchRes = await fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: inputValue, collectionMode: collectionMode }),
        });
        const searchResult = await searchRes.json();
        if (!searchResult.success) throw new Error(searchResult.error);
        const rawUrls = searchResult.urls;
        setLogs(prev => [...prev, `🔎 검색 결과 ${rawUrls.length}개 발견.`]);
        const { newUrls, duplicateCount } = await filterNewUrlsOnly(rawUrls);
        if (duplicateCount > 0) setLogs(prev => [...prev, `🗑️ 이미 수집된 ${duplicateCount}개 제외.`]);
        if (newUrls.length === 0) { setLogs(prev => [...prev, "⚠️ 새로운 문서가 없습니다."]); setIsLoading(false); return; }
        const targetUrls = newUrls.slice(0, 10);
        setLogs(prev => [...prev, `✅ 상위 ${targetUrls.length}개 정밀 수집 시작...`]);
        let successCount = 0;
        for (let i = 0; i < targetUrls.length; i++) {
          const currentUrl = targetUrls[i];
          setLogs(prev => [...prev, `🔄 [${i + 1}/${targetUrls.length}] 분석: ${currentUrl}`]);
          const crawlRes = await processSingleUrl(currentUrl, inputValue, targetGroup, collectionMode);
          if (crawlRes.success) { successCount += crawlRes.count; }
          fetchData(); 
          if (i < targetUrls.length - 1) { await delay(2000); }
        }
        setLogs(prev => [...prev, "🏁 수집 종료."]);
        if (isStoreMode && successCount > 0) setActiveGroup(inputValue);
        setInputValue("");
      }
      fetchData();
    } catch (error: any) { setLogs((prev) => [...prev, `❗ 오류: ${error.message}`]); } finally { setIsLoading(false); }
  };

  // 기존 함수들...
  const openBlogModal = (item: any) => {
    setSelectedItem(item); setBlogData(null); setInstaData(null); setGeneratedImage(null);
    setTrendConcepts([]); setSelectedConcept(null); setIsModalOpen(true); 
    setStep('INPUT'); setMyStoreName("영진횟집");
  };

  const handleAnalyzeItem = async () => {
    if (!myStoreName.trim()) return alert("분석할 가게 이름을 입력해주세요!");
    setStep('ANALYZING');
    try {
      const response = await fetch("/api/trend", { 
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ keyword: selectedItem.title, storeId: myStoreName, location: "강릉" }) 
      });
      const result = await response.json();
      const strategies = result.strategies || result.concepts || [];
      if (strategies.length > 0) { setTrendConcepts(strategies); setStep('RESULT'); } 
      else { alert("전략 수립에 실패했습니다."); setStep('INPUT'); }
    } catch (e) { console.error(e); alert("서버 에러"); setStep('INPUT'); }
  };

  const generateBlog = async () => {
    if (!selectedItem || !selectedConcept) return;
    setIsBlogLoading(true); setBlogData(null); setInstaData(null);
    try {
      const conceptText = selectedConcept.content || selectedConcept.description;
      const response = await fetch("/api/blog", { 
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ storeId: myStoreName, ...selectedItem, topic: selectedConcept.title, concept: conceptText, hook: selectedConcept.hook_message }) 
      });
      const result = await response.json();
      if (result.success) {
        setBlogData(result.blog); setInstaData(result.instagram);
        setGeneratedImage(result.images?.[0] || null); setResultTab('blog');
      } else { alert("생성 실패: " + result.message); }
    } catch (error) { alert("오류 발생"); } finally { setIsBlogLoading(false); }
  };

  const handleCopy = async () => {
    let fullText = "";
    if (resultTab === 'blog' && blogData) fullText = `${blogData.title}\n\n${blogData.content}\n\n${blogData.keywords?.join(' ')}`;
    else if (resultTab === 'instagram' && instaData) fullText = `${instaData.content}\n\n${instaData.hashtags?.join(' ')}`;
    if (!fullText) return;
    try { await navigator.clipboard.writeText(fullText); alert("📋 복사 완료!"); } catch (e) { alert("복사 실패"); }
  };

  // 🔥 [신규] 리뷰 분석 함수
  const handleReviewAnalyze = async () => {
    if (!reviewText.trim()) return alert("리뷰 내용을 붙여넣어 주세요!");
    setIsReviewAnalyzing(true);
    setReviewResult(null);
    try {
        const res = await fetch('/api/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviews: reviewText, storeName: "영진횟집" }) // 상호명은 일단 고정하거나 입력받을 수 있음
        });
        const data = await res.json();
        if (data.success) {
            setReviewResult(data.result);
        } else {
            alert("분석 실패: " + data.error);
        }
    } catch (e) { alert("서버 통신 오류"); }
    finally { setIsReviewAnalyzing(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2">🌊 강릉 AI 데이터 댐 (v9.5)</h1>
          <p className="text-gray-600">방문자 추적 & 대량 자동 수집 엔진</p>
        </header>
        
        {/* 트렌드 섹션 (리뷰 탭 아닐 때만 노출) */}
        {activeTab !== 'review' && (
            <div className="mb-12"><TrendSection storeId="영진횟집" /></div>
        )}

        {/* 탭 버튼들 */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
           <button onClick={() => setActiveTab('all')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'all' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500'}`}>🗂️ 전체</button>
           <button onClick={() => { setActiveTab('store'); setActiveGroup(null); }} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'store' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-500'}`}>🏢 업체</button>
           <button onClick={() => setActiveTab('net')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'net' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-500'}`}>🕸️ 그물망</button>
           <button onClick={() => setActiveTab('sniper')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'sniper' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-500'}`}>🎯 스나이퍼</button>
           
           {/* 🔥 [신규] 리뷰 분석 버튼 */}
           <button onClick={() => setActiveTab('review')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'review' ? 'bg-pink-500 text-white shadow-lg' : 'bg-white text-gray-500'}`}>🗣️ 리뷰 분석</button>
           
           <button onClick={() => setIsBulkOpen(true)} className="px-6 py-3 rounded-xl font-bold bg-green-600 text-white shadow-lg hover:bg-green-700 animate-pulse ml-4">🚀 대량 수집</button>
        </div>

        {/* 🔥 리뷰 분석 화면 */}
        {activeTab === 'review' ? (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-8">
                    <h2 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">🗣️ 민심 감청 시스템 <span className="text-sm font-normal text-slate-500">(Beta)</span></h2>
                    <p className="text-gray-600 mb-6">배달의민족, 네이버 플레이스 리뷰를 복사해서 붙여넣으세요. AI가 3초 만에 분석합니다.</p>
                    
                    <textarea 
                        className="w-full h-40 p-4 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all resize-none text-sm"
                        placeholder="예시)&#13;&#10;맛은 있는데 배달이 너무 늦어요...&#13;&#10;사장님이 친절해요.&#13;&#10;양은 많은데 좀 짜요."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                    />
                    <button 
                        onClick={handleReviewAnalyze}
                        disabled={isReviewAnalyzing}
                        className="w-full mt-4 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                    >
                        {isReviewAnalyzing ? "🧠 AI가 리뷰를 읽고 있습니다..." : "🔎 분석 시작하기"}
                    </button>
                </div>

                {/* 분석 결과 대시보드 */}
                {reviewResult && (
                    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                        {/* 1. 감성 점수 */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-blue-500">
                            <h3 className="text-gray-500 font-bold mb-2">😊 고객 만족도</h3>
                            <div className="flex items-end gap-2">
                                <span className="text-5xl font-black text-slate-800">{reviewResult.sentiment_score}</span>
                                <span className="text-xl font-bold text-gray-400 mb-2">/ 100점</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${reviewResult.sentiment_score}%` }}></div>
                            </div>
                        </div>

                        {/* 2. AI의 조언 */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-red-500">
                            <h3 className="text-gray-500 font-bold mb-2">🚨 사장님 미션</h3>
                            <p className="text-lg font-bold text-slate-800 leading-snug">"{reviewResult.advice}"</p>
                        </div>

                        {/* 3. 3줄 요약 */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg md:col-span-2">
                            <h3 className="text-gray-500 font-bold mb-4">📝 3줄 요약</h3>
                            <ul className="space-y-2">
                                {reviewResult.summary.map((line: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-700 font-medium">
                                        <span className="text-green-500">✔</span> {line}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 4. 베스트/워스트 키워드 */}
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                            <h3 className="text-green-700 font-bold mb-3">👍 칭찬 키워드</h3>
                            <div className="flex flex-wrap gap-2">
                                {reviewResult.best_keywords.map((k: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-white text-green-700 rounded-full font-bold shadow-sm text-sm">#{k}</span>
                                ))}
                            </div>
                        </div>

                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                            <h3 className="text-red-700 font-bold mb-3">👎 불만 키워드</h3>
                            <div className="flex flex-wrap gap-2">
                                {reviewResult.worst_keywords.map((k: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-white text-red-700 rounded-full font-bold shadow-sm text-sm">#{k}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <>
            {/* 기존 화면들 (전체, 업체, 그물망 등) */}
            {activeTab === 'store' && groups.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 mb-4 justify-center">
                    <button onClick={() => setActiveGroup(null)} className={`px-4 py-2 rounded-full font-bold transition-all ${activeGroup === null ? 'bg-orange-600 text-white' : 'bg-white border text-gray-600'}`}>📂 전체보기</button>
                    {groups.map((group) => (
                    <button key={group} onClick={() => setActiveGroup(group)} className={`px-4 py-2 rounded-full font-bold border transition-all ${activeGroup === group ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-gray-600'}`}>📁 {group}</button>
                    ))}
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-gray-100 max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row gap-3">
                    <input type="text" placeholder="상호명이나 키워드 입력" className="flex-1 p-4 border rounded-xl text-lg outline-none focus:ring-2 focus:ring-blue-500" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isLoading} onKeyDown={(e) => e.key === 'Enter' && handleStart()} />
                    <button onClick={handleStart} disabled={isLoading} className={`px-8 py-4 rounded-xl font-bold text-white shadow-md transition-all ${isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>{isLoading ? "작동 중..." : "데이터 수집"}</button>
                </div>
                {logs.length > 0 && <div className="mt-6 p-5 bg-gray-900 text-green-400 rounded-xl text-sm font-mono h-40 overflow-y-auto shadow-inner">{logs.map((log, i) => (<div key={i}>{log}</div>))}</div>}
            </div>

            <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="selectAll" checked={currentItems.length > 0 && selectedIds.length === currentItems.length} onChange={handleSelectAll} className="w-5 h-5 accent-blue-600" />
                    <label htmlFor="selectAll" className="text-gray-600 font-bold cursor-pointer">전체 선택</label>
                </div>
                {selectedIds.length > 0 && <button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold">🗑️ 선택 삭제 ({selectedIds.length})</button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {currentItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden group relative">
                <div className="absolute top-3 left-3 z-10"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="w-6 h-6 accent-blue-600" /></div>
                <div className="h-56 bg-gray-100 relative">
                    <img src={item.image_url || 'https://placehold.co/600x400/png?text=No+Image'} alt={item.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/png?text=Image+Load+Fail'; }} />
                    <div className="absolute top-3 right-3"><span className="bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-bold">{item.category}</span></div>
                </div>
                <div className="p-6">
                    <h3 className="text-lg font-bold mb-2 line-clamp-1">{item.title}</h3>
                    <p className="text-gray-500 text-xs mb-4 line-clamp-2 h-8">{item.content}</p>
                    <div className="flex justify-between items-center pt-4 border-t">
                        <a href={item.source_url} target="_blank" className="text-gray-400 text-[10px] hover:text-blue-500 transition-colors">원본 보기 ↗</a>
                        <button onClick={() => openBlogModal(item)} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs transition-colors">🚀 마케팅 전략</button>
                    </div>
                </div>
                </div>
            ))}
            </div>
            </>
        )}

      </div>

      {isBulkOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">🚀 핫플 대량 수집기</h3>
            <textarea className="w-full h-64 p-4 border rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" placeholder={`예시:\n강릉 교동반점...`} value={bulkList} onChange={(e) => setBulkList(e.target.value)} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsBulkOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">취소</button>
              <button onClick={handleBulkStart} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg">가동 시작!</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col p-8 overflow-hidden shadow-2xl">
            <header className="mb-6 flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900">🕵️‍♂️ AI 마케팅 전략실</h3>
                <p className="text-gray-500 text-sm mt-1">{step === 'INPUT' && "1단계: 분석 대상 설정"} {step === 'ANALYZING' && "2단계: AI 분석 중..."} {step === 'RESULT' && "3단계: 전략 선택 및 실행"}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black text-3xl">&times;</button>
            </header>

            {!blogData ? (
              <div className="flex-1 overflow-y-auto pr-2">
                {step === 'INPUT' && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-6">
                        <div className="text-center">
                            <div className="text-5xl mb-4">🏪</div>
                            <h4 className="text-xl font-bold text-slate-800">어떤 가게를 위해 전략을 짤까요?</h4>
                            <p className="text-slate-500 mt-2">"{selectedItem?.title}"의 데이터를 분석하여 적용해드립니다.</p>
                        </div>
                        <div className="w-full max-w-md">
                            <label className="block text-sm font-bold text-slate-700 mb-2">내 가게 이름 (또는 ID)</label>
                            <input type="text" value={myStoreName} onChange={(e) => setMyStoreName(e.target.value)} className="w-full p-4 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" autoFocus />
                        </div>
                        <button onClick={handleAnalyzeItem} className="w-full max-w-md bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">🚀 전략 분석 시작하기</button>
                    </div>
                )}
                
                {step === 'ANALYZING' && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-bold italic animate-pulse">전략 수립 중...</p>
                  </div>
                )}

                {step === 'RESULT' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {trendConcepts && trendConcepts.length > 0 ? (
                        trendConcepts.map((c, i) => (
                            <button key={i} onClick={() => setSelectedConcept(c)} className={`p-6 border-2 rounded-2xl text-left transition-all ${selectedConcept === c ? 'border-blue-600 bg-blue-50 shadow-md scale-[1.02]' : 'border-gray-100 hover:border-blue-200 bg-gray-50'}`}>
                            <div className="text-2xl mb-3">{i === 0 ? '🎯' : i === 1 ? '🔥' : '⚡'}</div>
                            <h4 className="font-black text-gray-900 mb-2 leading-tight h-12 line-clamp-2">{c.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-4">{c.content || c.description}</p>
                            {selectedConcept === c && <div className="mt-4 text-[10px] text-blue-600 font-bold uppercase tracking-widest">Selected</div>}
                            </button>
                        ))
                        ) : (
                        <div className="col-span-3 text-center text-gray-500 py-10">전략을 불러오지 못했습니다. 다시 시도해주세요.</div>
                        )}
                    </div>
                    <div className="mt-10">
                        <button onClick={generateBlog} disabled={!selectedConcept || isBlogLoading} className={`w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all ${!selectedConcept ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}>
                        {isBlogLoading ? "✍️ 블로그와 인스타 원고를 동시에 작성 중..." : "이 전략으로 글쓰기 시작 🚀"}
                        </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setResultTab('blog')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${resultTab === 'blog' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>🟢 네이버 블로그</button>
                    <button onClick={() => setResultTab('instagram')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${resultTab === 'instagram' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>🟣 인스타그램</button>
                </div>

                <div className="flex justify-between items-center mb-4 bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                    <span className="text-sm font-bold text-yellow-800">✨ 글이 완성되었습니다!</span>
                    <button onClick={handleCopy} className="bg-white text-slate-800 border border-slate-300 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 shadow-sm text-sm flex items-center gap-2">
                        📋 {resultTab === 'blog' ? '블로그' : '인스타'} 복사
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-white p-6 rounded-2xl border border-dashed border-gray-300 shadow-inner">
                    {generatedImage && (
                        <div className="mb-6 rounded-xl overflow-hidden shadow-lg border border-gray-100">
                            <img src={generatedImage} alt="AI Generated" className="w-full h-64 object-cover" />
                        </div>
                    )}
                    {resultTab === 'blog' && blogData && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6 text-slate-900 border-b pb-4">{blogData.title}</h2>
                            <div className="whitespace-pre-wrap text-slate-800 leading-relaxed font-serif text-lg">{blogData.content}</div>
                            <div className="mt-8 text-blue-600 font-bold">{blogData.keywords?.join(" ")}</div>
                        </div>
                    )}
                    {resultTab === 'instagram' && instaData && (
                        <div>
                            <div className="whitespace-pre-wrap text-slate-800 leading-relaxed text-lg">{instaData.content}</div>
                            <div className="mt-8 text-purple-600 font-bold">{instaData.hashtags?.join(" ")}</div>
                        </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}