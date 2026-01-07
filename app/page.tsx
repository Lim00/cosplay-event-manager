// src/app/page.tsx
'use client'; // 클라이언트 컴포넌트

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8 text-pink-500">🌸 Doujin ERP V1.0</h1>

      {session ? (
        <div className="text-center">
          <img 
            src={session.user?.image || ''} 
            alt="Profile" 
            className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-pink-500"
          />
          <p className="text-xl mb-6">반갑습니다, <span className="font-bold">{session.user?.name}</span>님!</p>
          
          <div className="flex gap-4 justify-center">
            <Link href="/products" className="bg-emerald-600 px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition">
              상품 관리하러 가기 📦
            </Link>
            <button 
              onClick={() => signOut()}
              className="bg-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-600 transition"
            >
              로그아웃
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="mb-8 text-gray-400">오프라인 재고 관리와 클라우드 백업을 한 번에.</p>
          <button 
            onClick={() => signIn("google")}
            className="bg-white text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition flex items-center gap-2 mx-auto"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2 6.5 2 12s4.42 10 10 10c5.05 0 8.76-3.43 8.76-10c0-.58-.08-1.1-.2-1.9z"/></svg>
            구글로 시작하기
          </button>
        </div>
      )}
    </main>
  );
}