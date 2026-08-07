"use client";

export function FillInputButton({
  targetId,
  value,
  label,
  className,
}: {
  targetId: string;
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const el = document.getElementById(targetId);
        if (el instanceof HTMLInputElement) {
          el.value = String(value);
          el.focus();
        }
      }}
    >
      {label}
    </button>
  );
}
