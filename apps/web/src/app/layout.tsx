import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "해설지 세트 생성기",
  description: "지문/문항 기반 수업용 해설지 자동 생성 MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
