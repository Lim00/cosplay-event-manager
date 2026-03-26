"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Product } from "@/lib/db";

interface CartItem extends Product { cartQty: number; }

export default function ReservationsPage() {
  const events = useLiveQuery(() => db.events.orderBy("date").reverse().toArray());
  const [selectedEventId, setSelectedEventId] = useState<number | "">("");
  const products = useLiveQuery(
    () => selectedEventId ? db.products.where({ eventId: Number(selectedEventId) }).toArray() : Promise.resolve([] as Product[]),
    [selectedEventId]
  );
  const reservations = useLiveQuery(() => db.reservations.toArray());

  const [customerName, setCustomerName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === p.id);
      if (existing) return prev.map(item => item.id === p.id ? { ...item, cartQty: item.cartQty + 1 } : item);
      return [...prev, { ...p, cartQty: 1 }];
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.cartQty, 0);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || cart.length === 0) return alert("행사와 상품을 선택해주세요.");
    if (phoneLast4.length !== 4) return alert("전화번호 뒷자리 4자리를 정확히 입력해주세요.");

    try {
      await db.transaction("rw", [db.reservations, db.inventory, db.inventoryLogs, db.products], async () => {
        // 1. 재고 검증
        for (const item of cart) {
          for (const comp of item.components) {
            const inv = await db.inventory.get(comp.itemId);
            if (!inv || inv.stock < (item.cartQty * comp.qty)) {
              throw new Error(`[${item.name}]의 재고가 부족하여 예약을 잡을 수 없습니다.`);
            }
          }
        }

        const timestamp = new Date();

        // 2. 예약 데이터 생성
        await db.reservations.add({
          eventId: Number(selectedEventId),
          customerName,
          phoneLast4,
          items: cart.map(c => ({ productId: c.id!, name: c.name, qty: c.cartQty, price: c.price })),
          totalAmount,
          isPickedUp: false,
          timestamp
        });

        // 3. 🌟 핵심: 재고 즉시 차감 (Lock)
        for (const item of cart) {
          for (const comp of item.components) {
            const inv = await db.inventory.get(comp.itemId);
            const deductQty = item.cartQty * comp.qty;
            const newStock = inv!.stock - deductQty;
            
            await db.inventory.update(inv!.id!, { stock: newStock });
            await db.inventoryLogs.add({
              itemId: inv!.id!, changeQty: -deductQty, currentStock: newStock,
              reason: "RESERVE", timestamp, eventId: Number(selectedEventId), memo: `선입금 예약 (${customerName})`
            });
          }
        }
      });
      alert("선입금 예약이 등록되었습니다! (재고 차감 완료)");
      setCustomerName(""); setPhoneLast4(""); setCart([]);
    } catch (error: any) {
      alert(error.message || "예약 등록 실패");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex gap-8">
      {/* 왼쪽: 예약 폼 */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-6">📝 새 선입금 등록</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <select value={selectedEventId} onChange={(e) => { setSelectedEventId(e.target.value ? Number(e.target.value) : ""); setCart([]); }} className="w-full p-3 border rounded-lg bg-gray-50 outline-none font-bold">
            <option value="">-- 행사 선택 --</option>
            {events?.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          
          {selectedEventId && (
            <div className="border p-4 rounded-lg bg-gray-50">
              <h3 className="font-bold text-sm text-gray-500 mb-2">메뉴에서 클릭하여 추가</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {products?.map(p => (
                  <button type="button" key={p.id} onClick={() => addToCart(p)} className="px-3 py-1 bg-white border rounded text-sm hover:border-purple-500 active:scale-95 transition-all">
                    {p.name} <span className="text-purple-600 font-bold ml-1">{p.price}원</span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm">
                    <span>{item.name}</span>
                    <span className="font-bold text-purple-600">{item.cartQty}개</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <input required type="text" placeholder="예약자명 (예: 김명방)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="flex-1 p-3 border rounded-lg bg-gray-50 outline-none focus:border-purple-500" />
            <input required type="text" placeholder="전화번호 뒷자리 (예: 1234)" maxLength={4} value={phoneLast4} onChange={(e) => setPhoneLast4(e.target.value)} className="w-1/3 p-3 border rounded-lg bg-gray-50 outline-none focus:border-purple-500 text-center" />
          </div>

          <button type="submit" disabled={cart.length === 0} className={`w-full py-4 rounded-lg font-bold text-white transition-all ${cart.length === 0 ? "bg-gray-300" : "bg-purple-600 hover:bg-purple-700"}`}>
            총 {totalAmount.toLocaleString()}원 예약 확정 (재고 차감)
          </button>
        </form>
      </div>

      {/* 오른쪽: 예약 리스트 요약 */}
      <div className="w-80 bg-gray-50 p-6 rounded-2xl border border-gray-200 overflow-y-auto max-h-[80vh]">
        <h3 className="font-bold text-gray-800 mb-4">현재 등록된 예약 현황</h3>
        <div className="space-y-3">
          {reservations?.filter(r => r.eventId === Number(selectedEventId)).map(r => (
            <div key={r.id} className={`p-3 rounded-xl border bg-white ${r.isPickedUp ? "opacity-50 border-gray-200" : "border-purple-200"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">{r.customerName} ({r.phoneLast4})</span>
                {r.isPickedUp ? <span className="text-xs bg-gray-200 px-2 py-1 rounded font-bold text-gray-500">수령완료</span> : <span className="text-xs bg-purple-100 px-2 py-1 rounded font-bold text-purple-600">대기중</span>}
              </div>
              <div className="text-xs text-gray-500 line-clamp-1">{r.items.map(i => `${i.name} ${i.qty}개`).join(", ")}</div>
            </div>
          ))}
          {!selectedEventId && <p className="text-sm text-gray-400">행사를 선택하면 예약 목록이 표시됩니다.</p>}
        </div>
      </div>
    </div>
  );
}