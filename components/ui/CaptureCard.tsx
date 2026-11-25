"use client";

import { useRef, useState, type ReactNode } from "react";
import { Card } from "./Card";
import { CAPTURE_WIDTH, saveNodeAsImage } from "@/lib/capture";

/**
 * 제목 옆에 "이미지" 버튼이 붙은 카드. 눌러서 카드 내용을 PNG로 저장하거나 공유한다.
 *
 * 화면에 보이는 카드와 별개로, 화면 밖에 고정 폭(760px) 사본을 그려두고 그쪽을 캡처한다.
 * 폰에서 눌러도 데스크톱과 같은 배치로 나오고, 가로 스크롤되는 표도 잘리지 않는다.
 * 그래서 children은 두 번 그려진다 — 자체 상태를 가진 컴포넌트는 사본이 따로 놀므로 넣지 말 것.
 */
export function CaptureCard({
  title,
  fileName,
  caption,
  children,
}: {
  title: string;
  /** 확장자 없는 파일명 */
  fileName: string;
  /** 이미지 아래에 붙일 출처 한 줄 (화면에는 안 보임) */
  caption?: string;
  children: ReactNode;
}) {
  const shotRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);

  async function handleSave() {
    const node = shotRef.current;
    if (!node) return;

    setNote(null);
    setBusy(true);
    try {
      const result = await saveNodeAsImage(node, fileName);
      if (result.kind === "downloaded") setNote({ text: `${result.fileName} 저장됨`, error: false });
    } catch (e) {
      setNote({
        text: e instanceof Error ? e.message : "이미지 저장에 실패했습니다.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={title}
      action={
        <span className="flex shrink-0 items-center gap-2">
          {note && (
            <span
              className={`text-xs ${note.error ? "text-red-600 dark:text-red-400" : "text-black/50 dark:text-white/50"}`}
            >
              {note.text}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            aria-label={`${title} 이미지로 저장`}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-black/15 px-2 text-xs leading-none font-medium whitespace-nowrap hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
          >
            <DownloadIcon />
            {busy ? "만드는 중" : "이미지"}
          </button>
        </span>
      }
    >
      {children}

      {/* 캡처 전용 사본 — 화면 밖에 두되 display:none은 쓰지 않는다(레이아웃이 계산되어야 함). */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-[-10000px]">
        <div
          ref={shotRef}
          data-capture-light
          style={{ width: CAPTURE_WIDTH }}
          className="bg-white p-5"
        >
          <h2 className="mb-3 text-base font-semibold">{title}</h2>
          {children}
          {caption && <p className="mt-4 text-[11px] text-black/40">{caption}</p>}
        </div>
      </div>
    </Card>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 2v8" />
      <path d="M4.5 7 8 10.5 11.5 7" />
      <path d="M2.5 13.5h11" />
    </svg>
  );
}
