import { getEbvGradeCode, type EbvGrades } from "@/lib/format";

/** 글자별 색: A는 초록, D는 빨강으로 강조하고 B·C는 기본 글자색으로 또렷하게. */
function letterClass(letter: string): string {
  switch (letter) {
    case "A":
      return "font-bold text-green-600 dark:text-green-400";
    case "B":
    case "C":
      return "font-semibold";
    case "D":
      return "font-semibold text-red-600 dark:text-red-400";
    default:
      return "text-black/25 dark:text-white/25";
  }
}

/**
 * 4대 형질 유전등급을 "AABC"처럼 한 덩어리로 표시한다.
 * 순서는 냉도체중 · 등심단면적 · 등지방두께 · 근내지방도.
 */
export function EbvGradeCode({ cattle, size = "sm" }: { cattle: EbvGrades; size?: "sm" | "lg" }) {
  const code = getEbvGradeCode(cattle);
  if (!code) {
    return <span className="text-black/30 dark:text-white/30">-</span>;
  }

  return (
    <span
      className={`inline-block font-mono leading-none tracking-[0.1em] whitespace-nowrap ${
        size === "lg" ? "text-xl" : "text-[11px]"
      }`}
      title="냉도체중 · 등심단면적 · 등지방두께 · 근내지방도"
    >
      {[...code].map((letter, i) => (
        <span key={i} className={letterClass(letter)}>
          {letter}
        </span>
      ))}
    </span>
  );
}
