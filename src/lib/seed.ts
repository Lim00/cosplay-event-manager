// src/lib/seed.ts
import { db } from "./db";

export async function resetDatabase() {
  try {
    await db.transaction("rw", [db.inventory, db.products, db.salesLogs, db.events, db.reservations, db.inventoryLogs], async () => {
      await db.inventory.clear();
      await db.products.clear();
      await db.salesLogs.clear();
      await db.events.clear();
      await db.reservations.clear();
      await db.inventoryLogs.clear();

      // ==========================================
      // [1] 이벤트(행사) 데이터 생성 (총 5개)
      // ==========================================
      const eventsData = [
        { name: "2025.12 AGF 2025", date: new Date("2025-12-05"), status: "CLOSED" as const }, // 통계 테스트용 과거 행사
        { name: "2026.05 일러스타 페스", date: new Date("2026-05-04"), status: "OPEN" as const },  // 현재 메인 진행 행사
        { name: "2026.07 서울 코믹월드", date: new Date("2026-07-20"), status: "PREPARING" as const },
        { name: "2026.08 명방 온리전 [로도스 바캉스]", date: new Date("2026-08-15"), status: "PREPARING" as const }, // 🌟 명방 한정 행사
        { name: "2026.10 블아 1.5주년 온리전", date: new Date("2026-10-22"), status: "PREPARING" as const },
      ];
      
      const eventIds: number[] = [];
      for (const e of eventsData) {
        eventIds.push((await db.events.add(e)) as number);
      }
      const [agfId, illuStarId, seoulComicId, arknightsOnlyId, blueArchiveOnlyId] = eventIds;

      // ==========================================
      // [2] 마스터 재고 (Inventory) 생성 - 서브컬처 대통합
      // ==========================================
      const invData = [
        // 명일방주
        { name: "[명방] 엑시아 애플파이 아크릴", category: "아크릴", price: 15000, stock: 100, initialStock: 150 },
        { name: "[명방] 텍사스 꼬리털 키링", category: "키링", price: 8000, stock: 80, initialStock: 100 },
        { name: "[명방] 라플란드 광기의 엽서", category: "지류", price: 5000, stock: 200, initialStock: 200 },
        { name: "[명방] 모스티마 타락천사 머그컵", category: "굿즈", price: 18000, stock: 30, initialStock: 50 },
        // 소녀전선
        { name: "[소전] M4A1 시나몬롤 수건", category: "굿즈", price: 10000, stock: 60, initialStock: 100 },
        { name: "[소전] 흥국이(HK416) 마우스패드", category: "굿즈", price: 12000, stock: 40, initialStock: 50 },
        // 블루 아카이브
        { name: "[블아] 시로코 스포츠 타월", category: "굿즈", price: 12000, stock: 120, initialStock: 150 },
        { name: "[블아] 호시노 으헤~ 아크릴 챰", category: "키링", price: 7000, stock: 300, initialStock: 350 },
        { name: "[블아] 아루 사장님 결재서류 파일", category: "지류", price: 4000, stock: 80, initialStock: 100 },
        { name: "[블아] 페로로질라 대형 쿠션", category: "굿즈", price: 35000, stock: 15, initialStock: 20 },
        // 호요버스 (원신 & 스타레일)
        { name: "[원신] 푸리나 물의 정령 키링", category: "키링", price: 9000, stock: 250, initialStock: 300 },
        { name: "[원신] 라이덴 쇼군 장패드", category: "굿즈", price: 22000, stock: 50, initialStock: 80 },
        { name: "[붕스] 반디(샘) 홀로그램 포카", category: "지류", price: 3000, stock: 500, initialStock: 500 },
        { name: "[붕스] 스텔론 헌터 후드티", category: "의류", price: 45000, stock: 20, initialStock: 30 },
        // 마이너 장르 (우마무스메, 봇치더록 등)
        { name: "[말딸] 고루시 당근 파우치", category: "굿즈", price: 14000, stock: 45, initialStock: 50 },
        { name: "[봇치] 결속밴드 기타 피크 세트", category: "굿즈", price: 6000, stock: 150, initialStock: 200 },
      ];

      const invIds: number[] = [];
      for (const item of invData) {
        const id = await db.inventory.add({ ...item, description: "더미 데이터" });
        invIds.push(id as number);
        // 초기 입고 로그 남기기
        await db.inventoryLogs.add({ itemId: id as number, changeQty: item.initialStock, currentStock: item.initialStock, reason: "ADD", timestamp: new Date(), memo: "최초 입고" });
      }

      // 인덱스 매핑 (가독성을 위해)
      const [
        ak_exia, ak_texas, ak_lapp, ak_mostima,
        gf_m4, gf_hk416,
        ba_shiroko, ba_hoshino, ba_aru, ba_peroro,
        gi_furina, gi_raiden, hs_firefly, hs_hoodie,
        uma_gold, bocchi_pick
      ] = invIds;

      // ==========================================
      // [3] 행사 전용 메뉴판 (Products) 세팅
      // ==========================================
      
      // 3-1. 일러스타 페스 (종합 장르 - 가격 조정 예시 포함)
      const illuProducts = [
        { name: "엑시아 아크릴 (일페 할인가)", price: 14000, isBundle: false, components: [{ itemId: ak_exia, qty: 1 }] }, // 1000원 깎음! (가격 Override)
        { name: "푸리나 키링", price: 9000, isBundle: false, components: [{ itemId: gi_furina, qty: 1 }] },
        { name: "페로로질라 쿠션", price: 35000, isBundle: false, components: [{ itemId: ba_peroro, qty: 1 }] },
        { name: "결속밴드 피크", price: 6000, isBundle: false, components: [{ itemId: bocchi_pick, qty: 1 }] },
        { name: "호요버스 VIP 세트", price: 65000, isBundle: true, components: [{ itemId: gi_raiden, qty: 1 }, { itemId: hs_hoodie, qty: 1 }] }, // 2000원 세트 할인!
      ];
      const illuProductIds: number[] = [];
      for (const p of illuProducts) {
        illuProductIds.push((await db.products.add({ eventId: illuStarId, ...p })) as number);
      }

      // 3-2. 명일방주 온리전 (오직 명방 굿즈만!)
      const akOnlyProducts = [
        { name: "엑시아 애플파이 아크릴", price: 15000, isBundle: false, components: [{ itemId: ak_exia, qty: 1 }] },
        { name: "텍사스 키링", price: 8000, isBundle: false, components: [{ itemId: ak_texas, qty: 1 }] },
        { name: "라플란드 엽서", price: 5000, isBundle: false, components: [{ itemId: ak_lapp, qty: 1 }] },
        { name: "모스티마 머그컵", price: 18000, isBundle: false, components: [{ itemId: ak_mostima, qty: 1 }] },
        { name: "✨ 펭귄물류 풀패키지 ✨", price: 40000, isBundle: true, components: [
          { itemId: ak_exia, qty: 1 }, { itemId: ak_texas, qty: 1 }, { itemId: ak_lapp, qty: 1 }, { itemId: ak_mostima, qty: 1 }
        ]}, // 6000원 파격 할인 세트!
      ];
      for (const p of akOnlyProducts) {
        await db.products.add({ eventId: arknightsOnlyId, ...p });
      }

      // ==========================================
      // [4] 선입금 예약 데이터 (Reservations) 세팅
      // ==========================================
      const today = new Date();
      await db.reservations.add({
        eventId: illuStarId, customerName: "선생님", phoneLast4: "1234", isPickedUp: false, timestamp: today, totalAmount: 35000,
        items: [{ productId: illuProductIds[2], name: "페로로질라 쿠션", qty: 1, price: 35000 }]
      });
      await db.reservations.add({
        eventId: arknightsOnlyId, customerName: "독타", phoneLast4: "9999", isPickedUp: false, timestamp: today, totalAmount: 40000,
        items: [{ productId: 999, name: "✨ 펭귄물류 풀패키지 ✨", qty: 1, price: 40000 }] // ID는 임시 매핑
      });

      // ==========================================
      // [5] 통계 뽕을 채워줄 대규모 시계열 영수증 데이터 생성
      // ==========================================
      const generateSales = async (eId: number, pIds: number[], baseDate: Date, count: number) => {
        for (let i = 0; i < count; i++) {
          const saleTime = new Date(baseDate.getTime() + Math.floor(Math.random() * 420) * 60000); // 7시간(420분) 내 랜덤
          const pIdx = Math.floor(Math.random() * pIds.length);
          const qty = Math.floor(Math.random() * 3) + 1;
          const product = illuProducts[pIdx]; // (일페 기준으로 임시 매핑, AGF도 같은 가격으로 가정)

          const saleId = await db.salesLogs.add({
            type: "SELL", productId: pIds[pIdx], count: qty, totalPrice: product.price * qty,
            paymentMethod: Math.random() > 0.4 ? "BANK" : "CASH", timestamp: saleTime, eventId: eId,
          });

          // 5% 확률로 환불 발생
          if (Math.random() < 0.05) {
            await db.salesLogs.add({
              type: "REFUND", productId: pIds[pIdx], count: 1, totalPrice: -product.price,
              paymentMethod: "BANK", timestamp: new Date(saleTime.getTime() + 20 * 60000), eventId: eId, originalSaleId: saleId as number
            });
          }
        }
      };

      // 작년 AGF 2025 매출 (100건 생성 - 차트용)
      await generateSales(agfId, illuProductIds, new Date("2025-12-05T10:00:00"), 100);
      // 오늘 일러스타 페스 매출 (60건 생성)
      await generateSales(illuStarId, illuProductIds, new Date("2026-05-04T10:00:00"), 60);

    });

    alert("🎉 초대형 서브컬처 통합 더미 데이터가 성공적으로 장전되었습니다! (명방/블아/원신/붕스 등 포함)");
  } catch (error) {
    console.error("데이터 초기화 실패:", error);
    alert("데이터 초기화 중 오류가 발생했습니다.");
  }
}