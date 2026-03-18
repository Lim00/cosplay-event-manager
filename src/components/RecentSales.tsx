"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, SalesLog } from "@/lib/db";

interface Props {
  eventId: number;
  onRefundClick: (log: SalesLog) => void;
  onExchangeClick: (log: SalesLog) => void; // 🌟 [New] 교환 클릭 핸들러 추가
}

export default function RecentSales({ eventId, onRefundClick, onExchangeClick }: Props) {
  const sales = useLiveQuery(
    () => db.salesLogs.where({ eventId }).reverse().toArray(),
    [eventId]
  );

  if (!sales?.length) return <div className="p-4 text-center text-gray-400 text-sm">아직 거래 내역이 없습니다.</div>;

  return (
    <div className="space-y-2">
      {sales.map((log) => (
        <div key={log.id} className={`bg-white p-3 rounded shadow-sm border text-sm ${log.type === "EXCHANGE" ? "border-purple-200 bg-purple-50" : "border-gray-100"}`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`font-bold 
              ${log.type === "REFUND" ? "text-red-500" : log.type === "EXCHANGE" ? "text-purple-600" : "text-green-600"}
            `}>
              {log.type === "REFUND" ? "환불" : log.type === "EXCHANGE" ? "파본 교환" : "결제"}
            </span>
            <span className="text-gray-400 text-xs">
              {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          <div className="flex justify-between items-end mt-2">
            <div>
              <span className={`font-bold ${log.type === "EXCHANGE" ? "text-purple-600" : "text-gray-800"}`}>
                {Math.abs(log.totalPrice).toLocaleString()}원
              </span>
              <span className="text-gray-500 ml-1">({log.count}개)</span>
            </div>
            
            {/* 🌟 결제(SELL) 건에 대해서만 교환/환불 버튼 노출 */}
            {log.type === "SELL" && (
              <div className="flex gap-1">
                <button 
                  onClick={() => onExchangeClick(log)}
                  className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200 font-bold transition-colors"
                >
                  교환
                </button>
                <button 
                  onClick={() => onRefundClick(log)}
                  className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100 font-bold transition-colors"
                >
                  환불
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}