"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

<Link 
  href="/api/auth/signin" // NextAuth 기본 로그인 페이지로 보내면 둘 다 뜹니다
  // 혹은 특정 프로바이더를 바로 호출하려면:
  // onClick={() => signIn('naver')} // 클라이언트 컴포넌트 방식
  className="..."
>
  로그인 페이지로 이동
</Link>

export default function Home() {

  const { status } = useSession();
  const router = useRouter();

  // 🌟 [New] 로그인 상태면 바로 Admin Cockpit으로 튕겨냅니다!
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/admin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-4xl font-bold">Booth on the Ground</h1>
      <p className="text-gray-500">Your Otaku Transaction Platform</p>
      
      <div className="flex gap-4">
        <Link 
          href="/api/auth/signin" 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
        >
          Login
        </Link>
      </div>
    </main>
  );
}

// Log-in하고 바로 dashboard로 연결시켜주는것 필욭