"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Inventory } from "@/lib/db";
import SearchBar from "@/components/SearchBar"; // 🌟 [New] 컴포넌트 불러오기

type SortKey = "category" | "name" | "price" | "stock";
type SortOrder = "asc" | "desc";

export default function InventoryManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Inventory | null>(null);

  // 정렬 상태 관리
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  
  // 🌟 [New] 검색어 상태 관리
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "", category: "", price: "", stock: "", description: "", memo: "",
  });

  const inventories = useLiveQuery(() => db.inventory.toArray());
  const uniqueCategories = Array.from(new Set(inventories?.map(item => item.category) || []));

  // 🌟 [New] 검색(Filter) + 정렬(Sort)이 결합된 데이터 파이프라인
  const processedInventories = useMemo(() => {
    if (!inventories) return [];
    
    // 1. 먼저 검색어로 필터링 (이름 또는 카테고리에 검색어가 포함되어 있는지 대소문자 무시하고 검사)
    const filtered = inventories.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. 필터링된 결과를 정렬
    return filtered.sort((a, b) => {
      const valueA = a[sortKey];
      const valueB = b[sortKey];

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortOrder === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }
      
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
      }

      return 0;
    });
  }, [inventories, sortKey, sortOrder, searchQuery]); // searchQuery가 바뀔 때마다 즉시 재계산

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return "↕️";
    return sortOrder === "asc" ? "🔼" : "🔽";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseInt(formData.price, 10);
    const stock = parseInt(formData.stock, 10);
    if (isNaN(price) || isNaN(stock)) return alert("숫자를 입력해주세요.");
    
    const finalCategory = formData.category.trim() === "" ? "굿즈" : formData.category;

    try {
      await db.transaction("rw", [db.inventory, db.inventoryLogs], async () => {
        const newItemId = await db.inventory.add({
          name: formData.name, category: finalCategory,
          price, stock, initialStock: stock, description: formData.description,
        });
        await db.inventoryLogs.add({
          itemId: newItemId as number, changeQty: stock, currentStock: stock,
          reason: "ADD", timestamp: new Date(), memo: "최초 입고",
        });
      });
      alert("등록 완료!");
      setIsModalOpen(false);
      setFormData({ name: "", category: "", price: "", stock: "", description: "", memo: "" });
    } catch (error) {
      alert("등록 실패");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const newPrice = parseInt(formData.price, 10);
    const newStock = parseInt(formData.stock, 10);
    if (isNaN(newPrice) || isNaN(newStock)) return alert("숫자를 입력해주세요.");

    const finalCategory = formData.category.trim() === "" ? "굿즈" : formData.category;
    const stockDiff = newStock - editItem.stock;

    try {
      await db.transaction("rw", [db.inventory, db.inventoryLogs], async () => {
        await db.inventory.update(editItem.id!, {
          name: formData.name, category: finalCategory,
          price: newPrice, stock: newStock, description: formData.description,
        });

        if (stockDiff !== 0) {
          await db.inventoryLogs.add({
            itemId: editItem.id!, changeQty: stockDiff, currentStock: newStock,
            reason: "ADJUST", timestamp: new Date(), memo: formData.memo || "사유 미입력",
          });
        }
      });
      alert("수정 완료!");
      setEditItem(null);
    } catch (error) {
      alert("수정 실패");
    }
  };

  const handleDelete = async (itemId: number, itemName: string) => {
    try {
      const allProducts = await db.products.toArray();
      const usedProducts = allProducts.filter(p => p.components.some(c => c.itemId === itemId));

      if (usedProducts.length > 0) {
        for (const product of usedProducts) {
          const event = await db.events.get(product.eventId);
          if (event && (event.status === "OPEN" || event.status === "PREPARING")) {
            alert(`🚫 삭제 불가!\n[${itemName}] 재고는 행사(${event.name})에 등록되어 있습니다.`);
            return;
          }
        }
      }

      if (confirm(`정말로 [${itemName}] 재고를 삭제하시겠습니까?`)) {
        await db.inventory.delete(itemId);
        alert("삭제되었습니다.");
      }
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const openEditModal = (item: Inventory) => {
    setEditItem(item);
    setFormData({
      name: item.name, category: item.category, price: item.price.toString(),
      stock: item.stock.toString(), description: item.description || "", memo: "",
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📦 글로벌 재고 관리</h1>
        </div>
        <button
          onClick={() => { setIsModalOpen(true); setFormData({ name: "", category: "", price: "", stock: "", description: "", memo: "" }); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-md"
        >
          + 새 재고 등록
        </button>
      </div>
      
      {/* 🌟 컴포넌트로 분리된 검색창 적용! */}
      <SearchBar 
        value={searchQuery} 
        onChange={setSearchQuery} 
        placeholder="🔍 굿즈 이름이나 카테고리(예: 아크릴, 엑시아)로 검색해보세요..." 
      />

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 select-none">
              <th className="p-4 font-bold cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort("category")}>
                카테고리 <span className="text-xs ml-1">{getSortIcon("category")}</span>
              </th>
              <th className="p-4 font-bold cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort("name")}>
                이름 <span className="text-xs ml-1">{getSortIcon("name")}</span>
              </th>
              <th className="p-4 font-bold cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort("price")}>
                단가 <span className="text-xs ml-1">{getSortIcon("price")}</span>
              </th>
              <th className="p-4 font-bold cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort("stock")}>
                현재고 <span className="text-xs ml-1">{getSortIcon("stock")}</span>
              </th>
              <th className="p-4 font-bold text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {!processedInventories?.length ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-400">
                  {searchQuery ? "검색 결과가 없습니다." : "등록된 재고가 없습니다."}
                </td>
              </tr>
            ) : (
              processedInventories.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4"><span className="bg-gray-200 px-2 py-1 rounded text-xs font-bold">{item.category}</span></td>
                  <td className="p-4 font-bold text-gray-800">
                    {item.name}
                    <div className="text-xs text-gray-400 font-normal mt-1">{item.description}</div>
                  </td>
                  <td className="p-4 text-blue-600 font-bold">{item.price.toLocaleString()}원</td>
                  <td className="p-4 font-bold">{item.stock}개</td>
                  <td className="p-4 text-center space-x-2 w-32">
                    <button onClick={() => openEditModal(item)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-bold">수정</button>
                    <button onClick={() => handleDelete(item.id!, item.name)} className="px-3 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100 text-sm font-bold">삭제</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 공용 팝업 모달 (생략: 기존 코드와 완전히 동일합니다) */}
      {(isModalOpen || editItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            {/* ... 기존 모달 폼 코드 ... */}
            <h2 className="text-2xl font-bold mb-4">{editItem ? "재고 수정 및 조정" : "새 재고 등록"}</h2>
            
            <form onSubmit={editItem ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">카테고리</label>
                <input list="category-options" className="w-full p-3 border rounded-lg bg-gray-50 focus:border-blue-500 outline-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="직접 입력하거나 목록에서 선택 (기본값: 굿즈)" />
                <datalist id="category-options">{uniqueCategories.map(cat => <option key={cat} value={cat} />)}</datalist>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">굿즈 이름</label>
                <input required type="text" className="w-full p-3 border rounded-lg bg-gray-50 focus:border-blue-500 outline-none" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">단가 (원)</label>
                  <input required type="number" className="w-full p-3 border rounded-lg bg-gray-50 focus:border-blue-500 outline-none" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">{editItem ? "현재고 (수정 시 반영)" : "초기 입고 수량"}</label>
                  <input required type="number" className="w-full p-3 border rounded-lg bg-gray-50 focus:border-blue-500 outline-none" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">굿즈 설명 (옵션)</label>
                <textarea rows={1} className="w-full p-3 border rounded-lg bg-gray-50 focus:border-blue-500 outline-none" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              {editItem && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <label className="block text-sm font-bold text-yellow-800 mb-1">수량 변경 사유 (로그 기록용)</label>
                  <input type="text" placeholder="예: 창고 정리 중 5개 추가 발견, 파손 폐기 등" className="w-full p-2 border rounded bg-white text-sm focus:border-yellow-500 outline-none" value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} />
                </div>
              )}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditItem(null); }} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300">취소</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">{editItem ? "수정 완료" : "등록하기"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}