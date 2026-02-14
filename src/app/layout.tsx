import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers"; // 1. 임포트 추가

export const metadata: Metadata = {
  title: "Cosplay Inventory",
  description: "Offline-first Manager",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {/* 2. Providers로 body 내부 감싸기 */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}