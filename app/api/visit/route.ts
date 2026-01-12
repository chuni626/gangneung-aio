import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { store_id, url } = await req.json();
    const decodedStoreId = decodeURIComponent(store_id);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 방문 기록 저장 (누가, 언제, 어디를 봤는지)
    const { error } = await supabase
      .from('page_views')
      .insert([{ store_id: decodedStoreId, url }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}