import FirecrawlApp from '@mendable/firecrawl-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { storeName, location } = await req.json();
    const query = `${location} ${storeName} 후기 리뷰`;

    console.log(`\n🏥 [진단 모드] "${query}" 분석 시작...`);

    const apiKey = process.env.FIRECRAWL_API_KEY;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const firecrawl = new FirecrawlApp({ apiKey: apiKey });

    // 1. 검색 (상위 30개만 빠르게 확인)
    const searchResponse = await firecrawl.search(query, { limit: 30 });
    const searchResults = (searchResponse as any).data || (searchResponse as any).web || [];

    // 2. 검색 결과 분석 (가게 이름이 제목/내용에 얼마나 포함되었는가?)
    const mentionCount = searchResults.length;
    
    // 3. AI에게 성적표 작성 요청
    // 검색된 데이터의 요약본을 AI에게 던져줍니다.
    const contextData = JSON.stringify(searchResults.map((item: any) => ({
      title: item.title,
      desc: item.description,
      url: item.url
    })));

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const prompt = `
      너는 'AI 검색 최적화(GEO) 컨설턴트'야.
      클라이언트 가게 이름: "${storeName}" (${location})
      
      아래는 검색 엔진(구글/빙)에서 이 가게를 검색했을 때 나오는 상위 30개 결과 데이터야.
      이 데이터를 바탕으로 냉정하게 진단 보고서를 작성해줘.

      **데이터:**
      ${contextData}

      **작성 양식 (JSON):**
      {
        "score": 0~100 사이 숫자 (노출이 많고 정확할수록 고득점, 결과가 없으면 0점),
        "rank_status": "검색 결과 ${mentionCount}건 발견됨 (상위권 노출 상태)",
        "summary": "한줄 요약 (예: 네이버 블로그 리뷰는 많으나 최신 글이 부족합니다.)",
        "details": [
          "분석 내용 1 (장점)",
          "분석 내용 2 (단점/문제점)",
          "분석 내용 3 (AI가 인식하는 가게 이미지)"
        ],
        "solution": "구체적인 해결 방안 1가지 (예: '강릉 붕어빵 맛집' 키워드로 블로그 3개 배포 시급)"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    
    // JSON 파싱
    let report;
    try {
      const cleanText = responseText.replace(/```json|```/g, "").trim();
      report = JSON.parse(cleanText);
    } catch (e) {
      report = { 
        score: 0, 
        rank_status: "분석 실패", 
        summary: "AI가 데이터를 분석하지 못했습니다.", 
        details: [], 
        solution: "다시 시도해주세요." 
      };
    }

    console.log(`✅ 진단 완료: 점수 ${report.score}점`);
    return NextResponse.json({ success: true, report });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}