// src/app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import NaverProvider from "next-auth/providers/naver";

const authOptions: NextAuthOptions = {
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
  session: {
    strategy: "jwt", // 🌟 핵심: DB 없이 브라우저 쿠키(JWT)만으로 로그인 상태를 유지합니다.
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        // @ts-ignore
        session.user.id = token.sub; // DB의 User ID 대신, 구글/네이버가 주는 고유 ID를 사용합니다.
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };