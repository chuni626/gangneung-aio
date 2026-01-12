import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🔍 타입 설정 (Promise로 들어오는 것을 명시)
type Props = {
  params: Promise<{ store_id: string }>;
};

// 1. 메타데이터 생성 부분 수정
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // 🚨 여기서 await로 상자를 먼저 엽니다!
  const { store_id } = await params;
  const decodedId = decodeURIComponent(store_id);
  
  return {
    title: `${decodedId} | 강릉 AI 데이터 댐`,
    description: `${decodedId} 매장 정보를 확인하세요.`
  }
}

// 2. 메인 페이지 부분 수정
export default async function PublicStorePage({ params }: Props) {
  // 🚨 여기서도 await로 상자를 먼저 엽니다! (가장 중요)
  const { store_id } = await params;
  const storeId = decodeURIComponent(store_id);

  console.log("✅ 주소창 ID 확인:", storeId); // 터미널 확인용

  // DB 조회
  const { data: store, error } = await supabase
    .from('gangneung_stores')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) console.error("❌ DB 조회 에러:", error.message);

  const latestNews = store?.raw_info || "현재 등록된 실시간 소식이 없습니다.";
  const updateTime = store?.created_at 
    ? new Date(store.created_at).toLocaleString('ko-KR') 
    : "업데이트 대기 중";

  // 🤖 JSON-LD 데이터 (수정됨)
  // params.store_id 대신 아까 꺼낸 storeId 변수를 씁니다.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": storeId,
    "description": latestNews,
    "url": `https://gangneung-aio.vercel.app/store/${storeId}`, // 👈 여기가 문제였음! 수정 완료
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://gangneung-aio.vercel.app/store/${storeId}` // 👈 여기도 수정 완료
    },
    "provider": {
        "@type": "Organization",
        "name": "강릉 AI 데이터 댐 (Gangneung AI Data Dam)"
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <main className="max-w-3xl mx-auto p-6 md:p-12">
        <header className="border-b border-slate-200 pb-6 mb-8">
          <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">
            AI Verified ✅
          </span>
          
          <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight break-all">
            {storeId}
          </h1>
          <p className="text-slate-500 font-medium">강릉 AI 데이터 댐 공식 인증 파트너</p>
        </header>

        <section className="space-y-8">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              📢 AI가 전하는 실시간 브리핑
            </h2>
            <div className="prose prose-lg text-slate-700 leading-relaxed break-keep">
              "{latestNews}"
            </div>
            <p className="text-xs text-slate-400 mt-6 text-right font-medium">
              최종 업데이트: {updateTime}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-100 rounded-2xl p-6 text-center">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-xs font-bold text-slate-400 uppercase">AI Bot Access</p>
              <p className="font-black text-green-600">Allowed</p>
            </div>
            <div className="border border-slate-100 rounded-2xl p-6 text-center">
              <div className="text-2xl mb-2">🌍</div>
              <p className="text-xs font-bold text-slate-400 uppercase">Global Exposure</p>
              <p className="font-black text-blue-600">Active</p>
            </div>
          </div>
        </section>

        <footer className="mt-20 border-t border-slate-100 pt-8 text-center text-slate-400 text-sm">
          <p>© 2026 Gangneung AI Data Dam Project. All Data Reserved.</p>
        </footer>
      </main>
    </div>
  );
}