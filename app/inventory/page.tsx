// src/app/inventory/page.tsx
import { prisma } from "@/lib/prisma";
import { addGoods, updateStock } from './action';

export default async function InventoryPage() {
    // DB에서 상춤 목록 가져오기
    const goodsList = await prisma.goods.findMany({
        orderBy: { id: 'asc' },
    });

    return (
    <main className="flex min-h-screen flex-col items-center p-10 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-10 text-emerald-400">📦 부스 재고 관리 (V1)</h1>

      <div className="flex flex-col gap-8 w-full max-w-4xl">
        
        {/* 1. 상품 등록 섹션 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold mb-4">✨ 신규 굿즈 등록</h2>
          <form action={addGoods} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">상품명</label>
              <input name="name" className="p-2 rounded bg-gray-700 text-white" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">가격</label>
              <input name="price" type="number" className="p-2 rounded bg-gray-700 text-white" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">초기 수량</label>
              <input name="stock" type="number" className="p-2 rounded bg-gray-700 text-white" required />
            </div>
            <button type="submit" className="bg-emerald-600 px-6 py-2 rounded font-bold hover:bg-emerald-700">
              등록
            </button>
          </form>
        </div>

        {/* 2. 재고 리스트 섹션 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold mb-4">📊 재고 현황</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-600 text-gray-400">
                <th className="p-3">ID</th>
                <th className="p-3">상품명</th>
                <th className="p-3">가격</th>
                <th className="p-3 text-center">현재 재고</th>
                <th className="p-3 text-center">빠른 관리</th>
              </tr>
            </thead>
            <tbody>
              {goodsList.map((item) => (
                <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-3 text-gray-500">#{item.id}</td>
                  <td className="p-3 font-bold">{item.name}</td>
                  <td className="p-3">{item.price.toLocaleString()}원</td>
                  <td className={`p-3 text-center font-bold text-xl ${item.stock <= 0 ? 'text-red-500' : 'text-white'}`}>
                    {item.stock}
                  </td>
                  <td className="p-3 flex justify-center gap-2">
                    {/* -1 버튼 (판매) */}
                    <form action={updateStock.bind(null, item.id, -1)}>
                      <button className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition">
                        판매 (-1)
                      </button>
                    </form>
                    
                    {/* +1 버튼 (입고/취소) */}
                    <form action={updateStock.bind(null, item.id, 1)}>
                      <button className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-3 py-1 rounded hover:bg-blue-500 hover:text-white transition">
                        입고 (+1)
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}