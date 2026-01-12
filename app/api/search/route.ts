import FirecrawlApp from '@mendable/firecrawl-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { keyword, collectionMode } = await req.json();

    let searchKeyword = keyword;
    let limitCount = 40; // 넉넉하게

    // [핵심] 검색어에 '강릉' 지역명 강제 결합
    // 사용자가 '강릉'을 안 썼어도 자동으로 붙여줍니다.
    const regionKeyword = keyword.includes('강릉') ? keyword : `강릉 ${keyword}`;

    if (collectionMode === 'store') {
      // 1. 업체 모드: "강릉 [가게명] 후기" + 블로그 필터
      searchKeyword = `${regionKeyword} 후기 (site:blog.naver.com OR site:tistory.com)`;
      console.log(`\n🏢 [업체 정밀 탐색] 지역 한정 검색: ${searchKeyword}`);
    } else {
      // 2. 그물망 모드: "강릉 [키워드] 추천"
      searchKeyword = `${regionKeyword} 추천 리뷰 (site:blog.naver.com OR site:tistory.com)`;
      console.log(`\n🕸️ [그물망 탐색] 지역 한정 검색: ${searchKeyword}`);
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: "API 키 없음" }, { status: 500 });

    const firecrawl = new FirecrawlApp({ apiKey: apiKey });
    
    const searchResponse = await firecrawl.search(searchKeyword, {
      limit: limitCount
    });

    const searchResults = (searchResponse as any).data || (searchResponse as any).web || [];

    if (!searchResults || searchResults.length === 0) {
      console.log("⚠️ 검색 결과가 없습니다.");
      return NextResponse.json({ success: true, urls: [] });
    }

    let filteredUrls = searchResults
      .map((item: any) => item.url)
      .filter((url: string) => {
        return url && (url.includes('blog.naver.com') || url.includes('tistory.com'));
      });

    filteredUrls = [...new Set(filteredUrls)];
    
    console.log(`✅ '강릉' 관련 URL ${filteredUrls.length}개 확보`);
    
    return NextResponse.json({ success: true, urls: filteredUrls });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}