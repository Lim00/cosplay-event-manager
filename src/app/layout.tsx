import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}