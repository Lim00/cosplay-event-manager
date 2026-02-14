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
}

export interface Reservation {
    id?: number;
    customerName: string;
    phoneNumber: string;
    items: ProductComponent[];
    isPickedUp: boolean;
}

// 2. Dexie DB 클래스 정의
export class CosplayDatabase extends Dexie {
    // 테이블 정의
    inventory!: Table<Inventory, number>
    products!: Table<Product, number>
    salesLogs!: Table<SalesLog, number>
    reservations!: Table<Reservation, number>

    constructor() {
        super("CosplayManagerDB");

        // 3. 스키마 정의 (검색에 사용할 컬럼만 적으면 됨)
        this.version(1).stores({
            inventory: "++id, name, category",
            products: "++id, name, isBundle",
            salesLogs: "++id, type, paymentMethod, timestamp",
            reservations: "++id, customerName, phoneNumber, isPickedUp",
        });
    }
}

// DB 인스턴스 생성
export const db = new CosplayDatabase();