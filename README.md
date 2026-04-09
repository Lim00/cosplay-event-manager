# 📦 Doujin POS & ERP System

오프라인 서브컬처 동인 행사(코믹월드, 일러스타 페스 등)의 부스 운영을 완벽하게 통제하기 위해 제작된 **무중단 웹 기반 POS 및 재고 관리(ERP) 시스템**입니다.

## 🚀 Overview
인터넷 환경이 불안정한 오프라인 행사장의 특성을 고려하여, 브라우저 로컬 데이터베이스(`IndexedDB`)를 활용해 네트워크 단절 시에도 100% 정상 작동하도록 설계되었습니다. 복잡한 굿즈 재고 관리, 선입금 예약 수령, 그리고 행사 종료 후의 정산까지 단 하나의 앱으로 해결합니다.

## ✨ Key Features
* **📶 Offline-First POS:** 인터넷이 끊겨도 결제, 환불, 영수증 발행이 멈추지 않는 로컬 구동 방식.
* **📦 Master Inventory:** 통합 창고 재고 관리 및 입출고 복식부기 로그 트래킹.
* **📋 Event Menu Manager:** 행사별 독립적인 메뉴판 구성, 세트(Bundle) 상품 생성 및 행사 한정 가격 조정(Override) 기능.
* **📦 Pre-order System:** 선입금 예약 등록 즉시 물리 재고 격리(Lock) 및 현장 1초 픽업(검색) 시스템.
* **📊 Analytics Dashboard:** 직관적인 관제탑(Cockpit) 위젯과 행사 종료 후 즉각적인 매출 통계 및 CSV 장부 추출 기능.
* **🔐 Stateless OTP Security:** 해시(HMAC) 암호화 기반의 DB-less 이메일 인증 시스템으로 안전한 클로즈 베타 운영.

## 🛠️ Tech Stack
* **Framework:** Next.js (App Router), React
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Database (Local):** Dexie.js (IndexedDB)
* **Auth & Security:** NextAuth.js, Resend (Email API), Node Crypto (HMAC)
* **Deployment:** Vercel

## ⚙️ Quick Start

### 1. Clone the repository
```bash
git clone [https://github.com/your-username/doujin-pos-erp.git](https://github.com/your-username/doujin-pos-erp.git)
cd doujin-pos-erp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
RESEND_API_KEY=your_resend_api_key
OTP_SECRET=your_custom_random_secret_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

### 4. Run the development server
```bash
npm run dev
```