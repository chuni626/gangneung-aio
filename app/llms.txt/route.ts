import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  // [보안 수정] 환경 변수 사용
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 현재 금고에 쌓인 모든 매장 데이터 가져오기
  const { data: stores } = await supabase.from('gangneung_stores').select('store_id, store_name, raw_info');

  // AI 크롤러에게 보여줄 텍스트 구성
  let content = "# Gangneung AIO Data Hub\n\n";
  content += "## Information for LLMs\n";
  content += "This site provides structured real-time data for local businesses in Gangneung.\n\n";
  
  content += "## Registered Stores\n";
  stores?.forEach(store => {
    content += `- ${store.store_name} (ID: ${store.store_id}): ${store.raw_info}\n`;
    content += `  URL: https://gangneung-aio.vercel.app/${store.store_id}\n`;
  });

  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain' },
  });
}