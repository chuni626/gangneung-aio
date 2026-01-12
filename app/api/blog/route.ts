import { NextResponse } from 'next/server';
import { createBlogPost } from '@/app/admin/actions';

export async function POST(request: Request) {
  console.log("\n----- 📨 [API] 블로그 생성 요청 도착 -----");

  try {
    // 1. 데이터 까보기 (파싱)
    const body = await request.json();
    console.log("📥 받은 데이터:", body);

    const { storeId, topic, concept } = body;

    // 2. 범인(undefined) 색출 및 교정
    // topic이 없으면 concept을 쓰고, 둘 다 없으면 기본값을 씁니다.
    let finalTopic = topic;

    if (!finalTopic || finalTopic === 'undefined') {
      console.log("⚠️ Topic이 없거나 undefined입니다. Concept을 대신 사용합니다.");
      finalTopic = concept;
    }

    if (!finalTopic || finalTopic === 'undefined') {
      console.log("⚠️ Concept조차 없습니다. 기본값으로 설정합니다.");
      finalTopic = "강릉 맛집 추천";
    }

    console.log(`✅ 최종 확정 주제: "${finalTopic}"`);

    // 3. 필수값 검증
    if (!storeId) {
      console.error("❌ [에러] storeId가 누락되었습니다.");
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // 4. 진짜 글쓰기 (Server Action 호출)
    console.log("🚀 createBlogPost 함수 호출...");
    const result = await createBlogPost(storeId, finalTopic);

    // 5. 결과 처리
    if (result.success) {
      console.log("🎉 [성공] 블로그 글 생성 완료!");
      return NextResponse.json(result);
    } else {
      console.error("❌ [실패] 블로그 생성 중 오류 발생:", result.message);
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

  } catch (error: any) {
    // 🔥 여기가 사장님이 원하시던 '에러 원인 출력' 부분입니다.
    console.error("\n🔥 [치명적 에러] /api/blog 처리 중 서버 다운 🔥");
    console.error("이유:", error.message);
    console.error("상세:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}