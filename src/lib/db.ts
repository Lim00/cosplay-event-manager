import Dexie, { Table } from "dexie";

// 1. Interface 정의
export interface Inventory {
    id?: number; // 자동 증가 (Auto Increment) 사용 예정
    name: string;
    category: string;
    price: number;
    stock: number;
    initialStock: number;
}

export interface ProductComponent {
    itemId: number; // Inventory의 id를 참조
    qty: number;
}

export interface Product {
    id?: number;
    name: string;
    price: number;
    isBundle: boolean;
    components: ProductComponent[];
}

export interface SalesLog {
    id?: number;
    type: "SELL" | "REFUND";
    productId: number; // Product의 id를 참조
    count: number;
    totalPrice: number;
    paymentMethod: "CASH" | "BANK" | "QR";
    timestamp: Date;
    eventId?: number; // 어느 행사에서 팔렸는지를 추적

    // 환불을 할 경우, 환불이 진행된 기존 판매 로그의 id를 참조 (환불이 원래 판매 로그와 연결되도록)
    originalSaleId?: number;
}

export interface Reservation {
    id?: number;
    customerName: string;
    phoneNumber: string;
    items: ProductComponent[];
    isPickedUp: boolean;
}

// 행사 정보
export interface Event {
    id?: number;
    name: string;       // ex: "코믹월드 45회"
    date: Date;
    status: "PREPARING" | "ACTIVE" | "CLOSED";
}

// 행사 시작 시점의 재고 스냅샷 (통계 및 analytics 용도)
export interface EventStockSnapshot {
    id?: number;
    eventId: number;        // Event의 id를 참조
    itemId: number;         // Inventory의 id를 참조
    startStock: number;     // 행사 시작 시점의 재고 수량
}

// 2. Dexie DB 클래스 정의
export class CosplayDatabase extends Dexie {
    // 테이블 정의
    inventory!: Table<Inventory, number>
    products!: Table<Product, number>
    salesLogs!: Table<SalesLog, number>
    reservations!: Table<Reservation, number>
    events!: Table<Event, number>
    eventStockSnapshots!: Table<EventStockSnapshot, number>

    constructor() {
        super("CosplayManagerDB");

        // 3. 스키마 정의 (검색에 사용할 컬럼만 적으면 됨)
        this.version(2).stores({
            inventory: "++id, name, category",
            products: "++id, name, isBundle",
            salesLogs: "++id, type, paymentMethod, timestamp",
            reservations: "++id, customerName, phoneNumber, isPickedUp",
            events: "++id, status, date",
            eventStockSnapshots: "++id, eventId, itemId",
        });
    }
}

// DB 인스턴스 생성
export const db = new CosplayDatabase();