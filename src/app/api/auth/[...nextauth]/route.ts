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
    async session({session, user}) {
      if (session.user) {
        // @ts-ignore
        session.user.id = user.id;
      }      
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export {handler as GET, handler as POST};