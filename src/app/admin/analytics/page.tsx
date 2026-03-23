"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SalesLog } from "@/lib/db";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import RankBarChart from "@/components/charts/RankBarChart";
import CategoryPieChart from "@/components/charts/CategoryPieChart";

export default function AnalyticsPage() {
  const events = useLiveQuery(() => db.events.orderBy("date").reverse().toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const inventory = useLiveQuery(() => db.inventory.toArray());
  
  // 🌟 [Event Selector] 분석할 행사를 선택 (기본값: 가장 최신 행사)
  const [selectedEventId, setSelectedEventId] = useState<number | "">("");

  // 최신 행사가 로드되면 자동으로 기본값 세팅
  useMemo(() => {
    if (events && events.length > 0 && selectedEventId === "") {
      setSelectedEventId(events[0].id!);
    }
  }, [events, selectedEventId]);

  // 선택된 행사의 영수증만 가져오기
  const logs = useLiveQuery(
    () => selectedEventId 
        ? db.salesLogs.where({ eventId: Number(selectedEventId) }).toArray() 
        : Promise.resolve([] as SalesLog[]), 
    [selectedEventId]
    );

  // 🌟 [데이터 파이프라인] KPI 및 차트용 데이터 정제
  const { kpis, timeSeriesData, rankData, categoryData } = useMemo(() => {
    if (!logs || !products || !inventory) {
      return { kpis: null, timeSeriesData: [], rankData: [], categoryData: [] };
    }

    // 1. KPI 계산기
    let grossRevenue = 0; let netRevenue = 0; let totalSalesCount = 0; let actionCount = 0;
    
    // 2. 시간대별 데이터 맵
    const timeMap: Record<string, number> = {};
    // 3. 상품 랭킹 맵
    const productRankMap: Record<string, number> = {};
    // 4. 카테고리 맵
    const categoryMap: Record<string, number> = {};

    logs.forEach((log) => {
      const product = products.find(p => p.id === log.productId);
      const productName = product?.name || "알 수 없는 상품";
      
      // --- KPI 집계 ---
      if (log.type === "SELL") {
        grossRevenue += log.totalPrice;
        netRevenue += log.totalPrice;
        totalSalesCount += log.count;
      } else if (log.type === "REFUND") {
        netRevenue += log.totalPrice; // 환불액은 마이너스이므로 더하면 차감됨
        actionCount += log.count;
      } else if (log.type === "EXCHANGE") {
        actionCount += log.count;
      }

      // --- 시간대별 집계 (순수익 기준) ---
      if (log.type !== "EXCHANGE") {
        const hour = log.timestamp.getHours().toString().padStart(2, "0");
        const timeLabel = `${hour}:00`;
        timeMap[timeLabel] = (timeMap[timeLabel] || 0) + log.totalPrice;
      }

      // --- 상품 랭킹 집계 (판매 개수 기준) ---
      if (log.type === "SELL") productRankMap[productName] = (productRankMap[productName] || 0) + log.count;
      if (log.type === "REFUND") productRankMap[productName] = (productRankMap[productName] || 0) - log.count;

      // --- 카테고리 집계 (순수익 기준) ---
      if (log.type !== "EXCHANGE" && product) {
        let catName = "기타";
        if (product.isBundle) {
          catName = "세트(Bundle)"; // 세트 상품은 별도 카테고리로 묶음
        } else if (product.components.length > 0) {
          const invItem = inventory.find(i => i.id === product.components[0].itemId);
          if (invItem) catName = invItem.category;
        }
        categoryMap[catName] = (categoryMap[catName] || 0) + log.totalPrice;
      }
    });

    // 맵(Map) 데이터를 차트용 배열로 변환 및 정렬
    const timeSeries = Object.entries(timeMap)
      .map(([time, amount]) => ({ time, amount }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const ranks = Object.entries(productRankMap)
      .map(([name, sales]) => ({ name, sales }))
      .filter(item => item.sales > 0) // 판매량이 0 이하인 건 제외
      .sort((a, b) => b.sales - a.sales) // 내림차순 정렬
      .slice(0, 5); // Top 5만 자르기

    const categories = Object.entries(categoryMap)
      .map(([category, value]) => ({ category, value }))
      .filter(item => item.value > 0);

    return {
      kpis: { grossRevenue, netRevenue, totalSalesCount, actionCount },
      timeSeriesData: timeSeries,
      rankData: ranks,
      categoryData: categories
    };
  }, [logs, products, inventory]);

  // 🌟 [엑셀(CSV) 다운로드 로직]
  const downloadCSV = () => {
    if (!logs || logs.length === 0) return alert("다운로드할 데이터가 없습니다.");

    // CSV 헤더
    let csvContent = "거래ID,유형,상품명,수량,총금액(원),결제수단,결제시간\n";

    logs.forEach(log => {
      const product = products?.find(p => p.id === log.productId);
      const typeLabel = log.type === "SELL" ? "결제" : log.type === "REFUND" ? "환불" : "교환";
      const timeString = log.timestamp.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      
      // 콤마(,)가 포함된 문자열 방지를 위해 쌍따옴표로 감쌈
      csvContent += `${log.id},${typeLabel},"${product?.name || "알수없음"}",${log.count},${log.totalPrice},${log.paymentMethod},"${timeString}"\n`;
    });

    // 한글 깨짐 방지를 위한 BOM(\uFEFF) 추가
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const eventName = events?.find(e => e.id === Number(selectedEventId))?.name || "정산내역";
    
    link.href = url;
    link.setAttribute("download", `${eventName}_매출장부.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!kpis) return <div className="p-8">데이터를 불러오는 중입니다...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      {/* 상단 헤더 & 컨트롤 */}
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            📊 정산 및 통계
          </h1>
          <p className="text-gray-500 mt-2 text-sm">행사별 매출과 판매 트렌드를 분석합니다.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <select 
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : "")}
            className="p-3 border rounded-lg bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500"
          >
            {events?.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <button 
            onClick={downloadCSV}
            className="px-5 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center gap-2"
          >
            📥 엑셀(CSV) 다운로드
          </button>
        </div>
      </div>

      {logs?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
          선택한 행사에 아직 결제 내역이 없습니다.
        </div>
      ) : (
        <>
          {/* 1. KPI 카드 섹션 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
              <div className="text-sm font-bold text-gray-500 mb-1">총 매출액 (Gross)</div>
              <div className="text-2xl font-black text-gray-800">{kpis.grossRevenue.toLocaleString()}원</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
              <div className="text-sm font-bold text-gray-500 mb-1">실 순수익 (Net)</div>
              <div className="text-2xl font-black text-purple-600">{kpis.netRevenue.toLocaleString()}원</div>
              <div className="text-xs text-gray-400 mt-1">환불금액이 차감된 실제 수익입니다.</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
              <div className="text-sm font-bold text-gray-500 mb-1">총 판매 굿즈 수</div>
              <div className="text-2xl font-black text-gray-800">{kpis.totalSalesCount.toLocaleString()}개</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-red-400">
              <div className="text-sm font-bold text-gray-500 mb-1">교환 및 환불 건수</div>
              <div className="text-2xl font-black text-gray-800">{kpis.actionCount.toLocaleString()}건</div>
            </div>
          </div>

          {/* 2. 차트 섹션 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 시간대별 매출 추이 (Full Width on mobile, 2/3 on desktop) */}
            <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📈 시간대별 매출 추이</h3>
              <TimeSeriesChart data={timeSeriesData} xKey="time" yKey="amount" color="#8b5cf6" />
            </div>

            {/* 효자 상품 Top 5 */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🏆 효자 상품 판매량 Top 5</h3>
              <RankBarChart data={rankData} xKey="name" yKey="sales" />
            </div>

            {/* 카테고리별 매출 비중 */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🥧 카테고리별 매출 비중</h3>
              <CategoryPieChart data={categoryData} nameKey="category" dataKey="value" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}