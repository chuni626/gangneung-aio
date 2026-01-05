// app/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-black text-slate-900 mb-4">
        🌊 강릉 AI 데이터 댐 <span className="text-blue-600">AIO</span>
      </h1>
      <p className="text-slate-600 mb-8 max-w-md leading-relaxed">
        2026 강릉 ITS 세계총회를 위한 로컬 데이터 허브입니다. 
        AI 로봇들이 실시간으로 강릉의 진실된 정보를 수집하고 있습니다.
      </p>
      <div className="flex gap-4">
        <a href="/youngjin/blog" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">
          영진횟집 블로그 보기
        </a>
        <a href="/llms.txt" className="px-6 py-3 bg-white text-slate-800 border rounded-xl font-bold shadow-sm">
          AI 전용 데이터(LLMs)
        </a>
      </div>
      <footer className="mt-20 text-slate-400 text-xs">
        © 2026 Gangneung Data Hub Project
      </footer>
    </div>
  );
}