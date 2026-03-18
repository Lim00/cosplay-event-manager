// src/components/SearchBar.tsx
"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = "검색어를 입력하세요..." }: SearchBarProps) {
  return (
    <div className="mb-6 relative w-full">
      <input 
        type="text" 
        placeholder={placeholder}
        className="w-full p-4 pl-12 border border-gray-200 rounded-xl bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-gray-700 font-bold placeholder-gray-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">
        🔍
      </span>
      {/* 검색어가 있을 때만 나타나는 X(지우기) 버튼 */}
      {value && (
        <button 
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold text-lg transition-colors bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center"
          title="검색어 지우기"
        >
          ✕
        </button>
      )}
    </div>
  );
}