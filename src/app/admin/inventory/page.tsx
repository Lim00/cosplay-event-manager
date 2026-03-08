'use client'

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function INventoryManagementPage() {
    // 1. [State] 모달 창 열림 / 닫힘 상태
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 2. [State] 폼 입력값 상태 관리
    const [formData, setFormData] = useState({
        name: "",
        category: "팬시", // 기본값
        price: "",
        stock: "",
        description: "",
    });

    // 3. [Data] 현재 등록된 재고 목록 실시간 불러오기
    const inventories = useLiveQuery(() => db.inventory.toArray());

    // 4. [Logic] 재고 추가 트랜잭션 함수
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // 입력값 숫자로 변환
        const price = parseInt(formData.price, 10);
        const stock = parseInt(formData.stock, 10);

        if (isNaN(price) || isNaN(stock)) {
            alert("가격과 재고는 숫자로 입력해주세요.");
            return;
        }

        try {
            // Inventory와 InventoryLog 두 테이블을 동시에 조작 (rw 모드)
            await db.transaction("rw", db.inventory, db.inventoryLogs, async () => {
                // 먼저 Inventory 테이블에 새로운 굿즈를 추가하고 ID 발급
                const newItemId = await db.inventory.add({
                    name: formData.name,
                    category: formData.category,
                    price: price,
                    stock: stock,
                    initialStock: stock, // 처음 등록하면 초기재고 = 현재 재고
                    description: formData.description,
                });

                // ② 발급받은 ID를 사용해 "최초 입고" 로그를 남깁니다.
                await db.inventoryLogs.add({
                    itemId: newItemId,
                    changeQty: stock,
                    currentStock: stock,
                    reason: "ADD", // 추가됨
                    timestamp: new Date(),
                });
            });

            // 성공 시 처리: 모달 닫기 및 폼 초기화
            alert("성공적으로 등록되었습니다!");
            setIsModalOpen(false);
            setFormData({ name: "", category: "팬시", price: "", stock: "", description: "" });

        } catch (error) {
            console.error("재고 등록 실패:", error);
            alert("재고 추가에 실패했습니다. 다시 시도해주세요.");
        }
    };

    return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      {/* 헤더 영역 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📦 글로벌 재고 관리</h1>
          <p className="text-gray-500 mt-1">모든 행사에서 공통으로 사용할 마스터 재고를 관리합니다.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95"
        >
          + 새 재고 등록
        </button>
      </div>

      {/* 재고 리스트 영역 (Read) */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="p-4 font-bold text-gray-600">ID</th>
              <th className="p-4 font-bold text-gray-600">카테고리</th>
              <th className="p-4 font-bold text-gray-600">이름</th>
              <th className="p-4 font-bold text-gray-600">단가</th>
              <th className="p-4 font-bold text-gray-600">현재고</th>
              <th className="p-4 font-bold text-gray-600">설명</th>
            </tr>
          </thead>
          <tbody>
            {!inventories?.length ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">등록된 재고가 없습니다.</td>
              </tr>
            ) : (
              inventories.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-gray-400">#{item.id}</td>
                  <td className="p-4"><span className="bg-gray-200 px-2 py-1 rounded text-xs font-bold">{item.category}</span></td>
                  <td className="p-4 font-bold text-gray-800">{item.name}</td>
                  <td className="p-4 text-blue-600 font-bold">{item.price.toLocaleString()}원</td>
                  <td className="p-4 font-bold">{item.stock}개</td>
                  <td className="p-4 text-gray-500 text-sm">{item.description || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 모달(Popup) 영역 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">새 재고 등록</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">카테고리</label>
                <select 
                  className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-blue-500"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="팬시">팬시 (키링, 아크릴 등)</option>
                  <option value="회지">회지 (일러북, 만화 등)</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">굿즈 이름</label>
                <input 
                  required autoFocus type="text" placeholder="예: 엑시아 아크릴 스탠드"
                  className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">단가 (원)</label>
                  <input 
                    required type="number" min="0" step="100" placeholder="0"
                    className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-blue-500"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">초기 입고 수량</label>
                  <input 
                    required type="number" min="1" placeholder="1"
                    className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-blue-500"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">설명 (선택)</label>
                <textarea 
                  rows={2} placeholder="예: 2026년 일페 대비 신규 발주건"
                  className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-blue-500 resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
