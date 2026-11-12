"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resyncActiveCattle, type ResyncResult } from "@/app/settings/resync/actions";
import { primaryButtonClass } from "@/components/ui/classes";

export function ResyncAllButton({ activeCount }: { activeCount: number }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ResyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          type="button"
          disabled={pending}
          className={primaryButtonClass}
          onClick={() => {
            setError(null);
            setResult(null);
            startTransition(async () => {
              try {
                setResult(await resyncActiveCattle());
              } catch (e) {
                setError(e instanceof Error ? e.message : "재조회에 실패했습니다.");
              }
            });
          }}
        >
          {pending ? `조회 중... (${activeCount}두)` : `사육중 ${activeCount}두 전체 재조회`}
        </button>
        {pending && (
          <p className="mt-2 text-xs text-black/50 dark:text-white/50">
            개체 수에 따라 1분 정도 걸릴 수 있습니다. 이 화면을 벗어나지 말고 기다려주세요.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <p className="text-sm">
            <span className="font-semibold">{result.checked}두</span> 확인 완료 · 상태 변경{" "}
            <span className="font-semibold">{result.changes.length}두</span>
            {result.failed > 0 && (
              <span className="text-red-600 dark:text-red-400"> · 조회 실패 {result.failed}두</span>
            )}
          </p>

          {result.changes.length === 0 ? (
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              출하·폐사로 바뀐 개체가 없습니다.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {result.changes.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Link href={`/cattle/${c.id}`} className="font-mono font-semibold underline">
                      {c.managementNo}
                    </Link>
                    <span className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-black/60 dark:bg-white/10 dark:text-white/60">
                      {c.from} → {c.to}
                    </span>
                  </span>
                  <span className="text-xs whitespace-nowrap text-black/50 tabular-nums dark:text-white/50">
                    {c.date ?? "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {result.changes.length > 0 && (
            <p className="mt-3 text-xs text-black/50 dark:text-white/50">
              출하완료로 바뀐 개체는{" "}
              <Link href="/shipments" className="underline">
                출하 목록
              </Link>
              에서 등급·순수익을 확인할 수 있습니다. 출하가격이 비어있으면 음성공판장 시세로 추정가가
              자동 계산됩니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
