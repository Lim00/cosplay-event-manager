"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, Product } from "@/lib/db";

interface Props {
  eventId: number; // [New!] 어떤 행사의 메뉴판인지 부모로부터 받아옴
  onAddToCart: (product: Product) => void;
}

export default function ProductList({ eventId, onAddToCart }: Props) {
  // 💡 핵심: eventId로 마스킹(필터링)된 데이터만 가져옵니다!
  const products = useLiveQuery(
    () => db.products.where({ eventId }).toArray(),
    [eventId]
  );

  if (!products) return <div className="p-4 text-gray-500">메뉴를 불러오는 중...</div>;
  if (products.length === 0) return <div className="p-4 text-gray-500">등록된 메뉴가 없습니다. 관리자에서 메뉴를 세팅해주세요.</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAddToCart(product)}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col h-full active:scale-95"
        >
          {product.isBundle && (
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded mb-2 w-max">
              ✨ 세트 할인
            </span>
          )}
          <h3 className="font-bold text-gray-800 leading-tight mb-2 line-clamp-2">
            {product.name}
          </h3>
          <div className="mt-auto">
            <span className="text-blue-600 font-extrabold">
              {product.price.toLocaleString()}원
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}