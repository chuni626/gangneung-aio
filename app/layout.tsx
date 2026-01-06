import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ 구글 서치 콘솔 인증 코드가 포함된 메타데이터 설정
export const metadata: Metadata = {
  title: "강릉 AI 데이터 허브 AIO",
  description: "2026 강릉 ITS 세계총회를 위한 로컬 데이터 댐 프로젝트",
  verification: {
    google: "kG2m5o-XXrhcSvWHMUCNyfa9e-lvP0sTlkVw5S3L0Dg",
    // 네이버는 아래처럼 'other' 항목 안에 넣어야 로봇이 인식합니다.
    other: {
      "naver-site-verification": [
        "1d5bf82000439d733a0f562fbf3e6d4be0feb07d",
      ],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
