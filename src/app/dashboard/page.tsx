"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Product, SalesLog } from "@/lib/db";
import { resetDatabase } from "@/lib/seed";
import ProductList from "@/components/ProductList";
import RecentSales from "@/components/RecentSales";
import SearchBar from "@/components/SearchBar";

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

  // Reservation 모달 상태 및 검색어 상태
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // 이 행사의 전체 예약 중 아직 수령 안 한(대기 중인) 예약만 메모리로 불러오기
  const pendingReservations = useLiveQuery(
    () => db.reservations.toArray().then(arr => arr.filter(r => r.eventId === eventId && !r.isPickedUp)),
    [eventId]
  );

  // 검색어로 필터링 (이름 또는 번호 뒷자리)
  const filteredReservations = useMemo(() => {
    if (!pendingReservations) return [];
    return pendingReservations.filter(r =>
      r.customerName.includes(searchQuery) || r.phoneLast4.includes(searchQuery)
    );
  }, [pendingReservations, searchQuery]);

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

  const handlePickup = async (reservation: any) => {
    if (!confirm(`[${reservation.customerName}] 님의 예약을 수령 완료 처리하시겠습니까?`)) return;

    try {
      await db.transaction("rw", [db.reservations, db.salesLogs], async () => {
        // 1. 예약 상태 업데이트
        await db.reservations.update(reservation.id, { isPickedUp: true });

        // 2. 매출 인식 (PREPAID). 재고는 이미 깎였으므로 inventory 테이블은 건드리지 않음!
        const timestamp = new Date();
        for (const item of reservation.items) {
          await db.salesLogs.add({
            type: "SELL",
            productId: item.productId,
            count: item.qty,
            totalPrice: item.price * item.qty,
            paymentMethod: "PREPAID", // 🌟 선입금 마킹!
            timestamp: timestamp,
            eventId: eventId,
          });
        }
      });
      alert("수령 처리가 완료되었습니다!");
      setSearchQuery("");
    } catch (error) {
      alert("수령 처리 중 오류가 발생했습니다.");
    }
  };

  // 🌟 [New] 파본 교환 처리 로직
  const handleExchangeRequest = async (log: SalesLog) => {
    const input = prompt(`몇 개를 파본 교환하시겠습니까? (최대: ${log.count}개)`);
    if (!input) return;

    const exchangeQty = parseInt(input, 10);
    if (isNaN(exchangeQty) || exchangeQty <= 0 || exchangeQty > log.count) {
      return alert("잘못된 수량입니다.");
    }

    try {
      await db.transaction("rw", [db.inventory, db.salesLogs, db.products, db.inventoryLogs], async () => {
        const product = await db.products.get(log.productId);
        if (!product) throw new Error("상품 데이터를 찾을 수 없습니다.");

        // 1. 손님에게 내어줄 정상품 재고가 창고에 남아있는지 먼저 검사합니다.
        for (const component of product.components) {
          const invItem = await db.inventory.get(component.itemId);
          const deductQty = exchangeQty * component.qty;
          if (!invItem || invItem.stock < deductQty) {
            throw new Error(`교환해줄 정상품 '${invItem?.name}'의 재고가 부족합니다! (현재: ${invItem?.stock || 0}개)`);
          }
        }

        const timestamp = new Date();

        // 2. 매출은 0원이지만, 영수증(SalesLog)에 교환 기록을 남깁니다.
        await db.salesLogs.add({
          type: "EXCHANGE",
          productId: log.productId,
          count: exchangeQty,
          totalPrice: 0, // 🌟 교환이므로 수익/매출 변동 없음 (0원)
          paymentMethod: log.paymentMethod,
          timestamp: timestamp,
          eventId: eventId,
          originalSaleId: log.id // 원본 영수증 참조
        });

        // 3. 글로벌 창고에서 물리적 재고를 차감하고, 장부에 '파본 교환' 사유를 남깁니다.
        for (const component of product.components) {
          const invItem = await db.inventory.get(component.itemId);
          if (invItem) {
            const deductQty = exchangeQty * component.qty;
            const newStock = invItem.stock - deductQty; // 정상품을 꺼내주므로 재고 감소(-)

            await db.inventory.update(invItem.id!, { stock: newStock });

            await db.inventoryLogs.add({
              itemId: invItem.id!,
              changeQty: -deductQty,
              currentStock: newStock,
              reason: "EXCHANGE",
              timestamp: timestamp,
              eventId: eventId,
              memo: `파본 교환 처리 (원본 거래 #${log.id})`
            });
          }
        }
      });
      alert(`${exchangeQty}개 파본 교환이 완료되었습니다. (재고 -${exchangeQty})`);
    } catch (error: any) {
      alert(error.message || "교환 실패");
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
          <button onClick={() => router.push("/admin/events")} className="text-gray-300 hover:text-white text-sm">← 나가기</button>
          <h1 className="text-xl font-bold">POS <span className="text-purple-300 ml-2 text-sm px-2 py-1 bg-gray-700 rounded-full">{currentEvent?.name}</span></h1>
        </div>
        <div className="flex gap-3 items-center">
          {/* 🌟 수령 버튼 추가 */}
          <button
            onClick={() => setIsPickupModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 shadow flex items-center gap-2"
          >
            📦 선입금 픽업 <span className="bg-purple-800 px-1.5 py-0.5 rounded-full text-xs">{pendingReservations?.length || 0}</span>
          </button>
          <button
            disabled // 🌟 비활성화 속성 추가
            onClick={resetDatabase}
            className="px-3 py-2 bg-gray-200 text-gray-400 text-xs rounded cursor-not-allowed opacity-50" // 🌟 스타일 변경
          >
            DB 리셋 (비활성)
          </button>
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
              <RecentSales
                eventId={eventId}
                onRefundClick={handleRefundRequest}
                onExchangeClick={handleExchangeRequest}
              />
            </div>
          </div>
        </aside>
        {isPickupModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col h-[80vh] shadow-2xl overflow-hidden">
              <div className="p-6 bg-gray-50 border-b flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold text-gray-800">📦 선입금 예약 수령</h2>
                <button onClick={() => setIsPickupModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
              </div>

              <div className="p-6 shrink-0 border-b border-gray-100">
                {/* 🌟 재사용 가능한 SearchBar 등장! */}
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="예약자 이름이나 번호 뒷자리(예: 1234)를 입력하세요..."
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-3">
                {filteredReservations?.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 font-bold">대기 중인 예약 내역이 없습니다.</div>
                ) : (
                  filteredReservations?.map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                      <div>
                        <div className="text-lg font-black text-gray-800 mb-1">
                          {r.customerName} <span className="text-sm font-bold text-gray-400 ml-1">({r.phoneLast4})</span>
                        </div>
                        <div className="text-sm text-gray-500 font-bold">
                          {r.items.map(i => `${i.name} ${i.qty}개`).join(" + ")}
                        </div>
                      </div>
                      <button
                        onClick={() => handlePickup(r)}
                        className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-md"
                      >
                        수령 완료
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
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