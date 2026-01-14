import NextAuth, { DefaultSession } from "next-auth";

// next-auth 모듈의 타입을 확장합니다.
declare module "next-auth" {
  /**
   * useSession()이나 getServerSession()을 호출했을 때 
   * 돌려받는 Session 객체의 타입을 정의합니다.
   */
  interface Session {
    user: {
      /** DB에 저장된 유저의 고유 ID (UUID/CUID) */
      id: string;
    } & DefaultSession["user"];
  }
}