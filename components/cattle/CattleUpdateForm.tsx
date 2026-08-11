"use client";

import { useActionState } from "react";
import { updateCattle, type UpdateCattleState } from "@/app/cattle/actions";
import { primaryButtonClass } from "@/components/ui/classes";
import type { ReactNode } from "react";

/**
 * 저장 시마다 key를 바꿔 폼을 강제로 재마운트한다.
 * React는 서버 액션 완료 후 uncontrolled 필드를 "최초 렌더 시점의" defaultValue로 되돌리기 때문에,
 * 재마운트하지 않으면 방금 저장한 값이 아니라 이전 값으로 화면이 잠깐(때로는 계속) 보이는 문제가 있다.
 */
export function CattleUpdateForm({ cattleId, children }: { cattleId: string; children: ReactNode }) {
  const [state, formAction, isPending] = useActionState<UpdateCattleState | null, FormData>(
    updateCattle.bind(null, cattleId),
    null
  );

  return (
    <form
      key={state?.savedAt ?? "initial"}
      action={formAction}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {children}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "저장 중..." : "저장"}
        </button>
        {state?.savedAt && !isPending && (
          <span className="text-sm text-green-600 dark:text-green-400">저장되었습니다 ✓</span>
        )}
      </div>
    </form>
  );
}
