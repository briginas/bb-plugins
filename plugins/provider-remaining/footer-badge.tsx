import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { remainingPercent } from "./usage-format.js";
import type { UsageProvider } from "./usage-schema.js";

export const FOOTER_BADGE_ICON = "provider-remaining-quota";

interface FooterBadge {
  text: string;
  tone: "normal" | "warning" | "critical" | "unknown";
  stale: boolean;
}

const listeners = new Set<() => void>();
let badge: FooterBadge = { text: "—", tone: "unknown", stale: false };

export function updateFooterBadge(accounts: UsageProvider[], stale: boolean) {
  const measurements = accounts
    .flatMap((account) =>
      account.usage?.status === "ok"
        ? account.usage.windows.map((window) =>
            remainingPercent(window.usedPercent),
          )
        : [],
    )
    .filter(Number.isFinite);
  const remaining = measurements.length === 0 ? null : Math.min(...measurements);
  const next: FooterBadge = {
    text: remaining === null ? "—" : String(Math.round(remaining)),
    tone:
      remaining === null ? "unknown" :
      remaining <= 5 ? "critical" :
      remaining <= 20 ? "warning" : "normal",
    stale,
  };
  if (
    badge.text === next.text &&
    badge.tone === next.tone &&
    badge.stale === next.stale
  ) return;
  badge = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// App icons render outside the owning plugin's slot context. Read our store,
// rather than calling plugin-scoped SDK hooks from the registered icon.
export function ProviderRemainingIcon({ className }: { className?: string }) {
  const { text, tone, stale } = useSyncExternalStore(
    subscribe,
    () => badge,
    () => badge,
  );
  const description = stale
    ? "Showing last update; usage could not be refreshed."
    : text === "—"
      ? "Remaining quota is unavailable."
      : `${text}% remaining; lowest reported quota in the selected tab.`;
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Icon name="ChartColumn" className="size-full opacity-65" />
      <span
        data-provider-remaining-badge=""
        data-stale={stale || undefined}
        title={description}
        className={cn(
          "pointer-events-none absolute -right-2 -top-1.5 min-w-[17px] rounded bg-sidebar px-0.5 py-px text-center text-[10px] leading-none font-medium tabular-nums",
          tone === "normal" && "text-sidebar-foreground",
          tone === "warning" && "text-warning-text",
          tone === "critical" && "text-destructive",
          tone === "unknown" && "text-muted-foreground",
          stale && "underline decoration-dotted underline-offset-2",
        )}
      >
        {text}
      </span>
    </span>
  );
}
