import Link from "next/link";
import { Card } from "@/components/ui/Card";

const SETTINGS_LINKS = [
  {
    href: "/cattle/new",
    title: "개체 등록",
    description: "새로 입식한 개체를 이력번호로 등록합니다.",
  },
  {
    href: "/settings/pens",
    title: "우방 관리",
    description: "우방 이름을 수정하고 우방별 사육 현황을 확인합니다.",
  },
  {
    href: "/settings/feed-costs",
    title: "사육비 설정",
    description: "기간별 일별 고정 사육비 이력을 관리합니다.",
  },
  {
    href: "/settings/delete",
    title: "개체 삭제",
    description: "등록된 개체(사육중/출하완료/폐사)를 검색해 삭제합니다.",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">설정</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SETTINGS_LINKS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-colors hover:border-black/30 dark:hover:border-white/30">
              <h2 className="text-base font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">{item.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
