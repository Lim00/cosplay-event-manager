"use client";

import { useState, useMemo, Suspense } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Inventory, Product } from "@/lib/db";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";

function ProductsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");
  const eventId = eventIdParam ? parseInt(eventIdParam, 10) : 0;

  // 🌟 [State] 상태 관리
  const [searchQuery, setSearchQuery] = useState("");
  const [importEventId, setImportEventId] = useState<number | "">("");
  
  // 가격 조정 모달용 상태
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");

  // 체크박스 상태 관리 (Set을 사용하여 성능 최적화)
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  // 🌟 [Data] DB 쿼리
  const currentEvent = useLiveQuery(() => db.events.get(eventId), [eventId]);
  const allEvents = useLiveQuery(() => db.events.orderBy("date").reverse().toArray());
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const eventProducts = useLiveQuery(
    () => db.products.where({ eventId }).toArray(),
    [eventId]
  );

  // 🌟 [Memoization] 검색어 기반 재고 필터링
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    if (!searchQuery) return inventory;
    
    const lowerQuery = searchQuery.toLowerCase();
    return inventory.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) || 
      item.category.toLowerCase().includes(lowerQuery)
    );
  }, [inventory, searchQuery]);

  // 체크박스 개별 토글
  const toggleCheck = (id: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 검색/필터링된 목록 전체 선택 및 해제
  const toggleAll = () => {
    if (!filteredInventory) return;
    const allFilteredIds = filteredInventory.map(i => i.id!);
    const isAllChecked = allFilteredIds.length > 0 && allFilteredIds.every(id => checkedIds.has(id));

    if (isAllChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(allFilteredIds));
    }
  };

  // 단일 메뉴 추가
  const handleAddToMenu = async (item: Inventory) => {
    try {
      const exists = eventProducts?.find(p => !p.isBundle && p.components[0].itemId === item.id);
      if (exists) return alert("이미 메뉴판에 등록된 굿즈입니다.");

      await db.products.add({
        eventId: eventId,
        name: item.name, price: item.price, isBundle: false,
        components: [{ itemId: item.id!, qty: 1 }],
      });
    } catch (error) {
      alert("메뉴 등록 실패");
    }
  };

  // 선택된 항목 일괄 추가 (트랜잭션)
  const handleBulkAddToMenu = async () => {
    if (checkedIds.size === 0) return alert("선택된 항목이 없습니다.");

    try {
      const itemsToAdd = inventory?.filter(i => checkedIds.has(i.id!)) || [];
      let addedCount = 0;
      let skippedCount = 0;

      await db.transaction('rw', db.products, async () => {
        for (const item of itemsToAdd) {
          const exists = eventProducts?.find(p => !p.isBundle && p.components[0].itemId === item.id);
          if (exists) {
            skippedCount++;
            continue;
          }
          await db.products.add({
            eventId: eventId,
            name: item.name, price: item.price, isBundle: false,
            components: [{ itemId: item.id!, qty: 1 }],
          });
          addedCount++;
        }
      });

      alert(`✅ ${addedCount}개 항목 일괄 추가 완료!\n(중복으로 스킵됨: ${skippedCount}개)`);
      setCheckedIds(new Set()); 
    } catch (error) {
      alert("일괄 등록 중 오류가 발생했습니다.");
    }
  };

  // 단일 메뉴 삭제
  const handleRemoveFromMenu = async (productId: number) => {
    if (confirm("메뉴판에서 이 항목을 내리시겠습니까? (영수증 기록에는 영향을 주지 않습니다)")) {
      await db.products.delete(productId);
    }
  };

  // 가격 조정 (Sanity Check 포함)
  const handleAdjustPriceMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;

    const newPrice = parseInt(tempPrice, 10);
    if (isNaN(newPrice) || newPrice < 0) return alert("🚫 올바른 가격(숫자)을 0원 이상으로 입력해주세요.");
    if (newPrice > 10000000) return alert("🚫 가격이 너무 높습니다. 단위를 확인해주세요.");

    try {
      await db.products.update(editingProductId, { price: newPrice });
      setEditingProductId(null);
    } catch (error) {
      alert("가격 변경 실패");
    }
  };

  // 이전 행사 메뉴 불러오기
  const handleImportMenu = async () => {
    if (!importEventId) return;
    if (!confirm("선택한 행사의 메뉴 구성을 그대로 복사해 오시겠습니까?")) return;

    try {
      const pastProducts = await db.products.where({ eventId: Number(importEventId) }).toArray();
      let importedCount = 0;
      let skippedCount = 0;

      for (const p of pastProducts) {
        if (eventProducts?.some(ep => ep.name === p.name)) {
          skippedCount++;
          continue;
        }

        let isComponentsValid = true;
        for (const comp of p.components) {
          const invItem = await db.inventory.get(comp.itemId);
          if (!invItem) isComponentsValid = false;
        }

        if (isComponentsValid) {
          await db.products.add({
            eventId: eventId,
            name: p.name, price: p.price, isBundle: p.isBundle,
            components: p.components,
          });
          importedCount++;
        } else {
          skippedCount++;
        }
      }
      
      alert(`✅ ${importedCount}개 메뉴 복사 완료!\n(중복 또는 창고재고 없음으로 스킵됨: ${skippedCount}개)`);
      setImportEventId("");
    } catch (error) {
      alert("메뉴 불러오기 실패");
    }
  };

  const openPriceModal = (productId: number, currentPrice: number) => {
    setEditingProductId(productId);
    setTempPrice(currentPrice.toString());
  };

  if (!eventId) return <div className="p-8">잘못된 접근입니다. 행사 컨트롤러를 통해 진입해주세요.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen flex flex-col h-screen">
      {/* 상단 헤더 & 컨트롤 */}
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <button onClick={() => router.push("/admin/events")} className="text-gray-500 hover:text-gray-800 font-bold mb-2 flex items-center gap-1">
            ← 행사 목록으로
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            📋 메뉴판 구성 <span className="text-purple-600 text-xl ml-2">({currentEvent?.name})</span>
          </h1>
        </div>

        {/* 이전 행사 메뉴 불러오기 UI */}
        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg border border-gray-200">
          <span className="text-sm font-bold text-gray-600 ml-2">과거 행사 불러오기:</span>
          <select 
            value={importEventId} 
            onChange={(e) => setImportEventId(e.target.value ? Number(e.target.value) : "")}
            className="p-2 border rounded bg-white text-sm outline-none font-bold text-gray-700"
          >
            <option value="">-- 행사 선택 --</option>
            {allEvents?.filter(e => e.id !== eventId).map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button 
            onClick={handleImportMenu} disabled={!importEventId}
            className="px-3 py-2 bg-purple-600 text-white font-bold text-sm rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          >
            복사하기
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* ---------------- 왼쪽: 창고 재고 리스트 ---------------- */}
        <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
          <div className="mb-4 shrink-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-gray-800">📦 1. 창고에서 굿즈 고르기</h2>
              
              {/* 일괄 추가 액션 버튼 */}
              {checkedIds.size > 0 && (
                <button 
                  onClick={handleBulkAddToMenu}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 animate-pulse-once"
                >
                  선택한 {checkedIds.size}개 일괄 추가 ➔
                </button>
              )}
            </div>
            
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="이름이나 카테고리로 검색하세요..." />
            
            {/* 전체 선택 체크박스 */}
            <div className="flex items-center gap-2 mt-2 px-2 pb-2 border-b border-gray-100">
              <input 
                type="checkbox" 
                id="selectAll"
                className="w-4 h-4 cursor-pointer accent-blue-600"
                checked={filteredInventory?.length > 0 && filteredInventory.every(i => checkedIds.has(i.id!))}
                onChange={toggleAll}
              />
              <label htmlFor="selectAll" className="text-sm font-bold text-gray-600 cursor-pointer select-none">
                {searchQuery ? "검색 결과 전체 선택" : "전체 선택"}
              </label>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 pr-2 space-y-2">
            {!filteredInventory?.length ? (
              <p className="text-center text-gray-400 mt-10 text-sm">검색 결과가 없습니다.</p>
            ) : (
              filteredInventory.map(item => (
                <label key={item.id} className="flex justify-between items-center p-3 border rounded-xl hover:border-blue-300 transition-colors bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                      checked={checkedIds.has(item.id!)}
                      onChange={() => toggleCheck(item.id!)}
                    />
                    <div>
                      <span className="bg-gray-200 text-xs font-bold px-2 py-0.5 rounded mr-2 text-gray-600">{item.category}</span>
                      <span className="font-bold text-gray-800">{item.name}</span>
                      <span className="ml-2 text-sm font-bold text-gray-500">{item.price.toLocaleString()}원</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); handleAddToMenu(item); }} 
                    className="px-4 py-2 bg-gray-200 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    추가
                  </button>
                </label>
              ))
            )}
          </div>
        </div>

        {/* ---------------- 오른쪽: 이번 행사 메뉴판 ---------------- */}
        <div className="flex-1 bg-purple-50 p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col h-full">
          <h2 className="text-xl font-bold text-purple-800 mb-4 shrink-0">📋 2. {currentEvent?.name} 전용 메뉴판</h2>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3">
            {!eventProducts?.length ? (
              <p className="text-center text-purple-400 mt-10 text-sm">아직 등록된 메뉴가 없습니다.<br/>왼쪽에서 굿즈를 추가해주세요!</p>
            ) : (
              eventProducts.map(product => {
                const invItem = inventory?.find(i => i.id === product.components[0]?.itemId);
                const isPriceChanged = !product.isBundle && invItem && invItem.price !== product.price;

                return (
                  <div key={product.id} className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-extrabold text-gray-800 text-lg">
                        {product.name}
                        {product.isBundle && <span className="ml-2 bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded font-bold">세트 상품</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openPriceModal(product.id!, product.price)}
                          className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-500 rounded hover:bg-blue-100 transition-colors"
                          title="가격 수정"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleRemoveFromMenu(product.id!)}
                          className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors"
                          title="메뉴에서 제거"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between mt-auto">
                      <div className="text-xs text-gray-400 font-bold">
                        구성: {product.components.map(c => {
                          const name = inventory?.find(i => i.id === c.itemId)?.name || "알수없음";
                          return `${name} x${c.qty}`;
                        }).join(" + ")}
                      </div>
                      <div className="text-right">
                        {isPriceChanged && (
                          <div className="text-xs text-gray-400 line-through mb-0.5 font-bold">
                            정가 {invItem.price.toLocaleString()}원
                          </div>
                        )}
                        <div className={`font-black text-xl ${isPriceChanged ? 'text-red-500' : 'text-purple-600'}`}>
                          {product.price.toLocaleString()}원
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 🌟 가격 조정 팝업 모달 */}
      {editingProductId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-2">행사 한정 가격 조정</h3>
            <p className="text-sm text-gray-500 mb-4">창고의 원가에는 영향을 주지 않으며, 이번 행사 메뉴판과 영수증에만 적용됩니다.</p>
            
            <form onSubmit={handleAdjustPriceMenu}>
              <input 
                autoFocus
                type="number" 
                value={tempPrice} 
                onChange={(e) => setTempPrice(e.target.value)} 
                placeholder="새로운 가격 입력"
                className="w-full p-4 text-xl font-bold border-2 border-blue-100 rounded-xl focus:border-blue-500 outline-none text-right mb-6"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingProductId(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200">
                  취소
                </button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                  적용하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 font-bold text-gray-500">메뉴판 데이터를 불러오는 중...</div>}>
      <ProductsManager />
    </Suspense>
  );
}