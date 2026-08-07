"use client";

import { useState, useTransition } from "react";
import { syncCattleFromAPI } from "@/app/cattle/actions";
import { secondaryButtonClass } from "@/components/ui/classes";

export function SyncButton({
  cattleId,
  force = false,
  label,
}: {
  cattleId: string;
  force?: boolean;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        className={secondaryButtonClass}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await syncCattleFromAPI(cattleId, { force });
            } catch (e) {
              setError(e instanceof Error ? e.message : "동기화에 실패했습니다.");
            }
          });
        }}
      >
        {pending ? "동기화 중..." : label}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
