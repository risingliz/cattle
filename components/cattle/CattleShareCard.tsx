"use client";

import { useRef, useState, type ReactNode } from "react";
import { secondaryButtonClass } from "@/components/ui/classes";
import { CAPTURE_WIDTH, saveNodeAsImage } from "@/lib/capture";

/**
 * 요약 카드를 이미지로 저장/공유한다.
 * 화면에 보이는 카드와 별개로, 화면 밖에 고정 폭 사본을 그려두고 그쪽을 캡처한다.
 * (폰에서 캡처해도 데스크톱과 같은 배치·해상도의 이미지가 나오게 하기 위함)
 */
export function CattleShareCard({
  fileName,
  shareView,
  children,
}: {
  fileName: string;
  shareView: ReactNode;
  children: ReactNode;
}) {
  const shotRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  async function handleSave() {
    const node = shotRef.current;
    if (!node) return;

    setError(null);
    setSavedHint(null);
    setBusy(true);
    try {
      const result = await saveNodeAsImage(node, fileName);
      if (result.kind === "downloaded") setSavedHint(`${result.fileName} 저장됨`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {children}

      <div className="flex items-center gap-2">
        <button type="button" onClick={handleSave} disabled={busy} className={secondaryButtonClass}>
          {busy ? "이미지 만드는 중..." : "이미지로 저장 / 공유"}
        </button>
        {savedHint && <span className="text-xs text-black/50 dark:text-white/50">{savedHint}</span>}
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </div>

      {/* 캡처 전용 사본 — 화면 밖에 두되 display:none은 쓰지 않는다(레이아웃이 계산되어야 함). */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-[-10000px]">
        <div ref={shotRef} data-capture-light style={{ width: CAPTURE_WIDTH }} className="bg-white p-4">
          {shareView}
        </div>
      </div>
    </div>
  );
}
