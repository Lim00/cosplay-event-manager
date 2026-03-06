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

  // --- [Logic 5] 완벽한 환불 처리 함수 ---
  const handleRefundRequest = async (log: SalesLog) => {
    // 1. [Validation] 이미 전량 환불되었는지 계산하기
    // db.salesLogs.where() 를 써서 이 원본 거래(log.id)를 가리키는 환불 내역들을 싹 다 가져옵니다.
    const existingRefunds = await db.salesLogs
      .where({ originalSaleId: log.id })
      .toArray();
    
    // 지금까지 환불된 총 수량 계산
    const alreadyRefundedCount = existingRefunds.reduce((sum, r) => sum + r.count, 0);
    const refundableQty = log.count - alreadyRefundedCount;

    if (refundableQty <= 0) {
      alert("이미 전량 환불 처리된 거래입니다.");
      return;
    }

    // 2. [Interaction] 사용자에게 환불 수량 입력받기 (부분 환불 지원)
    const input = prompt(`몇 개를 환불하시겠습니까? (최대 환불 가능 수량: ${refundableQty}개)`);
    if (!input) return; // 취소 누름
    
    const refundQty = parseInt(input, 10);
    if (isNaN(refundQty) || refundQty <= 0 || refundQty > refundableQty) {
      alert("잘못된 수량을 입력하셨습니다.");
      return;
    }

    // 3. [Transaction] DB 원복 로직 (핵심!)
    try {
      // 관련된 4개 테이블을 모두 rw(Read/Write) 모드로 엽니다.
      await db.transaction("rw", db.inventory, db.salesLogs, db.products, db.inventoryLogs, async () => {
        
        // A. 원래 팔렸던 메뉴(Product) 정보 가져오기 (단가 계산 및 구성품 확인용)
        const product = await db.products.get(log.productId);
        if (!product) throw new Error("상품 데이터를 찾을 수 없어 환불할 수 없습니다.");

        const unitPrice = log.totalPrice / log.count; // 단가 (세트 할인 등이 적용된 실제 구매가)
        const refundTotal = unitPrice * refundQty;    // 돌려줄 금액

        const timestamp = new Date();

        // B. 환불 로그(마이너스 매출) 생성
        await db.salesLogs.add({
          type: "REFUND",
          productId: log.productId,
          count: refundQty,
          totalPrice: -refundTotal, // 중요: 마이너스로 넣어야 나중에 sum() 할 때 알아서 매출이 깎임!
          paymentMethod: log.paymentMethod,
          timestamp: timestamp,
          eventId: log.eventId,
          originalSaleId: log.id // 원본 거래 ID 꼬리표 붙이기
        });

        // C. 물리적 재고 복구 및 로그(InventoryLog) 작성
        for (const component of product.components) {
          const invItem = await db.inventory.get(component.itemId);
          if (invItem) {
            // (환불할 세트 수량) * (세트 내 구성품 개수) = 돌아올 실제 물리적 재고량
            const restoreQty = refundQty * component.qty;
            const newStock = invItem.stock + restoreQty;

            // 재고 업데이트
            await db.inventory.update(invItem.id!, { stock: newStock });

            // [New!] 재고 변동 이력에 '환불로 인한 입고' 기록
            await db.inventoryLogs.add({
              itemId: invItem.id!,
              changeQty: restoreQty, // + 수량
              currentStock: newStock,
              reason: "REFUND",
              timestamp: timestamp,
              eventId: log.eventId
            });
          }
        }
      });

      alert(`${refundQty}개 환불 및 재고 복구가 완료되었습니다.`);
      
    } catch (error: any) {
      console.error("환불 트랜잭션 실패:", error);
      alert(error.message || "환불 처리 중 오류가 발생했습니다.");
    }
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