import Dexie, { Table } from "dexie";

// 1. Interface 정의
export interface Inventory {
    id?: number; // 자동 증가 (Auto Increment) 사용 예정
    name: string;
    category: string;
    price: number;
    stock: number;
    initialStock: number;

    description?: string; // 굿즈에 대한 추가 설명 (선택적)
}

export interface ProductComponent {
    itemId: number; // Inventory의 id를 참조
    qty: number;
}

export interface Product {
    id?: number;
    eventId: number;   // [New!] 이 메뉴는 어느 행사 소속인가? (이게 있어야 님의 아이디어가 실현됨!)
    name: string;
    price: number;
    isBundle: boolean;
    components: ProductComponent[];
}

export interface SalesLog {
    id?: number;
    type: "SELL" | "REFUND" | "EXCHANGE"; // 판매, 환불, 교환 등 다양한 유형을 기록할 수 있도록 확장
    productId: number; // Product의 id를 참조
    count: number;
    totalPrice: number;
    paymentMethod: "CASH" | "BANK" | "QR" | "PREPAID";
    timestamp: Date;
    eventId?: number; // 어느 행사에서 팔렸는지를 추적

    // 환불을 할 경우, 환불이 진행된 기존 판매 로그의 id를 참조 (환불이 원래 판매 로그와 연결되도록)
    originalSaleId?: number;
}

export interface ReservationItem {
  productId: number;
  name: string;
  qty: number;
  price: number;
}

export interface Reservation {
  id?: number;
  eventId: number;
  customerName: string;
  phoneLast4: string;
  items: ReservationItem[];
  totalAmount: number;
  isPickedUp: boolean;
  timestamp: Date;
}

// 행사 정보
export interface Event {
    id?: number;
    name: string;       // ex: "코믹월드 45회"
    date: Date;
    status: "PREPARING" | "OPEN" | "CLOSED";
}

// 행사 시작 시점의 재고 스냅샷 (통계 및 analytics 용도)
export interface EventStockSnapshot {
    id?: number;
    eventId: number;        // Event의 id를 참조
    itemId: number;         // Inventory의 id를 참조
    startStock: number;     // 행사 시작 시점의 재고 수량
}

// 재고 변동 이력 인터페이스 추가
export interface InventoryLog {
    id?: number;
    itemId: number;         // 어떤 물리적 굿즈(Inventory)인지?
    changeQty: number;      // 변동량 (플러스 / 마이너스)
    currentStock: number;   // 변동 직후 남은 최종 재고 (스냅샷)
    reason: "ADD" | "REMOVE" | "SELL" | "REFUND" | "ADJUST" | "EXCHANGE" | "RESERVE"; // 🌟 RESERVE 추가    timestamp: Date;
    timestamp: Date;
    eventId?: number;        // 행사와 연관된 변동인지 추적 (선택적)
    memo?: string;          // 🌟 [New] 변경 사유 (선택 사항)
}

// 2. Dexie DB 클래스 정의
export class CosplayDatabase extends Dexie {
    // 테이블 정의
    inventory!: Table<Inventory, number>;
    products!: Table<Product, number>;
    salesLogs!: Table<SalesLog, number>;
    reservations!: Table<Reservation, number>;
    events!: Table<Event, number>;
    eventStockSnapshots!: Table<EventStockSnapshot, number>;
    inventoryLogs!: Table<InventoryLog, number>;

    constructor() {
        super("CosplayManagerDB");

        // 3. 스키마 정의 (검색에 사용할 컬럼만 적으면 됨)
        this.version(6).stores({
            inventory: "++id, name, category",
            products: "++id, name, isBundle, eventId", 
            // 👇 salesLogs에 eventId가 있는지 다시 한번 꼼꼼히 확인!
            salesLogs: "++id, type, paymentMethod, timestamp, eventId, originalSaleId",
            reservations: "++id, customerName, isPickedUp",
            events: "++id, status, date",
            eventStockSnapshots: "++id, eventId, itemId",
            // 👇 나중을 위해 inventoryLogs에도 eventId를 달아둡니다.
            inventoryLogs: "++id, itemId, reason, timestamp, eventId" 
        });
    }
}

// DB 인스턴스 생성
export const db = new CosplayDatabase();