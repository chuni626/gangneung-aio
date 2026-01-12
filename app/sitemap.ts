import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://gangneung-aio.vercel.app'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: stores } = await supabase
    .from('gangneung_stores')
    .select('store_id, created_at');

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // 로그인 페이지도 지도에 넣어주면 좋습니다
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const storePages: MetadataRoute.Sitemap = stores
    ? stores.map((store) => ({
        // 🚨 [수정 포인트] 여기에 '/store'를 꼭 넣어주세요!
        url: `${baseUrl}/store/${store.store_id}`, 
        lastModified: new Date(store.created_at),
        changeFrequency: 'daily', // AI에게 "매일 바뀌니 자주 와라"고 유혹
        priority: 0.8,
      }))
    : [];

  return [...staticPages, ...storePages];
}