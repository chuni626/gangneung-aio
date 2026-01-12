import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';

// 1. Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. Next.js 15 최신 버전에 맞춘 타입 정의 (Promise 필수)
type Props = {
  params: Promise<{ store_id: string }>;
};

// 3. 메타데이터 생성 (SEO) - 검색엔진 노출용
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const storeId = decodeURIComponent(params.store_id);

  // 메타데이터에서도 최신 정보 1개만 가져오기
  const { data: store } = await supabase
    .from('gangneung_stores')
    .select('raw_info')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const description = store?.raw_info 
    ? `${storeId} 소식: ${store.raw_info.slice(0, 50)}...`
    : `${storeId}의 실시간 정보를 데이터 댐에서 확인하세요.`;

  return {
    title: `${storeId} | 강릉 AI 데이터 댐`,
    description: description,
  };
}

// 4. 메인 페이지 컴포넌트
export default async function PublicStorePage(props: Props) {
  // 🟢 [중요] 주소창의 파라미터 상자를 먼저 엽니다.
  const params = await props.params;
  const storeId = decodeURIComponent(params.store_id);

  console.log("✅ ID 해독 완료:", storeId);

  // 🛠️ [핵심 수정] 중복 데이터 방어 로직 적용!
  // .order -> 최신순 정렬
  // .limit(1) -> 무조건 1개만 가져옴 (중복 에러 해결)
  const { data: store, error } = await supabase
    .from('gangneung_stores')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false }) 
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ DB 에러:", error.message);
  }

  // 데이터가 없을 때를 대비한 기본 멘트
  const latestNews = store?.raw_info || "현재 등록된 실시간 소식이 없습니다.";
  const updateTime = store?.created_at
    ? new Date(store.created_at).toLocaleString('ko-KR')
    : "업데이트 대기 중";

  // AI 로봇용 구조화 데이터 (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": storeId,
    "description": latestNews,
    "url": `https://gangneung-aio.vercel.app/store/${storeId}`,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://gangneung-aio.vercel.app/store/${storeId}`
    },
    "provider": {
      "@type": "Organization",
      "name": "강릉 AI 데이터 댐"
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* 🤖 화면엔 안 보이지만 AI는 읽어가는 데이터 */}
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
          <p className="text-slate-500 font-medium">
            강릉 AI 데이터 댐 공식 인증 파트너
          </p>
        </header>

        <section className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            📢 AI 실시간 브리핑
          </h2>
          <div className="text-slate-700 leading-relaxed text-lg break-keep">
            "{latestNews}"
          </div>
          <p className="text-xs text-slate-400 mt-6 text-right">
            최종 업데이트: {updateTime}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-4 mt-8">
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

        <footer className="mt-20 border-t border-slate-100 pt-8 text-center text-slate-400 text-sm">
          <p>© 2026 Gangneung AI Data Dam Project. All Data Reserved.</p>
        </footer>
      </main>
    </div>
  );
}