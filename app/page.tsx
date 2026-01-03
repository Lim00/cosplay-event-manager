// src/app/page.tsx
import { prisma } from '@/lib/prisma'; 
import { checkInVisitor } from './actions';

// [Server Component] 페이지가 렌더링될 때 DB에서 데이터를 가져옴
export default async function Home() {
  // DB 조회 (최신순 정렬)
  const logs = await prisma.entryLog.findMany({
    orderBy: { id: 'desc' },
  });
  
  return (
    <main className="flex min-h-screen flex-col items-center p-10 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-10">🌸 코스프레 행사 관리 시스템</h1>

      <div className="flex flex-col lg:flex-row gap-10 w-full max-w-5xl">
        
        {/* 구역 1: 입장 처리 (Client Input) */}
        <div className="flex-1 border border-gray-700 p-6 rounded-xl bg-gray-800 shadow-lg">
          <h2 className="text-xl mb-4 font-bold text-pink-500 border-b border-gray-700 pb-2">
            📷 입장 등록
          </h2>
          <form action={checkInVisitor} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">방문자 이름 / 닉네임</label>
              <input 
                name="visitorName" 
                placeholder="예: 흥국이, 텍사스" 
                className="w-full p-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-pink-500" 
                required
                autoComplete="off"
              />
            </div>
            <button type="submit" className="w-full bg-pink-600 py-3 rounded font-bold hover:bg-pink-700 transition-colors">
              입장 확인
            </button>
          </form>
        </div>

        {/* 구역 2: 실시간 현황판 (Dashboard) */}
        <div className="flex-1 border border-gray-700 p-6 rounded-xl bg-gray-800 shadow-lg">
          <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <h2 className="text-xl font-bold text-blue-400">📊 실시간 현황</h2>
            <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded">
              총 {logs.length}명
            </span>
          </div>
          
          <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <li className="text-center text-gray-500 py-10">아직 입장객이 없습니다.</li>
            ) : (
              logs.map((log) => (
                <li key={log.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded hover:bg-gray-700">
                  <span className="font-bold text-gray-200">{log.visitor}</span>
                  <span className="text-xs text-gray-400">
                    {log.timestamp.toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

      </div>
    </main>
  );
}