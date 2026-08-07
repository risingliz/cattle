import type { GrowthStage } from "@/lib/format";

const STYLES: Record<GrowthStage, string> = {
  육성비육: "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70",
  비육전기: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  비육후기: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
  출하대기: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
};

export function GrowthStageBadge({ stage }: { stage: GrowthStage }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[stage]}`}>{stage}</span>
  );
}
