"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Event } from "@/lib/db";
import Link from "next/link";

export default function EventsManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", date: "" });

  // 1. [Read] 행사 목록을 날짜순(최신순)으로 가져옵니다.
  const events = useLiveQuery(() => 
    db.events.orderBy("date").reverse().toArray()
  );

  // 2. [Create] 새 행사 생성 로직
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.date) {
      alert("행사 이름과 날짜를 입력해주세요.");
      return;
    }

    try {
      await db.events.add({
        name: formData.name,
        date: new Date(formData.date),
        status: "PREPARING", // 생성 시 기본 상태는 '준비 중'
      });

      setIsModalOpen(false);
      setFormData({ name: "", date: "" });
    } catch (error) {
      console.error("행사 생성 실패:", error);
      alert("행사 생성 중 오류가 발생했습니다.");
    }
  };

  // 3. [Update] 행사 상태 변경 로직 (PREPARING <-> OPEN <-> CLOSED)
  const handleStatusChange = async (id: number, currentStatus: Event["status"]) => {
    const statusCycle: Record<Event["status"], Event["status"]> = {
      PREPARING: "OPEN",
      OPEN: "CLOSED",
      CLOSED: "PREPARING", // 실수로 닫았을 때 복구할 수 있게 사이클 생성
    };
    
    const newStatus = statusCycle[currentStatus];
    
    // (선택) OPEN으로 바뀔 때 "진짜 시작할까요?" 묻기
    if (newStatus === "OPEN") {
      if (!confirm("행사를 시작(OPEN) 상태로 변경하시겠습니까?\n이후 POS 화면에서 이 행사를 사용할 수 있습니다.")) return;
      
      // 💡 [미래의 로직 자리] 나중에 여기에 "현재 재고 스냅샷 찍기" 코드가 들어갈 수 있습니다.
    }

    await db.events.update(id, { status: newStatus });
  };

  // 4. 상태별 UI 색상 매핑 함수
  const getStatusStyle = (status: Event["status"]) => {
    switch (status) {
      case "PREPARING": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "OPEN": return "bg-green-100 text-green-700 border-green-200 shadow-[0_0_15px_rgba(34,197,94,0.3)]";
      case "CLOSED": return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🎪 행사 컨트롤러</h1>
          <p className="text-gray-500 mt-1">참가하는 행사(이벤트)를 등록하고 상태를 관리하세요.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 shadow-md transition-transform active:scale-95"
        >
          + 새 행사 생성
        </button>
      </div>

      {/* 행사 리스트 (카드 그리드 형태) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!events?.length ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            아직 등록된 행사가 없습니다. 새 행사를 만들어주세요!
          </div>
        ) : (
          events.map((event) => (
            <div 
              key={event.id} 
              className={`bg-white rounded-2xl p-6 border-2 transition-all flex flex-col h-56
                ${event.status === "OPEN" ? "border-green-400 transform hover:-translate-y-1" : "border-gray-100 hover:border-purple-200"}
              `}
            >
              {/* 카드 헤더: 상태 배지 & 날짜 */}
              <div className="flex justify-between items-start mb-4">
                <button 
                  onClick={() => handleStatusChange(event.id!, event.status)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors hover:brightness-95 ${getStatusStyle(event.status)}`}
                >
                  {event.status === "PREPARING" && "🚧 준비 중"}
                  {event.status === "OPEN" && "🟢 진행 중"}
                  {event.status === "CLOSED" && "🔒 종료됨"}
                </button>
                <span className="text-sm font-bold text-gray-400">
                  {new Date(event.date).toLocaleDateString()}
                </span>
              </div>

              {/* 행사 이름 */}
              <h3 className="text-xl font-extrabold text-gray-800 line-clamp-2 mb-auto">
                {event.name}
              </h3>

              {/* 카드 푸터: 액션 버튼들 */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                {/* 1. 메뉴 관리로 이동 (쿼리 파라미터로 eventId 전달) */}
                <Link 
                  href={`/admin/products?eventId=${event.id}`}
                  className="flex items-center justify-center p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-sm rounded-lg transition-colors"
                >
                  📋 메뉴 구성
                </Link>
                
                {/* 2. POS 화면으로 이동 (상태가 OPEN일 때만 파란 버튼) */}
                <Link 
                  href={`/dashboard?eventId=${event.id}`} // 나중에 /pos/[id] 로 바꿀 예정이지만 임시 연결!
                  className={`flex items-center justify-center p-2 font-bold text-sm rounded-lg transition-colors
                    ${event.status === "OPEN" 
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md" 
                      : "bg-gray-100 text-gray-400 pointer-events-none"}
                  `}
                >
                  💳 POS 열기
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 행사 생성 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">새 행사 등록</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">행사 이름</label>
                <input 
                  required autoFocus type="text" placeholder="예: 2026.05 일러스타 페스"
                  className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-purple-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">행사 일자</label>
                <input 
                  required type="date"
                  className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-purple-500"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}