"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/cattle", label: "사육 목록" },
  { href: "/pens", label: "배치도" },
  { href: "/shipments", label: "출하 목록" },
  { href: "/cashflow", label: "현금흐름" },
  { href: "/market-price", label: "시세" },
  { href: "/settings", label: "설정" },
];

export function NavBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-black">
      {/* 좁은 화면에서는 브랜드명을 감추고 메뉴에 가로 폭을 모두 내준다.
          (메뉴가 눌려 "사 육 / 목 록" 처럼 글자 단위로 줄바꿈되던 문제) */}
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4">
        <Link href="/cattle" className="hidden shrink-0 py-3 text-sm font-bold sm:block">
          한우 비육 관리
        </Link>
        <nav className="-mx-4 flex gap-4 overflow-x-auto px-4 text-sm text-black/70 sm:mx-0 sm:px-0 dark:text-white/70">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 shrink-0 items-center whitespace-nowrap hover:text-black sm:min-h-0 sm:py-3 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
