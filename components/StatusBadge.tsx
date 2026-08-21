import { ASSISTANT_STATE_INFO, type AssistantState } from "@/types";

const DOT_COLOR: Record<AssistantState, string> = {
  idle: "bg-emerald-400",
  connecting: "bg-amber-400",
  ready: "bg-emerald-400",
  listening: "bg-sky-400",
  thinking: "bg-violet-400",
  speaking: "bg-teal-400",
  error: "bg-red-500",
};

interface StatusBadgeProps {
  state: AssistantState;
}

/**
 * Visually minimal status badge. The status is never communicated
 * by color alone: it always carries a text label, and every change
 * is announced to assistive technology through a live region.
 */
export function StatusBadge({ state }: StatusBadgeProps) {
  const info = ASSISTANT_STATE_INFO[state];

  return (
    <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[state]}`}
      />
      <span className="text-sm font-semibold tracking-[0.2em] text-foreground">
        {info.label}
      </span>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {info.description}
      </span>
    </div>
  );
}
