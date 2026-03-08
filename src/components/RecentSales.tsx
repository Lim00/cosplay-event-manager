"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, SalesLog } from "@/lib/db";

interface Props {
  eventId: number; // [New!]
  onRefundClick: (log: SalesLog) => void;
}

export default function RecentSales({ eventId, onRefundClick }: Props) {
  // 💡 핵심: eventId로 필터링하고, 최신순으로 정렬합니다.
  const sales = useLiveQuery(
    () => db.salesLogs.where({ eventId }).reverse().toArray(),
    [eventId]
  );

  if (!sales?.length) return <div className="p-4 text-center text-gray-400 text-sm">아직 거래 내역이 없습니다.</div>;

  return (
    <div className="space-y-2">
      {sales.map((log) => (
        <div key={log.id} className="bg-white p-3 rounded shadow-sm border border-gray-100 text-sm">
          <div className="flex justify-between items-center mb-1">
            <span className={`font-bold ${log.type === "REFUND" ? "text-red-500" : "text-green-600"}`}>
              {log.type === "REFUND" ? "환불" : "결제"}
            </span>
            <span className="text-gray-400 text-xs">
              {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          <div className="flex justify-between items-end mt-2">
            <div>
              <span className="text-gray-800 font-bold">{Math.abs(log.totalPrice).toLocaleString()}원</span>
              <span className="text-gray-500 ml-1">({log.count}개)</span>
            </div>
            {log.type === "SELL" && (
              <button 
                onClick={() => onRefundClick(log)}
                className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100 font-bold"
              >
                환불하기
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}