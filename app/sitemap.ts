import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://gangneung-aio.vercel.app'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. DB에서 데이터 가져오기 (중복 포함)
  const { data: stores } = await supabase
    .from('gangneung_stores')
    .select('store_id, created_at');

  // 2. [핵심 기술] 중복된 store_id 제거하기 (Set 활용)
  // 똑같은 가게가 여러 개 있어도 하나만 남깁니다.
  const uniqueStores = Array.from(
    new Map((stores || []).map(store => [store.store_id, store])).values()
  );

  // 3. 고정 페이지 설정
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 4. 가게 페이지 주소 생성 (여기서 /store 추가!)
  const storePages: MetadataRoute.Sitemap = uniqueStores.map((store) => ({
    url: `${baseUrl}/store/${store.store_id}`, // 👈 /store/ 꼭 확인하세요!
    lastModified: new Date(store.created_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticPages, ...storePages];
}