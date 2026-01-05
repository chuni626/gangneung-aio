'use client';
import { useState, use, useRef } from 'react';
import { analyzeAndSave, generateMonthlyReport, createBlogPost } from '../actions';

export default function AdminPage({ params }: { params: Promise<{ store_id: string }> }) {
  const resolvedParams = use(params);
  const store_id = resolvedParams.store_id;

  const [info, setInfo] = useState('');
  const [blogTopic, setBlogTopic] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]); 
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [blogLoading, setBlogLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ⚡️ [핵심] 이미지 초고속 압축 함수 (용량 1/10로 줄이기)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // 가로 최대 800px로 제한 (충분함)
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // JPEG 포맷, 품질 0.6 (60%)으로 압축 -> 용량 확 줄어듦
          resolve(canvas.toDataURL('image/jpeg', 0.6)); 
        };
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await analyzeAndSave(info, store_id);
    setLoading(false);
    if (res.success) { alert("✅ 성공! 데이터가 반영되었습니다."); setInfo(''); }
    else alert("❌ 실패: " + res.message);
  };

  const handleGetReport = async () => {
    setReportLoading(true);
    const res = await generateMonthlyReport(store_id);
    setReportLoading(false);
    if (res.success) setReport(res.report!);
  };

  // 📸 다중 이미지 선택 처리 (압축 적용)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // 로딩 표시 같은게 없으니 일단 멈춤 느낌이 날 수 있어서 로그 찍음
      console.log("이미지 압축 시작..."); 
      
      const compressedImages: string[] = [];
      
      // 모든 파일을 압축해서 배열에 담음
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        compressedImages.push(compressed);
      }

      // 상태 업데이트
      setSelectedImages(prev => [...prev, ...compressedImages].slice(0, 10));
    }
  };
  
  const clearImages = () => {
    setSelectedImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateBlog = async () => {
    const imgCount = selectedImages.length;
    if (!confirm(`AI 작가에게 ${imgCount > 0 ? imgCount + '장의 사진과 함께' : ''} 글쓰기를 시키겠습니까?\n(AI 분석에는 약 10~15초가 소요됩니다)`)) return;
    
    setBlogLoading(true);
    
    // 압축된 이미지를 전송하므로 훨씬 빠름
    const res = await createBlogPost(store_id, blogTopic, selectedImages.length > 0 ? selectedImages : undefined);
    
    setBlogLoading(false);
    
    if (res.success) {
      alert(`🎉 블로그 발행 완료!\n\n제목: ${res.title}\n\n[블로그 게시판]에서 확인해보세요.`);
      setBlogTopic('');
      clearImages(); 
    } else {
      alert("❌ 실패: " + res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans text-slate-800">
      <div className="max-w-2xl mx-auto space-y-8">
        
         <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h1 className="text-xl font-extrabold mb-4 text-slate-800">ADMIN <span className="text-blue-600">#{store_id}</span></h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={info} onChange={(e) => setInfo(e.target.value)}
              className="w-full h-24 p-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="오늘의 소식 (예: 대방어 입고)"
            />
            <button disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-300">
              {loading ? 'AI 처리 중...' : '실시간 반영'}
            </button>
          </form>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-3xl shadow-lg text-white">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            📸 AI 블로그 작가 <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full uppercase">Speed-Vision</span>
          </h2>
          <p className="text-purple-100 text-sm mb-6 opacity-90">
            사진을 여러 장 선택해주세요. (자동 압축 전송)
          </p>

          <div className="space-y-4">
            <input 
              type="text" 
              value={blogTopic} onChange={(e) => setBlogTopic(e.target.value)}
              className="w-full p-4 rounded-xl text-black outline-none border-none shadow-inner"
              placeholder="글 주제 (예: 회식 메뉴 풀코스)"
            />
            
            <div className="flex gap-2">
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`px-4 py-4 rounded-xl font-bold transition-all border border-white/30 ${selectedImages.length > 0 ? 'bg-green-500 text-white border-none' : 'bg-white/20 hover:bg-white/30'}`}
              >
                {selectedImages.length > 0 ? `✅ ${selectedImages.length}장` : "📸 사진 추가"}
              </button>
              
               {selectedImages.length > 0 && (
                  <button onClick={clearImages} className="px-3 py-4 bg-red-500/80 text-white rounded-xl font-bold hover:bg-red-500">
                    삭제
                  </button>
                )}

              <button 
                onClick={handleCreateBlog} disabled={blogLoading}
                className="flex-1 px-6 py-4 bg-white text-purple-700 rounded-xl font-black hover:bg-gray-100 disabled:bg-gray-300 transition-all shadow-lg"
              >
                {blogLoading ? `분석 중...` : '글쓰기 🚀'}
              </button>
            </div>

            {selectedImages.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2 animate-fade-in">
                {selectedImages.map((imgSrc, index) => (
                  <img key={index} src={imgSrc} alt={`Preview ${index}`} className="h-24 w-24 rounded-xl object-cover border-2 border-white/50 shadow-md shrink-0" />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 p-5 flex justify-between items-center text-white">
            <span className="font-bold text-sm">월간 마케팅 진단서</span>
            <button onClick={handleGetReport} disabled={reportLoading} className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">
              {reportLoading ? '분석 중...' : '발급 받기'}
            </button>
          </div>
          {report && <div className="p-8 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{report}</div>}
        </div>
      </div>
    </div>
  );
}