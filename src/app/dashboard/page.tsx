"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Product, SalesLog } from "@/lib/db";
import { resetDatabase } from "@/lib/seed";
import ProductList from "@/components/ProductList";
import RecentSales from "@/components/RecentSales";

interface CartItem extends Product {
  cartQty: number;
}

function POSManager() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL에서 eventId 추출
  const eventIdParam = searchParams.get("eventId");
  const eventId = eventIdParam ? parseInt(eventIdParam, 10) : 0;

  // 현재 행사 정보 가져오기 (헤더에 표시용)
  const currentEvent = useLiveQuery(() => db.events.get(eventId), [eventId]);

  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item
        );
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) =>
      prev.map((item) => item.id === productId ? { ...item, cartQty: item.cartQty - 1 } : item)
          .filter((item) => item.cartQty > 0)
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.cartQty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!confirm(`총 ${totalAmount.toLocaleString()}원 결제하시겠습니까?`)) return;

    try {
      await db.transaction("rw", [db.inventory, db.salesLogs, db.inventoryLogs], async () => {
        // 1. 재고 1차 검증
        for (const item of cart) {
          for (const component of item.components) {
            const inventoryItem = await db.inventory.get(component.itemId);
            if (!inventoryItem || inventoryItem.stock < (item.cartQty * component.qty)) {
              throw new Error(`'${inventoryItem?.name || '상품'}' 재고 부족! (잔여: ${inventoryItem?.stock})`);
            }
          }
        }

        const timestamp = new Date();
        
        // 2. 결제 및 재고 차감 처리
        for (const item of cart) {
          // 🌟 핵심: 영수증에 이번 행사 ID(eventId)를 명확히 기록합니다!
          await db.salesLogs.add({
            type: "SELL",
            productId: item.id!,
            count: item.cartQty,
            totalPrice: item.price * item.cartQty,
            paymentMethod: "CASH",
            timestamp: timestamp,
            eventId: eventId, 
          });

          for (const component of item.components) {
            const inventoryItem = await db.inventory.get(component.itemId);
            const deductQty = item.cartQty * component.qty;
            const newStock = inventoryItem!.stock - deductQty;

            await db.inventory.update(component.itemId, { stock: newStock });
            
            // 재고 변동 내역에도 행사 ID 기록
            await db.inventoryLogs.add({
              itemId: component.itemId,
              changeQty: -deductQty,
              currentStock: newStock,
              reason: "SELL",
              timestamp: timestamp,
              eventId: eventId
            });
          }
        }
      });

      alert("결제 완료!");
      setCart([]); 
    } catch (error: any) {
      alert(error.message || "결제 실패");
    }
  };

  // 기존에 만들었던 완벽한 환불 로직 (eventId 기록 부분만 추가)
  const handleRefundRequest = async (log: SalesLog) => {
    const existingRefunds = await db.salesLogs.where({ originalSaleId: log.id }).toArray();
    const alreadyRefundedCount = existingRefunds.reduce((sum, r) => sum + r.count, 0);
    const refundableQty = log.count - alreadyRefundedCount;

    if (refundableQty <= 0) { alert("이미 전량 환불 처리된 거래입니다."); return; }

    const input = prompt(`몇 개를 환불하시겠습니까? (최대: ${refundableQty}개)`);
    if (!input) return;
    
    const refundQty = parseInt(input, 10);
    if (isNaN(refundQty) || refundQty <= 0 || refundQty > refundableQty) return;

    try {
      await db.transaction("rw", [db.inventory, db.salesLogs, db.products, db.inventoryLogs], async () => {
        const product = await db.products.get(log.productId);
        if (!product) throw new Error("상품 데이터를 찾을 수 없습니다.");

        const unitPrice = log.totalPrice / log.count;
        const refundTotal = unitPrice * refundQty;
        const timestamp = new Date();

        await db.salesLogs.add({
          type: "REFUND",
          productId: log.productId,
          count: refundQty,
          totalPrice: -refundTotal,
          paymentMethod: log.paymentMethod,
          timestamp: timestamp,
          eventId: eventId, // 환불 로그에도 행사 ID 기록
          originalSaleId: log.id
        });

        for (const component of product.components) {
          const invItem = await db.inventory.get(component.itemId);
          if (invItem) {
            const restoreQty = refundQty * component.qty;
            const newStock = invItem.stock + restoreQty;
            await db.inventory.update(invItem.id!, { stock: newStock });

            await db.inventoryLogs.add({
              itemId: invItem.id!,
              changeQty: restoreQty,
              currentStock: newStock,
              reason: "REFUND",
              timestamp: timestamp,
              eventId: eventId
            });
          }
        }
      });
      alert(`${refundQty}개 환불 완료`);
    } catch (error: any) {
      alert(error.message || "환불 실패");
    }
  };

  if (!eventId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h2 className="text-2xl font-bold mb-4">선택된 행사가 없습니다.</h2>
        <button onClick={() => router.push("/admin/events")} className="px-6 py-3 bg-blue-600 text-white rounded-lg">
          행사 컨트롤러로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col h-screen">
      <header className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin/events")} className="text-gray-300 hover:text-white text-sm">
            ← 나가기
          </button>
          <h1 className="text-xl font-bold">
            POS <span className="text-purple-300 ml-2 text-sm px-2 py-1 bg-gray-700 rounded-full">{currentEvent?.name}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={resetDatabase} className="px-3 py-2 bg-gray-700 text-xs rounded hover:bg-gray-600">DB 리셋</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 overflow-y-auto bg-gray-50 p-2">
          {/* 자식 컴포넌트에게 eventId를 넘겨줍니다! */}
          <ProductList eventId={eventId} onAddToCart={addToCart} />
        </section>

        <aside className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-20">
          <div className="h-[60%] flex flex-col border-b-4 border-gray-100">
            <div className="p-3 bg-gray-800 text-white font-bold flex justify-between items-center shrink-0">
              <span>장바구니</span>
              <span className="bg-gray-600 px-2 py-0.5 rounded-full text-xs">{cart.length}건</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                    <p className="text-blue-600 font-bold text-xs">{(item.price * item.cartQty).toLocaleString()}원</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.id!)} className="w-6 h-6 bg-red-100 text-red-500 rounded font-bold">-</button>
                    <span className="text-sm font-bold w-4 text-center">{item.cartQty}</span>
                    <button onClick={() => addToCart(item)} className="w-6 h-6 bg-blue-100 text-blue-500 rounded font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button 
                onClick={handleCheckout} disabled={cart.length === 0}
                className={`w-full py-3 rounded-lg font-bold text-white transition-all ${cart.length === 0 ? "bg-gray-300" : "bg-blue-600 hover:bg-blue-700 active:scale-95"}`}
              >
                {totalAmount.toLocaleString()}원 결제하기
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
            <div className="p-2 bg-gray-200 text-gray-600 text-xs font-bold uppercase shrink-0">Recent Activity</div>
            <div className="flex-1 overflow-y-auto p-2">
              {/* 자식 컴포넌트에게 eventId를 넘겨줍니다! */}
              <RecentSales eventId={eventId} onRefundClick={handleRefundRequest} />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8">로딩 중...</div>}>
      <POSManager />
    </Suspense>
  );
}