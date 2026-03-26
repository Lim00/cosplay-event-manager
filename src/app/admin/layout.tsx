// src/app/admin/layout.tsx
import Link from "next/link";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 왼쪽 사이드바 (고정) */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-10 shrink-0 h-screen sticky top-0">
        <div className="p-6 text-xl font-black tracking-wider border-b border-gray-800 flex items-center gap-3">
          <span>⚙️</span> Admin Hub
        </div>
        
        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 p-4 space-y-2">
          <Link 
            href="/admin/events" 
            className="block p-3 rounded-lg hover:bg-gray-800 transition-colors font-bold text-gray-300 hover:text-white"
          >
            행사 관리
          </Link>
          <Link href="/admin/reservations" className="block p-3 rounded-lg hover:bg-gray-800 transition-colors font-bold text-gray-300 hover:text-white">
            📝 선입금 예약 관리
          </Link>
          <Link 
            href="/admin/inventory" 
            className="block p-3 rounded-lg hover:bg-gray-800 transition-colors font-bold text-gray-300 hover:text-white"
          >
            재고 관리
          </Link>
          <Link 
            href="/admin/analytics" 
            className="block p-3 rounded-lg hover:bg-gray-800 transition-colors font-bold text-gray-300 hover:text-white"
          >
            📊 정산 및 통계
          </Link>
        </nav>

        {/* 하단 메인으로 나가기 */}
        <div className="p-4 border-t border-gray-800">
          <Link 
            href="/" 
            className="flex items-center justify-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 font-bold text-sm text-gray-300 transition-colors"
          >
            ← 메인 화면으로
          </Link>
        </div>
      </aside>

      {/* 오른쪽 메인 컨텐츠 영역 (children에 page.tsx가 들어갑니다) */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
}