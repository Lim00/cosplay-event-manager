import {db, Inventory, Product} from "./db";

export async function resetDatabase() {
  // 기존 데이터 싹 지우기 (초기화)
  await db.transaction("rw", db.inventory, db.products, db.salesLogs, db.reservations, async () => {
    await db.inventory.clear();
    await db.products.clear();
    await db.salesLogs.clear();
    await db.reservations.clear();
    
    // 1. 기초 재고 (Inventory) 추가
    // add() 함수는 생성된 id를 반환합니다.
    const keyRingId = await db.inventory.add({
      name: "천우 키링",
      category: "팬시",
      price: 5000,
      stock: 50,
      initialStock: 50,
    }); // id: 1 예상

    const txAcrylicId = await db.inventory.add({
      name: "텍사스 아크릴",
      category: "팬시",
      price: 8000,
      stock: 30,
      initialStock: 30,
    }); // id: 2 예상

    const lplAcrylicId = await db.inventory.add({
      name: "라플란드 아크릴",
      category: "팬시",
      price: 8000,
      stock: 30,
      initialStock: 35,
    }); // id: 3 예상

    const bookId = await db.inventory.add({
      name: "일러스트 북 Vol.1",
      category: "회지",
      price: 15000,
      stock: 100,
      initialStock: 100,
    }); // id: 4 예상

    // 2. 판매 상품 (Products) 추가
    // 2-1. 단품 등록 (Inventory 1:1 매칭)
    await db.products.add({
      name: "천우 키링 (단품)",
      price: 5000,
      isBundle: false,
      components: [{ itemId: keyRingId, qty: 1 }],
    });

    await db.products.add({
      name: "텍사스 아크릴 (단품)",
      price: 8000,
      isBundle: false,
      components: [{ itemId: txAcrylicId, qty: 1 }],
    });

    await db.products.add({
      name: "라플란드 아크릴 (단품)",
      price: 8000,
      isBundle: false,
      components: [{ itemId: lplAcrylicId, qty: 1 }],
    });

    // 2-2. 세트 상품 등록 (할인 적용)
    await db.products.add({
      name: "[할인] 펭귄 물류 세트 (키링+아크릴)",
      price: 18000, // 21000 -> 18000 할인
      isBundle: true,
      components: [
        { itemId: keyRingId, qty: 1 },
        { itemId: txAcrylicId, qty: 1 },
        { itemId: lplAcrylicId, qty: 1 },
      ],
    });
  });

  console.log("✅ DB 초기화 및 테스트 데이터 생성 완료!");
  alert("DB가 초기화되었습니다.");
}