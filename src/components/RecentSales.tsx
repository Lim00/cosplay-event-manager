"use client"; // 1. 브라우저에서 동작하는 컴포넌트임을 선언 (클릭 이벤트 때문)

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SalesLog } from "@/lib/db";

// 2. [TypeScript] 부모(Page)에게 받을 '선물(Props)'의 타입을 정의합니다.
// 지금은 딱히 받을 게 없지만, 나중에 "환불 처리 함수"를 받을 수 있도록 미리 구멍을 뚫어둡니다.
interface Props {
  onRefundClick?: (log: SalesLog) => void; // (선택사항) 환불 버튼 누르면 실행될 함수
}

export default function RecentSales({ onRefundClick }: Props) {
  // 3. [React State] "지금 어떤 거래 내역이 펼쳐져 있니?" 를 기억하는 변수
  // number: 펼쳐진 거래의 ID, null: 아무것도 안 펼쳐짐
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 4. [Dexie] DB에서 데이터를 실시간으로 가져옵니다. (SQL의 SELECT * FROM logs ORDER BY time DESC LIMIT 5)
  // useLiveQuery는 데이터가 추가/수정되면 알아서 화면을 새로고침해줍니다. (마법 같은 훅이죠!)
  const logs = useLiveQuery(() => 
    db.salesLogs
      .orderBy("timestamp") // 시간순 정렬
      .reverse()            // 최신순으로 뒤집기
      .limit(10)            // 10개만 가져오기
      .toArray()
  );

  // 데이터 로딩 중일 때 보여줄 UI
  if (!logs) return <div className="text-gray-400 text-sm">로딩 중...</div>;

  // 데이터가 없을 때
  if (logs.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 text-center text-gray-400 text-sm">
        아직 거래 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2"> {/* space-y-2: 자식들 사이에 간격 주기 (Tailwind) */}
      <h2 className="font-bold text-lg text-gray-800 mb-2">최근 판매 기록</h2>
      
      {/* 5. [React List] 배열(logs)을 돌면서 화면(JSX)으로 변환합니다. */}
      {logs.map((log) => {
        // 현재 이 아이템이 펼쳐져 있는지 확인
        const isExpanded = expandedId === log.id;

        return (
          <div 
            key={log.id} // 리액트가 리스트를 관리할 때 쓰는 주민등록번호 (필수!)
            className={`
              border rounded-lg overflow-hidden transition-all duration-200
              ${isExpanded ? "border-blue-500 shadow-md bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}
            `}
          >
            {/* 6. [Event Handling] 요약 줄 (클릭하면 펼치기/접기) 
               onClick에서 삼항연산자(? :)를 써서 토글 기능을 구현했습니다.
            */}
            <div 
              className="p-3 flex justify-between items-center cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : log.id!)}
            >
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">
                  {/* 날짜 예쁘게 보여주기 (Intl.DateTimeFormat) */}
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`font-bold text-sm ${log.type === 'REFUND' ? 'text-red-500' : 'text-gray-800'}`}>
                  {log.type === 'REFUND' ? '환불 완료' : '판매 완료'}
                </span>
              </div>

              <div className="text-right">
                <div className="font-bold text-blue-600">
                  {/* 숫자 예쁘게 보여주기 (1000 -> 1,000) */}
                  {log.totalPrice.toLocaleString()}원
                </div>
                <div className="text-xs text-gray-400">
                  {log.count}개 품목 · {log.paymentMethod}
                </div>
              </div>
            </div>

            {/* 7. [Conditional Rendering] 펼쳐졌을 때만 보이는 상세 내용 */}
            {isExpanded && (
              <div className="p-3 border-t border-blue-100 bg-white/50 text-sm animate-fadeIn">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">상세 거래 ID: #{log.id}</span>
                  
                  {/* 환불 버튼: 판매(SELL) 기록일 때만 보여줌 */}
                  {log.type === 'SELL' && (
                    <button
                      className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded hover:bg-red-200 transition"
                      onClick={(e) => {
                        // 8. [중요!] 이벤트 전파 중단 (Stop Propagation)
                        // 이걸 안 하면 버튼을 눌렀는데 부모(박스) 클릭으로 인식돼서 박스가 접혀버립니다!
                        e.stopPropagation();
                        
                        // 부모에게 "이거 환불할래요!" 라고 알림
                        if (onRefundClick) onRefundClick(log);
                      }}
                    >
                      환불하기
                    </button>
                  )}
                </div>
                {/* 추후 여기에 어떤 물건을 샀는지 상세 목록을 추가할 예정 */}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}