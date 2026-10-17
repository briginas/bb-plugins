/** Selected Beautiful Chat features; see THIRD_PARTY_NOTICES.md. */
export const LOADERS = ["drive", "dots", "orbit", "coins", "bb"] as const;

export function chatPreferences(values: Record<string, unknown>) {
  return {
    loader: LOADERS.find((option) => option === values.loader) ?? "drive",
    minimize: values.minimizeWhileRunning !== false,
  };
}

export function applyChatPreferences(root: HTMLElement, values: Record<string, unknown>): () => void {
  const { loader, minimize } = chatPreferences(values);
  const attributes = { "data-oldtale-loader": loader, "data-oldtale-minimize": String(minimize) };
  const previous = Object.keys(attributes).map((key) => [key, root.getAttribute(key)] as const);
  for (const [key, value] of Object.entries(attributes)) root.setAttribute(key, value);
  return () => {
    for (const [key, value] of previous) {
      if (value === null) root.removeAttribute(key);
      else root.setAttribute(key, value);
    }
  };
}

/** Streaming remounts should resume a loader's phase, not restart it. */
export function mountLoaderPhaseSync(doc: Document): () => void {
  const sync = (event: Event) => {
    const now = doc.timeline?.currentTime;
    const target = event.target as Element | null;
    if (now == null || !target?.getAnimations || !target.closest("[data-timeline-row-list]")) return;
    for (const animation of target.getAnimations({ subtree: true })) {
      const effect = animation.effect as KeyframeEffect | null;
      if ((animation as CSSAnimation).animationName?.startsWith("oldtale-") &&
          effect?.target === target && effect.getTiming().iterations === Infinity) {
        animation.currentTime = now;
      }
    }
  };
  doc.addEventListener("animationstart", sync, true);
  return () => doc.removeEventListener("animationstart", sync, true);
}
