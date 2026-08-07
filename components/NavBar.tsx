"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/cattle", label: "사육 목록" },
  { href: "/shipments", label: "출하 목록" },
  { href: "/cashflow", label: "현금흐름" },
  { href: "/settings", label: "설정" },
];

export function NavBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-black">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/cattle" className="text-sm font-bold">
            한우 비육 관리
          </Link>
          <nav className="flex gap-4 text-sm text-black/70 dark:text-white/70">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-black dark:hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
