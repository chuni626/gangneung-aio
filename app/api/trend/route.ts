import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js'; // DB 접속 도구 추가

export async function POST(request: Request) {
  try {
    const { keyword, storeId, location } = await request.json(); 

    // 1. Supabase(DB) 접속 준비
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log(`🕵️‍♂️ [전략 수립] 트렌드: ${keyword} <-> 내 가게: ${storeId}`);

    // 🔥 [핵심] 사장님이 대시보드에 등록한 '실시간 매장 소식'을 긁어옵니다.
    // (가장 최근에 등록한 소식 3개를 가져와서 AI에게 먹입니다)
    const { data: storeInfo } = await supabase
      .from('gangneung_stores')
      .select('raw_info, store_name')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(3);

    // DB에서 가져온 정보 합치기
    const myStoreNews = storeInfo?.map(s => s.raw_info).join(', ') || "특별한 소식 없음 (기본 메뉴 위주로 홍보)";
    console.log(`📂 [DB 조회] 가게 장부 확인: "${myStoreNews}"`);

    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // 🔥 [프롬프트 업그레이드] DB 정보를 전략에 반영하라고 지시
    const prompt = `
      당신은 대한민국 최고의 '자영업 컨설턴트'입니다.
      
      [분석 대상]
      1. 벤치마킹 타겟(트렌드): "${keyword}"
      2. 의뢰인 가게: "${storeId}"
      3. **🚨 가게 내부 기밀 정보(필수 반영):** "${myStoreNews}"
      
      [임무]
      트렌드("${keyword}")의 손님들을 우리 가게("${storeId}")로 끌어올 전략 3가지를 제안하세요.
      **단, 반드시 '가게 내부 기밀 정보'(오늘의 메뉴, 할인 행사 등)를 전략의 핵심 무기로 사용해야 합니다.**

      [작성 예시]
      - 만약 기밀 정보가 '대방어 입고'라면 -> "만동제과 빵 먹고 느끼하다면? 오늘 막 들어온 '대방어'로 입가심하세요!"
      
      [출력 형식 - JSON Only]
      {
        "strategies": [
          {
            "title": "전략 제목 (이모지 포함)",
            "content": "구체적인 실행 방안. 가게의 정보(${myStoreNews || storeId})를 구체적으로 언급할 것.",
            "hook_message": "인스타/블로그용 자극적인 한 줄 홍보 멘트"
          },
          ... (3개)
        ]
      }
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const data = JSON.parse(text);

    return NextResponse.json({ success: true, strategies: data.strategies });

  } catch (error: any) {
    console.error("❌ 전략 수립 실패:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}