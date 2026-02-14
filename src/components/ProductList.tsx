"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, Product } from "@/lib/db"; // Product 타입 임포트

// 부모에게 받을 함수 타입 정의
interface Props {
  onAddToCart: (product: Product) => void;
}

export default function ProductList({ onAddToCart }: Props) {
  const products = useLiveQuery(() => db.products.toArray());

  if (!products) return <div className="p-4 text-gray-500">로딩 중...</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {products.map((product) => (
        <button
          key={product.id}
          className={`
            relative p-4 rounded-xl border-2 transition-all active:scale-95 text-left h-32 flex flex-col justify-between
            ${product.isBundle 
              ? "bg-purple-50 border-purple-200 hover:border-purple-400" 
              : "bg-white border-gray-200 hover:border-blue-400"
            }
          `}
          // 클릭 시 부모에게 상품 정보 전달
          onClick={() => onAddToCart(product)}
        >
          <div>
            {product.isBundle && (
              <span className="inline-block px-2 py-0.5 mb-1 text-[10px] font-bold text-purple-700 bg-purple-100 rounded-full">
                SET
              </span>
            )}
            <h3 className="font-bold text-gray-800 leading-tight text-sm">
              {product.name}
            </h3>
          </div>
          
          <p className="font-extrabold text-blue-600 text-right">
            {product.price.toLocaleString()}
          </p>
        </button>
      ))}
    </div>
  );
}