import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { reviews, storeName } = await request.json();

    console.log(`🕵️‍♂️ [리뷰 분석 요청] 가게: ${storeName}, 리뷰 길이: ${reviews.length}자`);

    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const prompt = `
      당신은 '백종원'급의 예리한 '식당 컨설턴트'입니다.
      아래는 '${storeName}'의 최근 고객 리뷰들입니다. 냉철하게 분석하세요.

      [리뷰 데이터]
      ${reviews}

      [임무]
      1. **감성 분석**: 긍정 vs 부정 비율을 계산하세요.
      2. **키워드 추출**: 손님들이 가장 많이 언급하는 칭찬(Best)과 불만(Worst) 키워드를 3개씩 뽑으세요.
      3. **3줄 요약**: 현재 매장의 상황을 3줄로 요약하세요.
      4. **액션 플랜**: 당장 사장님이 고쳐야 할 점이나 강화해야 할 점을 1가지 명령조로 조언하세요.

      [출력 포맷 (JSON Only)]
      {
        "sentiment_score": 80, // (0~100점, 높을수록 긍정)
        "summary": ["요약1", "요약2", "요약3"],
        "best_keywords": ["맛", "친절", "뷰"],
        "worst_keywords": ["주차", "대기시간", "가격"],
        "advice": "주차 공간이 협소하다는 불만이 반복됩니다. 발렛 파킹 제휴를 알아보거나 인근 공영주차장 약도를 문자로 보내세요."
      }
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const data = JSON.parse(text);

    return NextResponse.json({ success: true, result: data });

  } catch (error: any) {
    console.error("❌ 리뷰 분석 실패:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}