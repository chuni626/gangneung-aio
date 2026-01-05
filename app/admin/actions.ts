'use server';

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://lmbiklnpcaltrkarqhmg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYmlrbG5wY2FsdHJrYXJxaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMjk5MDMsImV4cCI6MjA4MjkwNTkwM30.QyVa1fjB-JyGhcvv4OPpvaziICOOO6_Fey4fPJKvugc"; 
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// 헬퍼 함수
function getSafeText(response: any): string {
  try {
    if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.candidates[0].content.parts[0].text;
    }
    if (typeof response.text === 'function') {
      return response.text();
    }
    return "";
  } catch (e) {
    console.error("데이터 추출 실패:", e);
    return "";
  }
}

// 1. 소식 저장 (기존 유지)
export async function analyzeAndSave(info: string, storeId: string) {
  try {
    const client = new GoogleGenAI({ apiKey: GEMINI_KEY! });
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: `강릉 매장 소식: "${info}" 내용을 구글 검색용 JSON-LD(NewsArticle)로 변환해. JSON 코드만 출력해.` }] }]
    });

    let aiJson = getSafeText(response);
    aiJson = aiJson.replace(/```json|```/g, "").trim();

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { error } = await supabase.from('gangneung_stores').insert([{ 
      store_id: storeId,
      store_name: storeId === 'youngjin' ? '영진횟집' : (storeId === 'gangneung-bap' ? '강릉밥집' : storeId),
      raw_info: info,
      ai_structured_data: JSON.parse(aiJson) 
    }]);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 2. 리포트 (기존 유지)
export async function generateMonthlyReport(storeId: string) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data } = await supabase.from('gangneung_stores')
      .select('raw_info').eq('store_id', storeId).gte('created_at', firstDay);

    const count = data?.length || 0;
    const contents = data?.map(d => d.raw_info).join(' | ');
    const client = new GoogleGenAI({ apiKey: GEMINI_KEY! });
    
    const prompt = `
      당신은 냉철한 '수석 마케팅 데이터 분석가'입니다.
      클라이언트(${storeId}) 리포트 작성.
      기간: 이번 달, AI 활동량: ${count}회, 내용: ${contents}.
      양식: 1.종합등급 2.데이터분석 3.키워드분석 4.전략
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return { success: true, report: getSafeText(response) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 🔥 3. [엄격 수정] AI 블로그 생성 (환각 방지 + 이미지 저장)
export async function createBlogPost(storeId: string, topic?: string, imagesBase64?: string[]) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: store } = await supabase
      .from('gangneung_stores')
      .select('store_name, raw_info')
      .eq('store_id', storeId)
      .limit(3);

    const storeName = store?.[0]?.store_name || storeId;
    const recentNews = store?.map(s => s.raw_info).join(', ') || "기본 메뉴";
    const targetTopic = topic || "강릉 맛집 추천";

    const client = new GoogleGenAI({ apiKey: GEMINI_KEY! });
    
    // 🛑 [핵심] 헛소리 방지용 초강력 프롬프트
    let promptText = `
      당신은 '강릉 로컬 여행 에디터'입니다.
      첨부된 사진들과 아래 정보를 바탕으로 블로그 글을 작성하세요.

      [🚫 절대 금지 사항 - 어기면 시스템 오류 발생]
      1. **없는 메뉴 창조 금지:** 입력된 정보에 없는 메뉴(특히 참치, 랍스터 등)는 절대 언급하지 마시오. 모르면 "제철 회"라고만 쓰시오.
      2. **배경 사물 무시:** 사진 배경에 있는 신발(크록스), 쓰레기통, 행인 등은 절대 묘사하지 마시오. 오직 '음식'과 '매장 분위기'만 보시오.
      3. **판매 정보 왜곡 금지:** 신발을 판다거나 하는 엉뚱한 소리는 절대 금지.

      [✅ 작성 지침]
      - 주제: ${targetTopic}
      - 매장명: ${storeName}
      - 실제 소식: ${recentNews}
      - 사진 활용: 사진 속 음식의 윤기, 색감, 신선함만 묘사할 것.

      [출력 형식]
      JSON Only: { "title": "제목", "content": "본문(Markdown)", "keywords": ["키워드"] }
    `;

    const requestParts: any[] = [{ text: promptText }];
    if (imagesBase64 && imagesBase64.length > 0) {
        imagesBase64.forEach((imgBase64) => {
            const cleanBase64 = imgBase64.split(',')[1];
            requestParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
        });
    }

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: requestParts }]
    });

    let aiJson = getSafeText(response);
    aiJson = aiJson.replace(/```json|```/g, "").trim();
    const blogData = JSON.parse(aiJson);

    // ✅ [저장] 이미지 데이터를 DB에 확실하게 저장
    const { error } = await supabase.from('blog_posts').insert([{
      store_id: storeId,
      title: blogData.title,
      content: blogData.content,
      keywords: blogData.keywords,
      images: imagesBase64, // 여기가 비어있으면 사진이 안 나옵니다.
      status: 'draft'
    }]);

    if (error) throw error;
    return { success: true, title: blogData.title };

  } catch (error: any) {
    console.error("블로그 생성 에러:", error);
    return { success: false, message: error.message };
  }
}