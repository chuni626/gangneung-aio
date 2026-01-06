import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://gangneung-aio.vercel.app'

  // 현재는 메인 페이지만 있지만, 향후 Phase 2에서 데이터가 쌓이면 
  // 이곳에 자동으로 모든 가게 페이지가 추가되도록 설계되었습니다.
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily', // 매일 업데이트됨을 로봇에게 알림
      priority: 1, // 가장 중요한 페이지(메인)임을 표시
    },
    // 예시: 향후 추가될 페이지 (나중에 자동으로 늘어나게 됩니다)
    // {
    //   url: `${baseUrl}/blog`,
    //   lastModified: new Date(),
    //   changeFrequency: 'weekly',
    //   priority: 0.8,
    // },
  ]
}