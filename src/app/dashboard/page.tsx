import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route"; // 아까 export한 설정 가져오기
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  // 1. 서버 세션 확인
  const session = await getServerSession(authOptions);

  // 2. 로그인 안 했으면 메인으로 쫓아내기
  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">대시보드</h1>
            <p className="text-gray-600">환영합니다, {session.user?.name}님!</p>
          </div>
          <LogoutButton />
        </header>

        {/* 여기에 재고 관리 기능들이 들어갈 자리 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-lg shadow border border-gray-200 h-64 flex items-center justify-center text-gray-400">
            (재고 목록이 표시될 영역)
          </div>
          <div className="p-6 bg-white rounded-lg shadow border border-gray-200 h-64 flex items-center justify-center text-gray-400">
             (판매 기록이 표시될 영역)
          </div>
        </div>
      </div>
    </div>
  );
}