import { toBlob } from "html-to-image";

/** 저장되는 이미지의 가로 폭(px). 기기 화면 폭과 무관하게 항상 같은 크기로 나온다. */
export const CAPTURE_WIDTH = 760;

export type CaptureResult =
  | { kind: "shared" }
  | { kind: "downloaded"; fileName: string }
  | { kind: "aborted" };

/**
 * 화면 요소를 PNG로 만들어 폰에서는 공유 시트로, PC에서는 다운로드로 넘긴다.
 * 공유 시트를 사용자가 닫은 경우는 오류가 아니라 kind: "aborted"로 돌려준다.
 *
 * 캡처 대상에는 data-capture-light를 달아 두어야 기기 다크모드와 무관하게 밝은 배경으로 그려진다.
 */
export async function saveNodeAsImage(
  node: HTMLElement,
  fileName: string
): Promise<CaptureResult> {
  const blob = await toBlob(node, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });
  if (!blob) throw new Error("이미지를 만들지 못했습니다.");

  const file = new File([blob], `${fileName}.png`, { type: "image/png" });

  // 폰에서는 공유 시트를 띄워 카카오톡 등으로 바로 보낼 수 있게 한다.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return { kind: "shared" };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return { kind: "aborted" };
      throw e;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.png`;
  link.click();
  URL.revokeObjectURL(url);
  return { kind: "downloaded", fileName: `${fileName}.png` };
}

/** 파일 이름에 붙일 오늘 날짜 (2026-11-25). */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
