"use client";

import { useRef, useState, type ReactNode } from "react";
import { toBlob } from "html-to-image";
import { secondaryButtonClass } from "@/components/ui/classes";

/** 저장되는 이미지의 가로 폭(px). 기기 화면 폭과 무관하게 항상 같은 크기로 나온다. */
const SHARE_WIDTH = 760;

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
      const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
        cacheBust: true,
      });
      if (!blob) throw new Error("이미지를 만들지 못했습니다.");

      const file = new File([blob], `${fileName}.png`, { type: "image/png" });

      // 폰에서는 공유 시트를 띄워 카카오톡 등으로 바로 보낼 수 있게 한다.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setSavedHint(`${fileName}.png 저장됨`);
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우는 오류가 아니다.
      if (e instanceof DOMException && e.name === "AbortError") return;
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
        <div ref={shotRef} style={{ width: SHARE_WIDTH }} className="bg-white p-4 dark:bg-[#0a0a0a]">
          {shareView}
        </div>
      </div>
    </div>
  );
}
