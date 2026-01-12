import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

async function runTest() {
  console.log("🚀 [강릉 AI 데이터 댐] 수집 엔진 가동...");
  const targetUrl = 'https://www.gn.go.kr';

  try {
    const result = await app.scrape(targetUrl, { formats: ['markdown'] });

    // [수정] result.success 대신 실제 데이터(markdown)가 있는지 확인합니다.
    const markdownContent = result.data?.markdown || result.markdown;

    if (markdownContent) {
      console.log("✅ 수집 성공! (강릉시청 데이터를 가져왔습니다)");
      console.log("📝 수집된 데이터 미리보기:");
      console.log("--------------------------------------------------");
      console.log(markdownContent.slice(0, 500) + "...");
      console.log("--------------------------------------------------");
      console.log(`📊 사용된 크레딧: ${result.metadata?.creditsUsed || 1}`);
    } else {
      console.error("❌ 수집 실패: 데이터를 찾을 수 없습니다.");
      console.log("응답 구조:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("❌ 시스템 에러:", error.message);
  }
}

runTest();