// 모바일에서는 글자 16px + 최소 높이 44px을 유지한다.
// (iOS는 16px 미만 입력창을 탭하면 화면을 자동 확대하고, 44px 미만은 장갑 낀 손으로 누르기 어렵다.)
export const inputClass =
  "w-full min-h-11 rounded-md border border-black/15 bg-white px-3 py-1.5 text-base outline-none focus:border-black/40 sm:min-h-0 sm:text-sm dark:border-white/15 dark:bg-black/20 dark:focus:border-white/40";

export const labelClass = "mb-1 block text-xs font-medium text-black/60 dark:text-white/60";

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50 sm:min-h-0 dark:bg-white dark:text-black dark:hover:bg-white/80";

export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-50 sm:min-h-0 dark:border-white/15 dark:hover:bg-white/10";

export const dangerButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 sm:min-h-0 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10";
