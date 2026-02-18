"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { resetDatabase } from "@/lib/seed";
import { db, Product, SalesLog } from "@/lib/db"; // SalesLog 타입 추가
import ProductList from "@/components/ProductList";
import RecentSales from "@/components/RecentSales"; // 새로 만든 컴포넌트 임포트

// 장바구니 아이템 타입 정의 (기존 Product에 수량만 추가)
interface CartItem extends Product {
  cartQty: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // --- [State] 상태 관리 ---
  const [cart, setCart] = useState<CartItem[]>([]);

  // --- [Effect] 로그인 체크 ---
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // --- [Logic 1] 장바구니 담기 ---
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

  // --- [Logic 2] 장바구니 빼기 ---
  const removeFromCart = (productId: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, cartQty: item.cartQty - 1 } : item
        )
        .filter((item) => item.cartQty > 0)
    );
  };

  // --- [Logic 3] 총 금액 계산 ---
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.cartQty, 0);

  // --- [Logic 4] 결제 처리 (재고 방어 포함) ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!confirm(`총 ${totalAmount.toLocaleString()}원 결제하시겠습니까?`)) return;

    try {
      await db.transaction("rw", db.inventory, db.salesLogs, async () => {
        // 1. 재고 확인 (부족하면 에러 던짐)
        for (const item of cart) {
          for (const component of item.components) {
            const inventoryItem = await db.inventory.get(component.itemId);
            if (!inventoryItem || inventoryItem.stock < (item.cartQty * component.qty)) {
              throw new Error(`'${inventoryItem?.name || '상품'}' 재고 부족! (잔여: ${inventoryItem?.stock})`);
            }
          }
        }

        // 2. 판매 기록 및 재고 차감
        const timestamp = new Date();
        for (const item of cart) {
          await db.salesLogs.add({
            type: "SELL",
            productId: item.id!,
            count: item.cartQty,
            totalPrice: item.price * item.cartQty,
            paymentMethod: "CASH",
            timestamp: timestamp,
            eventId: 1, // (임시) 나중에 행사 선택 기능이 생기면 동적으로 바뀔 예정
          });

          for (const component of item.components) {
            const inventoryItem = await db.inventory.get(component.itemId);
            await db.inventory.update(component.itemId, {
              stock: inventoryItem!.stock - (item.cartQty * component.qty),
            });
          }
        }
      });

      alert("결제 완료!");
      setCart([]); // 장바구니 비우기
    } catch (error: any) {
      console.error(error);
      alert(error.message || "결제 실패");
    }
  };

  // --- [Logic 5] 환불 요청 (임시 함수) ---
  const handleRefundRequest = (log: SalesLog) => {
    // 다음 단계에서 여기에 진짜 환불 로직을 작성할 예정입니다.
    alert(`[개발 중] 거래 #${log.id}번을 환불하시겠습니까?\n(확인 누르면 아직 아무 일도 안 일어납니다 XD)`);
  };

  // 로딩 화면
  if (status === "loading") return <p className="p-8">로딩 중...</p>;

  // --- [View] 화면 렌더링 ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col h-screen">
      
      {/* 1. 상단 헤더 */}
      <header className="bg-white shadow-sm px-6 py-3 flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">POS System</h1>
        </div>
        <div className="flex gap-2">
           <button onClick={resetDatabase} className="px-3 py-2 bg-gray-200 text-xs rounded hover:bg-gray-300">
            DB 리셋
          </button>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="px-3 py-2 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200">
            로그아웃
          </button>
        </div>
      </header>

      {/* 2. 메인 컨텐츠 (좌우 분할) */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* [왼쪽 구역] 상품 목록 (메뉴판) */}
        <section className="flex-1 overflow-y-auto bg-gray-50 p-2">
          <ProductList onAddToCart={addToCart} />
        </section>

        {/* [오른쪽 구역] 사이드바 (장바구니 + 최근 거래) */}
        <aside className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-20">
          
          {/* [오른쪽-상단] 장바구니 (높이 60% 차지) */}
          <div className="h-[60%] flex flex-col border-b-4 border-gray-100">
            {/* 장바구니 헤더 */}
            <div className="p-3 bg-gray-800 text-white font-bold flex justify-between items-center shrink-0">
              <span>장바구니</span>
              <span className="bg-gray-600 px-2 py-0.5 rounded-full text-xs">{cart.length}건</span>
            </div>

            {/* 장바구니 아이템 리스트 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <span className="text-4xl">🛒</span>
                  <p>상품을 선택해주세요</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                      <p className="text-blue-600 font-bold text-xs">
                        {(item.price * item.cartQty).toLocaleString()}원
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(item.id!)} className="w-6 h-6 bg-red-100 text-red-500 rounded font-bold">-</button>
                      <span className="text-sm font-bold w-4 text-center">{item.cartQty}</span>
                      <button onClick={() => addToCart(item)} className="w-6 h-6 bg-blue-100 text-blue-500 rounded font-bold">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 결제 버튼 영역 */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <div className="flex justify-between font-bold mb-2">
                <span>합계</span>
                <span className="text-blue-600 text-lg">{totalAmount.toLocaleString()}원</span>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`w-full py-3 rounded-lg font-bold text-white transition-all
                  ${cart.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-95"}
                `}
              >
                결제하기
              </button>
            </div>
          </div>

          {/* [오른쪽-하단] 최근 거래 내역 (나머지 높이 차지) */}
          <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
            <div className="p-2 bg-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider shrink-0">
              Recent Activity
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {/* 여기에 새로 만든 컴포넌트를 끼워 넣었습니다! */}
              <RecentSales onRefundClick={handleRefundRequest} />
            </div>
          </div>

        </aside>
      </main>
    </div>
  );
}