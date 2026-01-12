import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*', // 모든 로봇(구글, 네이버, 챗GPT 등)에게 알림
      allow: '/store/', // ✅ 공개 전시장: 출입 허용
      disallow: ['/admin/', '/login/', '/api/'], // ⛔ 비밀 통제실: 출입 금지
    },
    sitemap: 'https://gangneung-aio.vercel.app/sitemap.xml', // 초대장 위치 알려주기
  }
}