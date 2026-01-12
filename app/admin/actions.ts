'use server';

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// 🛠️ [Helper] 텍스트 안전 추출
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
    return "";
  }
}

// 🎨 [AI 화가] 이미지 생성 (Gemini 3 Pro)
async function generateImageWithImagen(prompt: string): Promise<string | null> {
  try {
    const client = new GoogleGenAI({ apiKey: GEMINI_KEY! });
    const response = await client.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const imgData = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (imgData) return `data:image/jpeg;base64,${imgData}`;
    return null;
  } catch (e: any) {
    console.error(`⚠️ 이미지 생성 실패: ${e.message}`);
    return null; 
  }
}

// 📸 [AI 비전] 사진 묘사
async function describeUserImage(base64Image: string): Promise<string> {
  try {
    const client = new GoogleGenAI({ apiKey: GEMINI_KEY! });
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: [{
        role: 'user',
        parts: [
          { text: "Describe this food image in extreme detail (composition, lighting, ingredients)." },
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
        ]
      }]
    });
    return getSafeText(response);
  } catch (e) {
    console.error("❌ 이미지 분석 실패:", e);
    return "";
  }
}

// 1. 소식 저장 및 매장 자동 등록
export async function analyzeAndSave(info: string, storeId: string) {
  try {
    const client = new GoogleGenAI({ apiKey: GEMINI_KEY! });
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: existingStore } = await supabase.from('gangneung_stores').select('id, store_name').eq('store_id', storeId).maybeSingle();
    let storeName = existingStore?.store_name;

    if (!storeName) {
      const nameResponse = await client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: 'user', parts: [{ text: `텍스트: "${info}"\n이 텍스트를 쓴 '가게 이름'이 뭐야? (ID: ${storeId})\n가게 이름만 단답으로 줘.` }] }]
      });
      storeName = getSafeText(nameResponse).trim();
    }

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: `소식: "${info}" -> JSON-LD 변환해줘. JSON만 출력.` }] }]
    });

    let aiJson = getSafeText(response).replace(/```json|```/g, "").trim();

    if (existingStore) {
      await supabase.from('gangneung_stores').update({ store_name: storeName, raw_info: info, ai_structured_data: JSON.parse(aiJson) }).eq('store_id', storeId);
    } else {
      await supabase.from('gangneung_stores').insert([{ store_id: storeId, store_name: storeName, raw_info: info, ai_structured_data: JSON.parse(aiJson) }]);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 2. 리포트 생성 (유지)
export async function generateMonthlyReport(storeId: string) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data } = await supabase.from('gangneung_stores').select('raw_info, created_at').eq('store_id', storeId).gte('created_at', firstDay);
    const count = data?.length || 0;
    const activityLog = data?.map(d => `[${new Date(d.created_at).toLocaleDateString('ko-KR')}] ${d.raw_info}`).join('\n') || "활동 내역 없음";
    
    const client = new GoogleGenAI({ apiKey: GEMINI_KEY! });
    const prompt = `
      당신은 '강릉 지역 상권 분석가'입니다.
      클라이언트(${storeId})의 활동 내역(${count}회)을 분석하고, 다음 달 매출 전략을 보고하세요.
      내역: ${activityLog}
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

// 🔥 [핵심 기능] 3. 블로그 & 인스타 동시 생성 (DB 소식 강력 반영)
export async function createBlogPost(storeId: string, topic?: string, imagesBase64?: string[]) {
  console.log(`\n🚀 [Action] 콘텐츠 생성 요청 (Store: ${storeId})`);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // 1. DB에서 내 가게 최신 소식 3개 긁어오기 (가장 중요한 부분!)
    const { data: store } = await supabase.from('gangneung_stores')
      .select('store_name, raw_info')
      .eq('store_id', storeId)
      .order('created_at', {ascending: false})
      .limit(3);
    
    const storeName = store?.[0]?.store_name || storeId;
    // 소식들을 콤마로 연결해서 AI에게 줄 준비
    const recentNews = store?.map(s => s.raw_info).join(', ') || "특별한 소식 없음 (기본 메뉴 홍보)";
    
    console.log(`📂 [DB 조회] 반영할 소식: "${recentNews}"`);

    let safeTopic = topic;
    if (!safeTopic || safeTopic === 'undefined' || safeTopic.trim() === '') {
        safeTopic = `${storeName} 추천 메뉴`;
    }

    const client = new GoogleGenAI({ apiKey: GEMINI_KEY! });
    
    // 2. 프롬프트 작성: "블로그와 인스타 두 가지 버전을 동시에 줘!"
    const promptText = `
      당신은 대한민국 최고의 'SNS 마케팅 전문가'입니다.
      
      [핵심 정보]
      - 매장명: ${storeName}
      - 📢 **필수 반영 소식(DB)**: "${recentNews}" (이 내용을 글에 반드시 자연스럽게 녹여낼 것!)
      - 글 주제: ${safeTopic}

      [임무] 아래 두 가지 포맷을 모두 작성하여 JSON으로 반환하세요.

      1. **네이버 블로그 (blog)**
         - 파워블로거 스타일 (친근함, 이모지 사용).
         - **'필수 반영 소식'**을 강조하여 방문 유도. (예: 할인, 신메뉴 등)
         - 구조: 제목, 본문(서론-본론-결론), 태그.
      
      2. **인스타그램 (instagram)**
         - 감성 충만, 이모지 가득(✨🔥😍).
         - 첫 줄에 **'필수 반영 소식'**을 훅킹 멘트로 사용.
         - 본문은 짧고 임팩트 있게.
         - 해시태그 15개 이상.

      [출력 포맷 (JSON Only)]
      {
        "blog": { "title": "제목", "content": "내용...", "keywords": ["#태그"] },
        "instagram": { "content": "내용...", "hashtags": ["#태그"] }
      }
    `;
    
    const response = await client.models.generateContent({ 
      model: "gemini-2.0-flash", 
      contents: [{ role: 'user', parts: [{ text: promptText }] }] 
    });
    
    // 3. 응답 파싱
    let aiJson = getSafeText(response).replace(/```json|```/g, "").trim();
    let resultData;
    
    try {
        resultData = JSON.parse(aiJson);
    } catch (e) {
        // 파싱 실패 시 텍스트라도 건짐
        console.warn("JSON 파싱 실패, 원본 텍스트 사용");
        resultData = { 
            blog: { title: "생성 오류", content: aiJson, keywords: [] },
            instagram: { content: aiJson.slice(0, 200), hashtags: [] }
        };
    }

    // 4. 이미지 처리 (사용자 사진 우선, 없으면 AI 생성)
    let finalImages = imagesBase64 || [];
    
    if (finalImages.length === 0) {
      console.log("📸 사진 생성 (AI)");
      const createPrompt = `Delicious food photography of ${storeName}, ${safeTopic}. Korean style, cinematic lighting.`;
      const aiImage = await generateImageWithImagen(createPrompt);
      if (aiImage) finalImages = [aiImage];
    } else {
      console.log("📸 사용자 업로드 사진 사용 (보정 시도)");
      try {
        const description = await describeUserImage(finalImages[0]);
        const remasterPrompt = `Recreate in high quality: ${description}`;
        const remasteredImage = await generateImageWithImagen(remasterPrompt);
        if (remasteredImage) finalImages.push(remasteredImage);
      } catch (e) { console.log("보정 실패 (원본 사용)"); }
    }

    // 5. DB 저장 (블로그 내용 기준)
    await supabase.from('blog_posts').insert([{
      store_id: storeId, 
      title: resultData.blog.title,
      content: resultData.blog.content, 
      keywords: resultData.blog.keywords, 
      images: finalImages, 
      status: 'draft'
    }]);
    
    // 6. 결과 반환 (프론트엔드로 전달)
    return { 
        success: true, 
        blog: resultData.blog, 
        instagram: resultData.instagram, 
        images: finalImages 
    };

  } catch (error: any) {
    console.error("❌ 생성 에러:", error);
    return { success: false, message: error.message };
  }
}

// 4. 차트 데이터 (유지)
export async function getTrendData(storeId: string) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: storeInfo } = await supabase.from('gangneung_stores').select('store_name').eq('store_id', storeId).maybeSingle();
    const searchKeyword = storeInfo?.store_name || storeId;
    const { data: aiLogs } = await supabase.from('local_data').select('created_at').or(`group_name.eq.${storeId},group_name.eq.${searchKeyword},group_name.ilike.%${searchKeyword}%,title.ilike.%${searchKeyword}%`).order('created_at', { ascending: true });
    const { data: humanLogs } = await supabase.from('page_views').select('created_at').eq('store_id', searchKeyword);
    const dateMap = new Map();
    aiLogs?.forEach(log => { const d = new Date(log.created_at).toLocaleDateString('ko-KR'); if(!dateMap.has(d)) dateMap.set(d,{a:0,h:0}); dateMap.get(d).a++; });
    humanLogs?.forEach(log => { const d = new Date(log.created_at).toLocaleDateString('ko-KR'); if(!dateMap.has(d)) dateMap.set(d,{a:0,h:0}); dateMap.get(d).h++; });
    const chartData = Array.from(dateMap.entries()).sort((a,b)=>new Date(a[0]).getTime()-new Date(b[0]).getTime()).map(([d,v]:any)=>({name:d, score:v.a*10, visitor:v.h}));
    return { success: true, chartData };
  } catch (e: any) { return { success: false, message: e.message }; }
}

// 5. 웹훅 (유지)
export async function sendToWebhook(data: any) {
  try {
    const WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL; 
    if (!WEBHOOK_URL) return { success: true, message: "Webhook URL 미설정" };
    await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return { success: true, message: "🚀 배송 완료!" };
  } catch (error: any) { return { success: false, message: error.message }; }
}