import { prisma } from '@/lib/prisma';
import { addGoods, updateStock } from './action';

export default async function InventoryPage() {
  const goodsList = await prisma.goods.findMany({ orderBy: { id: 'asc' } });
  
  // [New] 최근 로그 10개만 가져오기 (데이터 분석가의 SQL: SELECT * FROM History ORDER BY timestamp DESC LIMIT 10)
  const historyList = await prisma.history.findMany({
    take: 10,
    orderBy: { timestamp: 'desc' },
    include: { goods: true }, // Join 문법 (상품 이름도 같이 가져오기)
  });

  return (
    <main className="flex min-h-screen flex-col items-center p-10 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-10 text-emerald-400">📦 부스 재고 관리 (V1.1)</h1>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
        
        {/* 왼쪽: 재고 리스트 (기존과 동일) */}
        <div className="flex-1 bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">📊 재고 현황</h2>
          {/* 상품 등록 폼 (간소화) */}
          <form action={addGoods} className="flex gap-2 mb-6">
            <input name="name" placeholder="상품명" className="p-2 rounded bg-gray-700 w-1/3" required />
            <input name="price" type="number" placeholder="가격" className="p-2 rounded bg-gray-700 w-1/4" required />
            <input name="stock" type="number" placeholder="수량" className="p-2 rounded bg-gray-700 w-1/4" required />
            <button className="bg-emerald-600 px-4 rounded font-bold">등록</button>
          </form>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-600 text-gray-400"><th className="p-2">상품</th><th className="p-2 text-center">재고</th><th className="p-2 text-center">관리</th></tr>
            </thead>
            <tbody>
              {goodsList.map((item) => (
                <tr key={item.id} className="border-b border-gray-700">
                  <td className="p-2">{item.name}<br/><span className="text-xs text-gray-500">{item.price}원</span></td>
                  <td className={`p-2 text-center font-bold ${item.stock <= 0 ? 'text-red-500' : ''}`}>{item.stock}</td>
                  <td className="p-2 flex justify-center gap-1">
                    <form action={updateStock.bind(null, item.id, -1, '판매')}>
                      <button className="bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition">판매</button>
                    </form>
                    <form action={updateStock.bind(null, item.id, 1, '입고')}>
                      <button className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500 hover:text-white transition">입고</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* [New] 오른쪽: 로그 기록 (History) */}
        <div className="w-full lg:w-80 bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">📜 최근 활동 로그</h2>
          <ul className="space-y-3 text-sm">
            {historyList.map((log) => (
              <li key={log.id} className="border-b border-gray-700 pb-2">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-300">{log.goods.name}</span>
                  <span className="text-gray-500 text-xs">{log.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className={`${log.change > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {log.change > 0 ? `+${log.change}` : log.change} ({log.reason})
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </main>
  );
}