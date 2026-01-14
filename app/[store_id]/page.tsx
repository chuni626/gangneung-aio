import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StorePage({ params }: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await params; 
  
  // [보안 수정] 환경 변수 사용
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: news } = await supabase
    .from('gangneung_stores')
    .select('*')
    .eq('store_id', store_id)
    .order('created_at', { ascending: false }) // 날짜순 정렬
    .limit(1)
    .maybeSingle();

  if (!news) return <div className="p-20 text-center text-slate-300 font-bold tracking-widest uppercase">Preparing {store_id} News...</div>;

  return (
    <main className="min-h-screen bg-white text-black py-24 px-6 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(news.ai_structured_data) }} />
      <div className="max-w-2xl mx-auto text-center space-y-12">
        <h1 className="text-6xl font-black tracking-tighter text-slate-900 drop-shadow-sm">{news.store_name}</h1>
        <div className="py-24 px-12 bg-slate-50 rounded-[60px] border border-slate-100 shadow-inner">
          <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-8">Latest AI Update</p>
          <h2 className="text-4xl font-bold leading-tight break-keep text-slate-800">"{news.raw_info}"</h2>
          <p className="text-slate-400 text-xs mt-12 font-medium italic opacity-70">
            Updated at: {new Date(news.created_at).toLocaleString('ko-KR')}
          </p>
        </div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] pt-10">
          Powered by GANGNEUNG AIO Platform Service
        </p>
      </div>
    </main>
  );
}