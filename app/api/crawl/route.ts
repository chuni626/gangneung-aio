import FirecrawlApp from '@mendable/firecrawl-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 🤖 사용할 AI 모델 후보군 (성능 좋은 순)
const MODEL_CANDIDATES = [
  "gemini-2.0-flash-exp", 
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest"
];

// 🛠️ 1. JSON 파싱 헬퍼 함수
function extractAndParseJSON(text: string) {
  try {
    let cleanText = text.replace(/```json|```/g, "").trim();
    const firstSquare = cleanText.indexOf('[');
    const firstCurly = cleanText.indexOf('{');
    let startIndex = -1;
    let endIndex = -1;

    if (firstSquare !== -1 && (firstSquare < firstCurly || firstCurly === -1)) {
      startIndex = firstSquare;
      endIndex = cleanText.lastIndexOf(']');
    } else if (firstCurly !== -1) {
      startIndex = firstCurly;
      endIndex = cleanText.lastIndexOf('}');
    }

    if (startIndex === -1 || endIndex === -1) throw new Error("JSON 괄호 찾기 실패");
    const jsonStr = cleanText.substring(startIndex, endIndex + 1);
    return JSON.parse(jsonStr);
  } catch (e: any) {
    throw new Error(`JSON 파싱 오류: ${e.message}`);
  }
}

// 🛠️ 2. 네이버 PC 주소를 모바일 주소로 변환
function convertToMobileNaverUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('blog.naver.com')) {
      const blogId = urlObj.searchParams.get('blogId');
      const logNo = urlObj.searchParams.get('logNo');
      if (blogId && logNo) return `https://m.blog.naver.com/${blogId}/${logNo}`;
      
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) return `https://m.blog.naver.com/${pathParts[0]}/${pathParts[1]}`;
    }
    return url;
  } catch (e) {
    return url;
  }
}

export async function POST(req: Request) {
  try {
    // 🕵️‍♂️ [탐정 모드 1] 요청 시작 알림
    console.log("🕵️‍♂️ [디버깅 시작] 수집 요청이 들어왔습니다.");

    // 🕵️‍♂️ [탐정 모드 2] 환경변수 검사 (여기가 핵심!)
    // 보안을 위해 키의 앞 4글자만 로그에 찍어봅니다.
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    console.log(`🔑 Firecrawl 키 상태: ${firecrawlKey ? `✅ 있음 (앞자리: ${firecrawlKey.slice(0,4)}...)` : "❌ 없음 (NULL) - 원인 발견!"}`);
    console.log(`🔑 Gemini 키 상태: ${geminiKey ? "✅ 있음" : "❌ 없음"}`);

    // 키가 없으면 바로 에러를 뱉어서 알려줌
    if (!firecrawlKey) {
        return NextResponse.json({ error: "❌ 서버 에러: Firecrawl 키가 환경변수에 없습니다. Vercel 설정을 확인하세요." }, { status: 500 });
    }

    // ✅ storeId 추가: 관리자 대시보드에서 보낸 ID도 받습니다.
    const { url, keyword, groupName, collectionMode, storeId } = await req.json();
    
    if (!url) return NextResponse.json({ error: 'URL 없음' }, { status: 400 });

    console.log(`📥 요청 URL: ${url}, 매장ID: ${storeId}`);

    // URL 정리 (Markdown 링크 등 제거)
    let originalUrl = url.trim();
    if (originalUrl.includes('](')) {
       const match = originalUrl.match(/\((https?:\/\/[^\)]+)\)/);
       if (match) originalUrl = match[1];
    }

    // 모바일 주소로 변환
    const targetUrl = convertToMobileNaverUrl(originalUrl);
    console.log(`🚀 [가동] 변환된 타겟 URL: ${targetUrl}`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
    
    // 🔍 중복 검사
    if (!storeId) {
        const { data: existingUrl } = await supabase
        .from('local_data')
        .select('id')
        .or(`source_url.eq.${originalUrl},source_url.eq.${targetUrl}`)
        .maybeSingle();

        if (existingUrl) {
            console.log(`⚠️ [중복 URL] 이미 수집된 데이터입니다.`);
            return NextResponse.json({ success: true, count: 0, message: "URL Duplicate" });
        }
    }

    // 🔥 Firecrawl 초기화 (위에서 키 검사를 했으므로 안전함)
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
    const genAI = new GoogleGenerativeAI(geminiKey || "");

    console.log('1️⃣ 데이터 수집 중 (Firecrawl)...');
    
    const scrapeResult = await firecrawl.scrape(targetUrl, { formats: ['markdown'] }) as any;
    const rawMarkdown = scrapeResult.data?.markdown || scrapeResult.markdown;
    
    if (!rawMarkdown || rawMarkdown.length < 50) {
       console.log('⚠️ 본문 내용 부족');
       return NextResponse.json({ success: true, count: 0, data: [] });
    }

    console.log('2️⃣ AI 정밀 분석 (이미지 검증 및 요약)...');
    let aiText = '';

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
          너는 '강릉 로컬 콘텐츠 분석관'이야.
          사용자 타겟: "${keyword || storeId || '강릉 여행'}"
          
          **미션:** Markdown 본문에서 **가게 업종에 딱 맞는 베스트 사진 1장**을 찾고 내용을 요약해라.
          
          **[선택 기준]**
          - 맛집: 메인 음식 클로즈업.
          - 카페: 음료/디저트/감성 인테리어.
          - 숙박: 객실/전경.
          
          **[제외]** 지도, 메뉴판, 흐릿한 사진, 블로그 썸네일(글자 포함된 것).

          **🚨 결과 보고 (JSON):**
          - image_url: 찾은 이미지 주소 (없으면 null)
          - reason: **(매우 중요)** 이미지를 선택한 이유 또는 **실패했다면 그 구체적인 사유**를 한글로 적어라.
          
          **반환 형식 (JSON 배열):**
          [
            { 
              "title": "${keyword || storeId || '정보'}", 
              "content": "가게 특징, 메뉴, 분위기 등을 3줄 내외로 매력적으로 요약", 
              "category": "맛집",
              "image_url": "https://...",
              "reason": "선택/탈락 사유" 
            }
          ]

          데이터: ${rawMarkdown.slice(0, 30000)}
        `;

        const result = await model.generateContent(prompt);
        aiText = await result.response.text();
        if (aiText) break;
      } catch (e) { continue; }
    }

    if (!aiText) throw new Error('AI 분석 실패');

    let parsedData = extractAndParseJSON(aiText);
    if (!Array.isArray(parsedData)) parsedData = [parsedData];

    if (parsedData.length === 0) {
        console.log(`⚠️ 데이터 없음`);
        return NextResponse.json({ success: true, count: 0, data: [] });
    }

    const uniqueData = parsedData.map((item: any) => ({
        ...item,
        image_url: item.image_url 
    }));
    
    // 🔥 [로그 출력]
    console.log(`📝 분석 결과: ${uniqueData[0]?.content.slice(0, 20)}...`);
    console.log(`   📸 이미지: ${uniqueData[0]?.image_url ? '성공' : '실패 ❌'}`);
    console.log(`   🧐 사유: "${uniqueData[0]?.reason}"`);

    // 💾 3. DB 저장
    const rowsToInsert = uniqueData.map((item: any) => ({
      title: item.title,
      content: item.content,
      category: item.category,
      source_url: targetUrl,
      image_url: item.image_url || null,
      group_name: groupName || storeId || null, 
      collection_mode: collectionMode || 'net'
    }));

    const { error: dbError } = await supabase.from('local_data').insert(rowsToInsert);
    if (dbError) throw new Error(dbError.message);

    // 🔗 4. [연동] 매장 정보 즉시 업데이트
    if (storeId && uniqueData.length > 0) {
        const summary = uniqueData[0].content;
        
        await supabase.from('gangneung_stores').update({
            raw_info: summary, 
        }).eq('store_id', storeId);
        
        console.log(`✅ 매장(${storeId}) 실시간 정보 동기화 완료`);
    }

    return NextResponse.json({ success: true, count: uniqueData.length, data: uniqueData });

  } catch (error: any) {
    console.error('🔥 [치명적 에러]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}