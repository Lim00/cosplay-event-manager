import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-4xl font-bold">Cosplay Inventory</h1>
      <p className="text-gray-500">Google Login Test</p>
      
      <div className="flex gap-4">
        <Link 
          href="/api/auth/signin" 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
        >
          구글 로그인 시작
        </Link>
      </div>
    </main>
  );
}