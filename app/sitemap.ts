import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://gangneung-aio.vercel.app'

  // 1. Supabase에서 등록된 모든 가게 ID를 가져옵니다.
  // (환경변수 사용 필수!)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: stores } = await supabase
    .from('gangneung_stores')
    .select('store_id, created_at');

  // 2. 고정된 메인 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  // 3. 데이터베이스에 있는 가게 페이지들을 자동으로 생성
  const storePages: MetadataRoute.Sitemap = stores
    ? stores.map((store) => ({
        url: `${baseUrl}/${store.store_id}`,
        lastModified: new Date(store.created_at),
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
    : [];

  // 4. 합쳐서 반환
  return [...staticPages, ...storePages];
}