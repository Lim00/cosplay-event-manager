// src/app/admin/page.tsx
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "next/link";

export default function AdminCockpitPage() {
  // 1. 진행 중이거나 준비 중인 행사 데이터 가져오기
  const activeEvents = useLiveQuery(() => 
    db.events.where("status").anyOf("OPEN", "PREPARING").toArray()
  );

  // 2. 재고가 10개 미만으로 떨어진 '품절 임박' 굿즈 가져오기
  const lowStockItems = useLiveQuery(() => 
    db.inventory.filter(item => item.stock > 0 && item.stock <= 10).toArray()
  );

  // 3. 수령 대기 중인(아직 안 찾아간) 선입금 예약 데이터 가져오기
  const pendingReservations = useLiveQuery(() => 
    db.reservations.filter(r => r.isPickedUp === false).toArray()
  );

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">🚀 Admin Cockpit</h1>
        <p className="text-gray-500 mt-2">오늘도 성공적인 굿즈 판매를 위한 관제탑입니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 🌟 위젯 1: 현재 굴러가는 행사 상태 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-80">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">🎪 활성 행사</h2>
            <Link href="/admin/events" className="text-sm font-bold text-purple-600 hover:text-purple-800">관리 ➔</Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {!activeEvents?.length ? (
              <p className="text-sm text-gray-400 text-center mt-10">활성화된 행사가 없습니다.</p>
            ) : (
              activeEvents.map(event => (
                <div key={event.id} className={`p-4 rounded-xl border ${event.status === 'OPEN' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="text-xs font-bold mb-1">
                    {event.status === 'OPEN' ? <span className="text-green-600">🟢 진행 중</span> : <span className="text-yellow-600">🚧 준비 중</span>}
                  </div>
                  <div className="font-extrabold text-gray-800 truncate">{event.name}</div>
                  <Link href={`/dashboard?eventId=${event.id}`} className="mt-2 block text-center text-xs bg-white border shadow-sm py-1.5 rounded font-bold hover:bg-gray-50">
                    POS 바로가기
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🌟 위젯 2: 품절 임박 재고 경고 (Low Stock) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-80">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">⚠️ 품절 임박 (10개 이하)</h2>
            <Link href="/admin/inventory" className="text-sm font-bold text-blue-600 hover:text-blue-800">채우기 ➔</Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {!lowStockItems?.length ? (
              <p className="text-sm text-gray-400 text-center mt-10">위험한 재고가 없습니다! 든든하네요.</p>
            ) : (
              lowStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                  <span className="font-bold text-gray-700 text-sm truncate pr-2">{item.name}</span>
                  <span className="font-black text-red-600 text-lg">{item.stock}개</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🌟 위젯 3: 수령 대기 중인 선입금 예약 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-80">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">📦 수령 대기 예약</h2>
            <Link href="/admin/reservations" className="text-sm font-bold text-purple-600 hover:text-purple-800">확인 ➔</Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {!pendingReservations?.length ? (
              <p className="text-sm text-gray-400 text-center mt-10">모든 손님이 굿즈를 수령해 갔습니다!</p>
            ) : (
              pendingReservations.map(res => (
                <div key={res.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-800 text-sm">{res.customerName}</span>
                    <span className="text-xs text-gray-400 font-bold">{res.phoneLast4}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {res.items.map(i => i.name).join(", ")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}