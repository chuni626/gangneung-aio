// app/llms.txt/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    "https://lmbiklnpcaltrkarqhmg.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYmlrbG5wY2FsdHJrYXJxaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMjk5MDMsImV4cCI6MjA4MjkwNTkwM30.QyVa1fjB-JyGhcvv4OPpvaziICOOO6_Fey4fPJKvugc"
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
    content += `  URL: https://사장님의-주소.vercel.app/${store.store_id}\n`;
  });

  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain' },
  });
}