// src/lib/seed.ts
import { db } from "./db";

export async function resetDatabase() {
  try {
    await db.transaction("rw", [db.inventory, db.products, db.salesLogs, db.events, db.eventStockSnapshots, db.inventoryLogs], async () => {
      await db.inventory.clear();
      await db.products.clear();
      await db.salesLogs.clear();
      await db.events.clear();
      await db.eventStockSnapshots.clear();
      await db.inventoryLogs.clear();

      // [1] 이벤트(행사) 데이터 생성
      const eventId1 = await db.events.add({ name: "2026.05 일러스타 페스 (테스트용)", date: new Date("2026-05-04"), status: "OPEN" });
      const eventId2 = await db.events.add({ name: "2026.07 서울 코믹월드", date: new Date("2026-07-20"), status: "PREPARING" });

      // [2] 마스터 재고 생성 (명일방주 & 소녀전선)
      const invData = [
        { name: "엑시아 애플파이 아크릴", category: "아크릴", price: 15000, stock: 100, initialStock: 100, description: "리더, 애플파이 먹을래?" },
        { name: "텍사스 꼬리털(?) 키링", category: "키링", price: 8000, stock: 150, initialStock: 150, description: "보들보들함." },
        { name: "라플란드 광기의 엽서", category: "지류", price: 5000, stock: 300, initialStock: 300, description: "텍사스!!" },
        { name: "모스티마 타락천사 머그컵", category: "굿즈", price: 18000, stock: 50, initialStock: 50, description: "티타임" },
        { name: "M4A1 시나몬롤 수건", category: "굿즈", price: 10000, stock: 80, initialStock: 80, description: "따뜻한 시나몬롤 향기" },
        { name: "ST AR-15 각인 텀블러", category: "굿즈", price: 18000, stock: 60, initialStock: 60, description: "우월한 보온성" },
        { name: "M4 SOPMOD II 철혈 캔디", category: "식품", price: 6000, stock: 200, initialStock: 200, description: "솦모챠 캔디" },
      ];

      const invIds: number[] = [];
      for (const item of invData) {
        const id = await db.inventory.add(item);
        invIds.push(id as number);
      }

      // [3] 행사 전용 메뉴판 (Products) 세팅
      const productsData = [
        { name: "엑시아 아크릴", price: 15000, isBundle: false, components: [{ itemId: invIds[0], qty: 1 }] },
        { name: "텍사스 키링", price: 8000, isBundle: false, components: [{ itemId: invIds[1], qty: 1 }] },
        { name: "M4A1 수건", price: 10000, isBundle: false, components: [{ itemId: invIds[4], qty: 1 }] },
        { name: "펭귄 물류 듀오 세트", price: 20000, isBundle: true, components: [{ itemId: invIds[0], qty: 1 }, { itemId: invIds[1], qty: 1 }] }, // 3000원 할인
        { name: "AR소대 생존 팩", price: 25000, isBundle: true, components: [{ itemId: invIds[4], qty: 1 }, { itemId: invIds[5], qty: 1 }] },
      ];

      const productIds: number[] = [];
      for (const p of productsData) {
        const id = await db.products.add({ eventId: eventId1 as number, ...p });
        productIds.push(id as number);
      }

      // 🌟 [4] 대규모 시계열 영수증(SalesLog) 더미 데이터 자동 생성기!
      // 오전 10시부터 오후 4시 사이의 가짜 결제 내역 40개를 생성합니다.
      const baseDate = new Date("2026-05-04T10:00:00");
      
      for (let i = 0; i < 40; i++) {
        // 시간은 10시부터 16시 사이에서 랜덤하게 흩뿌립니다. (가장 바쁜 12시~14시 확률을 높임)
        const randomMinutes = Math.floor(Math.random() * 360); // 0 ~ 360분 추가
        const saleTime = new Date(baseDate.getTime() + randomMinutes * 60000);
        
        // 어떤 메뉴를 몇 개(1~3개) 팔았는지 랜덤 결정
        const randomProductIdx = Math.floor(Math.random() * productIds.length);
        const product = productsData[randomProductIdx];
        const qty = Math.floor(Math.random() * 3) + 1; 

        // 정상 결제(SELL) 기록
        const saleId = await db.salesLogs.add({
          type: "SELL",
          productId: productIds[randomProductIdx],
          count: qty,
          totalPrice: product.price * qty,
          paymentMethod: Math.random() > 0.3 ? "BANK" : "CASH", // 계좌이체 70%, 현금 30%
          timestamp: saleTime,
          eventId: eventId1 as number,
        });

        // 물리적 재고 차감 로직 (시뮬레이션)
        for(const comp of product.components) {
          const invItem = await db.inventory.get(comp.itemId);
          if(invItem) await db.inventory.update(comp.itemId, { stock: invItem.stock - (qty * comp.qty) });
        }

        // 10% 확률로 환불, 5% 확률로 파본 교환 발생 시뮬레이션!
        const chance = Math.random();
        if (chance < 0.1) {
          await db.salesLogs.add({
            type: "REFUND", productId: productIds[randomProductIdx], count: 1,
            totalPrice: -product.price, paymentMethod: "BANK",
            timestamp: new Date(saleTime.getTime() + 15 * 60000), // 15분 뒤 환불하러 옴
            eventId: eventId1 as number, originalSaleId: saleId as number
          });
        } else if (chance < 0.15) {
          await db.salesLogs.add({
            type: "EXCHANGE", productId: productIds[randomProductIdx], count: 1,
            totalPrice: 0, paymentMethod: "CASH",
            timestamp: new Date(saleTime.getTime() + 30 * 60000), // 30분 뒤 파본 교환하러 옴
            eventId: eventId1 as number, originalSaleId: saleId as number
          });
        }
      }
    });

    alert("데이터 분석을 위한 대규모 시계열 영수증 데이터가 장전되었습니다! 📊🚀");
  } catch (error) {
    console.error("Failed to reset database:", error);
    alert("데이터 초기화에 실패했습니다.");
  }
}