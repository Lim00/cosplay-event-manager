// src/app/api/auth/[...nextauth]/route.ts

// import NextAuth from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
// import crypto from "crypto";

// // =========================================================================
// // [Phase 1: 클로즈 베타용 무상태(Stateless) OTP 인증 로직]
// // 현재 활성화된 코드입니다.
// // =========================================================================
// const handler = NextAuth({
//   providers: [
//     CredentialsProvider({
//       name: "OTP",
//       credentials: {
//         email: { label: "Email", type: "text" },
//         otp: { label: "OTP", type: "text" },
//         hash: { label: "Hash", type: "text" },
//         expiresAt: { label: "Expires At", type: "text" }
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.otp || !credentials?.hash || !credentials?.expiresAt) {
//           return null;
//         }

//         const { email, otp, hash, expiresAt } = credentials;

//         // 1. 시간 초과 검증
//         if (Date.now() > parseInt(expiresAt, 10)) {
//           throw new Error("인증 시간이 만료되었습니다.");
//         }

//         // 2. 해시 일치 여부 검증 (위조 방지)
//         const data = `${email}.${otp}.${expiresAt}`;
//         const calculatedHash = crypto.createHmac("sha256", process.env.OTP_SECRET!).update(data).digest("hex");

//         if (calculatedHash !== hash) {
//           throw new Error("인증번호가 일치하지 않습니다.");
//         }

//         // 인증 성공!
//         return { id: email, email: email, name: "클로즈베타 테스터" };
//       }
//     })
//   ],
//   pages: {
//     signIn: '/', // 로그인 실패나 오류 시 튕겨낼 메인 페이지 경로
//   },
//   session: {
//     strategy: "jwt", // Credentials Provider는 JWT 전략이 강제됩니다.
//   }
// });

// export { handler as GET, handler as POST };


//  [Phase 2: 정식 릴리즈용 소셜 로그인 + Prisma 환경 보관소]
//  클로즈 베타 종료 후, 위의 코드를 지우고 아래 주석을 해제하시면 즉시 원복됩니다!
//  =========================================================================
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NaverProvider from "next-auth/providers/naver";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// authOptions를 변수로 분리하고 export (important!)
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = user.id;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
// ========================================================================= */