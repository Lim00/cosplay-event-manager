// // src/app/page.tsx
// "use client";

// import { useSession, signIn } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function Home() {
//   const { status } = useSession();
//   const router = useRouter();

//   const [step, setStep] = useState<"EMAIL" | "OTP">("EMAIL");
//   const [email, setEmail] = useState("");
//   const [otp, setOtp] = useState("");

//   // 서버에서 받은 무상태 토큰(포인터)들
//   const [hash, setHash] = useState("");
//   const [expiresAt, setExpiresAt] = useState("");
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (status === "authenticated") {
//       router.push("/admin");
//     }
//   }, [status, router]);

//   if (status === "loading") return <div className="flex h-screen items-center justify-center font-bold text-gray-500">인증 상태 확인 중...</div>;

//   // 1. 이메일 발송 요청
//   const handleSendEmail = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const res = await fetch("/api/auth/send-otp", {
//         method: "POST", headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email })
//       });
//       const data = await res.json();

//       if (!res.ok) throw new Error(data.error);

//       // 서버가 던져준 해시와 만료시간을 브라우저가 잠시 쥐고 있는다 (State)
//       setHash(data.hash);
//       setExpiresAt(data.expiresAt.toString());
//       setStep("OTP");
//       alert("인증 메일이 발송되었습니다. 3분 내에 확인해주세요.");
//     } catch (error: any) {
//       alert(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 2. 인증 번호 제출
//   const handleVerifyOtp = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);

//     // NextAuth의 CredentialsProvider로 입력값과 해시를 통째로 넘김
//     const res = await signIn("credentials", {
//       redirect: false,
//       email, otp, hash, expiresAt
//     });

//     if (res?.error) {
//       alert(res.error);
//       setLoading(false);
//     } else {
//       router.push("/admin");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
//       <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
//         <div className="text-center mb-8">
//           <div className="text-4xl mb-4">🚀</div>
//           <h1 className="text-2xl font-black text-white tracking-tight">ERP 클로즈 베타</h1>
//           <p className="text-gray-400 text-sm mt-2">사전 인가된 테스터만 접근할 수 있습니다.</p>
//         </div>

//         {step === "EMAIL" ? (
//           <form onSubmit={handleSendEmail} className="space-y-4">
//             <div>
//               <label className="block text-sm font-bold text-gray-400 mb-1">등록된 이메일 주소</label>
//               <input 
//                 required autoFocus type="email" placeholder="example@domain.com" 
//                 className="w-full p-4 rounded-xl bg-gray-900 border border-gray-600 text-white focus:border-purple-500 outline-none transition-colors"
//                 value={email} onChange={(e) => setEmail(e.target.value)}
//               />
//             </div>
//             <button disabled={loading} type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all disabled:opacity-50">
//               {loading ? "확인 중..." : "인증번호 받기"}
//             </button>
//           </form>
//         ) : (
//           <form onSubmit={handleVerifyOtp} className="space-y-4">
//             <div className="text-center p-3 bg-gray-900 rounded-lg text-gray-300 text-sm mb-4">
//               <span className="font-bold text-purple-400">{email}</span> 로<br/>발송된 6자리 코드를 입력해주세요.
//             </div>
//             <div>
//               <input 
//                 required autoFocus type="text" maxLength={6} placeholder="000000" 
//                 className="w-full p-4 text-center text-2xl tracking-[0.5em] rounded-xl bg-gray-900 border border-gray-600 text-white focus:border-purple-500 outline-none"
//                 value={otp} onChange={(e) => setOtp(e.target.value)}
//               />
//             </div>
//             <button disabled={loading} type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50">
//               {loading ? "검증 중..." : "베타 접속하기"}
//             </button>
//             <button type="button" onClick={() => setStep("EMAIL")} className="w-full py-3 text-gray-400 hover:text-white text-sm font-bold transition-colors">
//               ← 다시 시도하기
//             </button>
//           </form>
//         )}
//       </div>
//     </div>
//   );
// }

// /* =========================================================================
//    [정식 릴리즈용 소셜 로그인 컴포넌트 임시 보관소]
//    나중에 정식 오픈 시 아래 코드로 교체하시면 됩니다!
//    =========================================================================
// import { signIn } from "next-auth/react";

// export function OfficialLogin() {
//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//       <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
//         <h1 className="text-3xl font-black text-gray-800 mb-2">POS ERP</h1>
//         <p className="text-gray-500 mb-8">동인 행사 재고 관리의 모든 것</p>

//         <div className="space-y-3">
//           <button onClick={() => signIn("google")} className="w-full py-3 border border-gray-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50">
//             Google로 계속하기
//           </button>
//           <button onClick={() => signIn("naver")} className="w-full py-3 bg-[#03C75A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#02b351]">
//             Naver로 계속하기
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
// */

// src/app/page.tsx
"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/admin");
    }
  }, [status, router]);

  if (status === "loading") return <div className="flex h-screen items-center justify-center font-bold text-gray-500">인증 확인 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-sm w-full text-center border border-gray-100">
        <h1 className="text-4xl font-black text-gray-800 mb-2 tracking-tight">POS ERP</h1>
        <p className="text-gray-500 mb-10 font-medium">동인 행사 통합 관리 시스템</p>

        <div className="space-y-4">
          <button
            onClick={() => signIn("google")}
            className="w-full py-4 border border-gray-200 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-95"
          >
            {/* Google Icon (SVG 등을 넣으시면 좋습니다) */}
            Google로 계속하기
          </button>
          <button
            onClick={() => signIn("naver")}
            className="w-full py-4 bg-[#03C75A] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#02b351] transition-all active:scale-95"
          >
            {/* Naver Icon */}
            Naver로 계속하기
          </button>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          로그인 시 서비스 약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}