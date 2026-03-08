import { db } from "./db";

export async function resetDatabase() {
  try {
    // 트랜잭션 인자 초과 에러 방지를 위해 테이블들을 배열 [ ] 로 묶었습니다!
    await db.transaction("rw", [db.inventory, db.products, db.salesLogs, db.events, db.eventStockSnapshots, db.inventoryLogs], async () => {
      await db.inventory.clear();
      await db.products.clear();
      await db.salesLogs.clear();
      await db.events.clear();
      await db.eventStockSnapshots.clear();
      await db.inventoryLogs.clear();

      // ==========================================
      // [1] 이벤트(행사) 데이터 생성
      // ==========================================
      const eventId1 = await db.events.add({
        name: "2026.05 일러스타 페스 (테스트용)",
        date: new Date("2026-05-04"),
        status: "OPEN", 
      });
      
      const eventId2 = await db.events.add({
        name: "2026.07 서울 코믹월드",
        date: new Date("2026-07-20"),
        status: "PREPARING",
      });

      // ==========================================
      // [2] 마스터 재고 (Inventory) 생성
      // ==========================================
      const invData = [
        // --- 명일방주 (Arknights) ---
        { name: "엑시아 애플파이 아크릴", category: "아크릴", price: 15000, stock: 50, initialStock: 50, description: "리더, 애플파이 먹을래?" },
        { name: "텍사스 꼬리털(?) 키링", category: "키링", price: 8000, stock: 100, initialStock: 100, description: "보들보들함. 엑시아가 추천함." },
        { name: "라플란드 광기의 엽서", category: "지류", price: 5000, stock: 200, initialStock: 200, description: "텍사스... 텍사스!!" },
        { name: "모스티마 타락천사 머그컵", category: "굿즈", price: 18000, stock: 30, initialStock: 30, description: "시간을 멈추는 여유로운 티타임" },
        { name: "명일방주 코스프레 사진집 Vol.1", category: "회지", price: 20000, stock: 40, initialStock: 40, description: "펭귄물류 32p 풀컬러 화보집" },

        // --- 소녀전선 (Girls' Frontline) - AR 소대 ---
        { name: "M4A1 시나몬롤 수건", category: "굿즈", price: 10000, stock: 50, initialStock: 50, description: "지휘관님을 위한 따뜻한 시나몬롤 향기" },
        { name: "ST AR-15 각인 텀블러", category: "굿즈", price: 18000, stock: 40, initialStock: 40, description: "우월한 화력(보온성)을 자랑합니다." },
        { name: "M4 SOPMOD II 철혈 캔디", category: "식품", price: 6000, stock: 120, initialStock: 120, description: "솦모챠가 주워왔습니다. 먹어도... 되나?" },
        { name: "M16A1 잭다니엘 힙플라스크", category: "굿즈", price: 22000, stock: 20, initialStock: 20, description: "우리형의 필수품. (내용물은 비어있음)" },
        { name: "RO635 확성기 스트랩", category: "키링", price: 8000, stock: 60, initialStock: 60, description: "법과 정의의 상징! 멘탈 붕괴 주의." },
      ];

      const invIds: number[] = [];
      for (const item of invData) {
        const id = await db.inventory.add(item);
        invIds.push(id as number);
        
        await db.inventoryLogs.add({
          itemId: id as number,
          changeQty: item.stock,
          currentStock: item.stock,
          reason: "ADD",
          timestamp: new Date(),
        });
      }

      // ==========================================
      // [3] 행사 전용 메뉴판 (Products) 세팅
      // ==========================================
      // 단품 메뉴 등록
      const singleProducts = [
        { name: "엑시아 아크릴", price: 15000, invIdx: 0 },
        { name: "텍사스 키링", price: 8000, invIdx: 1 },
        { name: "라플란드 엽서", price: 5000, invIdx: 2 },
        { name: "모스티마 머그컵", price: 18000, invIdx: 3 },
        { name: "M4A1 수건", price: 10000, invIdx: 5 },
        { name: "솦모챠 캔디", price: 6000, invIdx: 7 },
      ];

      for (const p of singleProducts) {
        await db.products.add({
          eventId: eventId1 as number,
          name: p.name,
          price: p.price,
          isBundle: false,
          components: [{ itemId: invIds[p.invIdx], qty: 1 }]
        });
      }

      // 🌟 스페셜 번들(세트) 메뉴 구성!
      await db.products.add({
        eventId: eventId1 as number,
        name: "펭귄 물류 + 라플란드 난입 세트",
        price: 43000, // 원래 46,000원이지만 할인!
        isBundle: true,
        components: [
          { itemId: invIds[0], qty: 1 }, // 엑시아
          { itemId: invIds[1], qty: 1 }, // 텍사스
          { itemId: invIds[2], qty: 1 }, // 라플란드 (난입)
          { itemId: invIds[3], qty: 1 }, // 모스티마
        ]
      });

      await db.products.add({
        eventId: eventId1 as number,
        name: "안티레인(AR) 소대 컴플리트 박스",
        price: 55000, // 원래 64,000원이지만 파격 할인!
        isBundle: true,
        components: [
          { itemId: invIds[5], qty: 1 }, // M4A1
          { itemId: invIds[6], qty: 1 }, // AR-15
          { itemId: invIds[7], qty: 1 }, // SOPMOD
          { itemId: invIds[8], qty: 1 }, // M16A1
          { itemId: invIds[9], qty: 1 }, // RO635
        ]
      });

    });

    console.log("Database reset with Arknights & GFL dummy data!");
    alert("명일방주 & 소녀전선 굿즈 세팅이 완료되었습니다! 🚀\n화면을 새로고침해주세요.");
  } catch (error) {
    console.error("Failed to reset database:", error);
    alert("데이터 초기화에 실패했습니다.");
  }
}