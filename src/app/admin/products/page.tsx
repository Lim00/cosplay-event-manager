"use client";

import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Inventory } from "@/lib/db";
import Link from "next/link";
import { Suspense } from "react";

// URL의 쿼리 파라미터(?eventId=1)를 읽어오기 위한 컴포넌트 분리
// (Next.js 14에서는 useSearchParams를 쓸 때 Suspense로 감싸주는 것이 안전합니다)
function MenuManager() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");
  const eventId = eventIdParam ? parseInt(eventIdParam, 10) : 0;

  // 1. [Read] 현재 행사 정보 가져오기
  const currentEvent = useLiveQuery(() => db.events.get(eventId), [eventId]);

  // 2. [Read] 창고(Inventory)의 모든 물리적 재고 가져오기
  const globalInventory = useLiveQuery(() => db.inventory.toArray());

  // 3. [Read] '이 행사(eventId)'에만 등록된 메뉴판(Products) 가져오기 (마스킹의 핵심!)
  const eventProducts = useLiveQuery(
    () => db.products.where({ eventId }).toArray(),
    [eventId]
  );

  // 4. [Create] 창고의 재고를 이번 행사의 '메뉴'로 등록하기
  const handleAddToMenu = async (item: Inventory) => {
    try {
      // 이미 메뉴에 있는지 확인 (중복 방지)
      const existing = await db.products
        .where({ eventId })
        .filter((p) => !p.isBundle && p.components[0].itemId === item.id)
        .first();

      if (existing) {
        alert("이미 이 행사의 메뉴로 등록된 굿즈입니다!");
        return;
      }

      // 새 메뉴(Product)로 등록! (물리적 창고는 건드리지 않음)
      await db.products.add({
        eventId: eventId,
        name: item.name,
        price: item.price, // 초기 가격은 창고 가격을 따라감 (나중에 수정 가능하게 확장 가능)
        isBundle: false,
        components: [{ itemId: item.id!, qty: 1 }],
      });
    } catch (error) {
      console.error("메뉴 등록 실패:", error);
    }
  };

  // 5. [Delete] 행사 메뉴에서 빼기
  const handleRemoveFromMenu = async (productId: number) => {
    if (confirm("이 메뉴를 이번 행사에서 뺄까요? (창고의 실제 재고는 사라지지 않습니다)")) {
      await db.products.delete(productId);
    }
  };

  if (!eventId) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>선택된 행사가 없습니다.</p>
        <Link href="/admin/events" className="text-blue-500 underline mt-2 block">행사 목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen flex flex-col h-screen">
      {/* 상단 헤더 */}
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <Link href="/admin/events" className="text-sm font-bold text-gray-400 hover:text-gray-600 mb-2 inline-block">
            ← 행사 목록으로
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2">
            <span className="text-purple-600">{currentEvent?.name || "로딩 중..."}</span> 메뉴 구성
          </h1>
        </div>
        
        {/* 나중에 구현할 '이전 행사 메뉴 불러오기' 버튼 자리 */}
        <button className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-lg shadow hover:bg-gray-700">
          📥 이전 행사 메뉴 불러오기 (예정)
        </button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden pb-8">
        {/* 왼쪽: 글로벌 창고 (Inventory) */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
            📦 전체 창고 재고 목록
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {!globalInventory?.length ? (
              <p className="text-gray-400 text-sm">창고가 비어있습니다.</p>
            ) : (
              globalInventory.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <span className="text-xs font-bold text-gray-400 block">{item.category}</span>
                    <span className="font-bold text-gray-800">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-500">재고: {item.stock}</span>
                    <button 
                      onClick={() => handleAddToMenu(item)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded hover:bg-blue-200"
                    >
                      메뉴로 담기 →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 오른쪽: 이번 행사의 메뉴판 (Products) */}
        <div className="flex-1 flex flex-col bg-purple-50 rounded-xl shadow border border-purple-200 overflow-hidden">
          <div className="p-4 bg-purple-100 border-b border-purple-200 font-bold text-purple-800 flex justify-between">
            <span>📋 이번 행사 판매 메뉴</span>
            <span className="bg-white px-2 py-0.5 rounded text-xs text-purple-600">{eventProducts?.length || 0}개</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!eventProducts?.length ? (
              <div className="h-full flex flex-col items-center justify-center text-purple-300">
                <span className="text-4xl mb-2">🍽️</span>
                <p>왼쪽 창고에서 팔 물건을 담아주세요.</p>
              </div>
            ) : (
              eventProducts.map(product => (
                <div key={product.id} className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                  <div>
                    <h4 className="font-bold text-gray-800">{product.name}</h4>
                    <p className="text-blue-600 font-extrabold">{product.price.toLocaleString()}원</p>
                  </div>
                  <button 
                    onClick={() => handleRemoveFromMenu(product.id!)}
                    className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-100"
                    title="메뉴에서 빼기"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Next.js 14에서 useSearchParams를 안전하게 사용하기 위한 감싸기
export default function ProductsManagementPage() {
  return (
    <Suspense fallback={<div className="p-8">로딩 중...</div>}>
      <MenuManager />
    </Suspense>
  );
}