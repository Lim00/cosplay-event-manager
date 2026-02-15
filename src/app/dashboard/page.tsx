"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { resetDatabase } from "@/lib/seed";
import { db, Product } from "@/lib/db"; // DB 연동
import ProductList from "@/components/ProductList";

// 장바구니 아이템 타입 정의
interface CartItem extends Product {
  cartQty: number; // 장바구니에 담긴 개수
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 1. 장바구니 상태 (State)
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // 2. 장바구니 담기 함수
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        // 이미 있으면 개수만 +1
        return prev.map((item) =>
          item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item
        );
      }
      // 없으면 새로 추가
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  // 3. 장바구니 빼기 함수
  const removeFromCart = (productId: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, cartQty: item.cartQty - 1 } : item
        )
        .filter((item) => item.cartQty > 0) // 개수가 0이면 삭제
    );
  };

  // 4. 총 금액 계산
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.cartQty, 0);

  // 5. 결제 처리 함수 (핵심 로직!)
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!confirm(`총 ${totalAmount.toLocaleString()}원 결제하시겠습니까?`)) return;

    try {
      await db.transaction("rw", db.inventory, db.salesLogs, async () => {
        // [Step 1] 재고 확인 (먼저 검사!)
        for (const item of cart) {
          for (const component of item.components) {
            const inventoryItem = await db.inventory.get(component.itemId);
          
            // 재고가 없거나 부족하면 에러 발생
            if (!inventoryItem || inventoryItem.stock < (item.cartQty * component.qty)) {
              throw new Error(`'${inventoryItem?.name || '상품'}'의 재고가 부족합니다! (남은 수량: ${inventoryItem?.stock || 0})`);
            }
          }
        }

        // [Step 2] 실제 결제 및 차감 (검사 통과 시 실행)
        const timestamp = new Date();
        for (const item of cart) {
          // A. 판매 로그 저장
          await db.salesLogs.add({
            type: "SELL",
            productId: item.id!,
            count: item.cartQty,
            totalPrice: item.price * item.cartQty,
            paymentMethod: "CASH",
            timestamp: timestamp,
          });

          // B. 재고 차감
          for (const component of item.components) {
            const inventoryItem = await db.inventory.get(component.itemId);
            // 위에서 검사 했으므로 여기서 안전하게 차감 가능
            await db.inventory.update(component.itemId, {
              stock: inventoryItem!.stock - (item.cartQty * component.qty),
            });
          }
        }
      });

      alert("결제가 완료되었습니다!");
      setCart([]); // 결제 완료 후 장바구니 초기화
    } catch (error: any) {
      // 트랜잭션 안에서 에러가 발생하면 모든 DB 변경사항이 자동 취소(Rollback)됩니다.
      console.error("결제 실패:", error);
      alert(error.message || "결제 처리 중 오류가 발생했습니다.");
    }
  };

  if (status === "loading") return <p className="p-8">로딩 중...</p>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col h-screen">
      {/* 헤더 */}
      <header className="bg-white shadow-sm px-6 py-3 flex justify-between items-center z-10">
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

      <main className="flex-1 flex overflow-hidden">
        {/* 왼쪽: 상품 목록 */}
        <section className="flex-1 overflow-y-auto bg-gray-50 p-2">
          <ProductList onAddToCart={addToCart} />
        </section>

        {/* 오른쪽: 장바구니 */}
        <aside className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-20">
          <div className="p-4 bg-gray-800 text-white font-bold flex justify-between items-center">
            <span>장바구니</span>
            <span className="bg-gray-600 px-2 py-0.5 rounded-full text-xs">{cart.length}종류</span>
          </div>

          {/* 장바구니 리스트 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <span className="text-4xl">🛒</span>
                <p>상품을 선택해주세요</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                    <p className="text-blue-600 font-bold text-sm">
                      {(item.price * item.cartQty).toLocaleString()}원
                    </p>
                  </div>
                  
                  {/* 수량 조절 버튼 */}
                  <div className="flex items-center gap-3 bg-white px-2 py-1 rounded border shadow-sm">
                    <button 
                      onClick={() => removeFromCart(item.id!)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-red-500 hover:bg-red-100"
                    >
                      -
                    </button>
                    <span className="font-bold w-4 text-center">{item.cartQty}</span>
                    <button 
                      onClick={() => addToCart(item)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-blue-500 hover:bg-blue-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* 하단 결제 영역 */}
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between text-2xl font-extrabold mb-6 px-1">
              <span>Total</span>
              <span className="text-blue-600">{totalAmount.toLocaleString()}원</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`
                w-full py-4 rounded-xl font-bold text-xl shadow-lg transition-transform active:scale-95
                ${cart.length === 0 
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200"
                }
              `}
            >
              결제하기
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}