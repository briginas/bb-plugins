import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

type SidebarThread = Pick<PluginSidebarThread, "id" | "environment" | "updatedAt">;

export function sidebarCardsEnabled(values: Record<string, unknown>): boolean {
  return values.sidebarCards !== false;
}

/** Compact age of the thread's last update, in the same units as the reference. */
export function threadAge(updatedAt: number, now: number): string {
  if (!Number.isFinite(updatedAt)) return "";
  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (seconds < 60) return "<1m";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/** Decorate the host's rows without replacing its links, status, or controls. */
export function mountSidebarCards(doc: Document) {
  const win = doc.defaultView!;
  let threads = new Map<string, SidebarThread>();
  let frame: number | null = null;
  let disposed = false;
  const rows = new Map<HTMLElement, { content: HTMLElement; branch: HTMLElement; label: HTMLElement; time: HTMLTimeElement }>();
  const root = doc.documentElement;
  const previous = root.getAttribute("data-oldtale-sidebar-cards");
  root.setAttribute("data-oldtale-sidebar-cards", "true");

  const remove = (row: HTMLElement) => {
    const entry = rows.get(row);
    if (!entry) return;
    entry.branch.remove();
    entry.time.remove();
    entry.content.removeAttribute("data-oldtale-sidebar-content");
    row.removeAttribute("data-oldtale-sidebar-row");
    rows.delete(row);
  };

  const sync = () => {
    if (disposed) return;
    const seen = new Set<HTMLElement>();
    const now = Date.now();
    for (const link of doc.querySelectorAll<HTMLElement>('[data-sidebar="sidebar"] [data-sidebar-thread-id]')) {
      const thread = threads.get(link.getAttribute("data-sidebar-thread-id") ?? "");
      const row = link.closest<HTMLElement>("[data-sidebar-rename-row]");
      const title = row?.querySelector<HTMLElement>(".bb-thread-title");
      const content = title?.parentElement;
      if (!thread || !row || !content || !row.querySelector("[data-sidebar-thread-trailing]")) continue;
      seen.add(row);
      let entry = rows.get(row);
      // The host may reuse a row while replacing its title subtree.
      if (entry && (entry.content !== content || !content.contains(entry.branch) || !row.contains(entry.time))) {
        remove(row);
        entry = undefined;
      }
      if (!entry) {
        const branch = doc.createElement("span");
        branch.style.display = "none"; // Oldtale CSS opts in; other palettes hide it.
        branch.setAttribute("data-oldtale-sidebar-branch", "");
        const icon = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("fill", "none");
        icon.setAttribute("stroke", "currentColor");
        icon.setAttribute("stroke-width", "1.5");
        icon.setAttribute("aria-hidden", "true");
        const path = doc.createElementNS(icon.namespaceURI, "path");
        path.setAttribute("d", "M6 6v12m0-6h6a6 6 0 0 0 6-6M9 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z");
        icon.append(path);
        const label = doc.createElement("span");
        branch.append(icon, label);
        const time = doc.createElement("time");
        time.style.display = "none";
        time.setAttribute("data-oldtale-sidebar-time", "");
        content.append(branch);
        row.append(time);
        content.setAttribute("data-oldtale-sidebar-content", "");
        row.setAttribute("data-oldtale-sidebar-row", "");
        entry = { content, branch, label, time };
        rows.set(row, entry);
      }
      const branchName = thread.environment?.branchName?.trim() ?? "";
      if (entry.label.textContent !== branchName) entry.label.textContent = branchName;
      entry.branch.title = branchName;
      const age = threadAge(thread.updatedAt, now);
      if (entry.time.textContent !== age) entry.time.textContent = age;
      if (Number.isFinite(thread.updatedAt)) {
        entry.time.dateTime = new Date(thread.updatedAt).toISOString();
        entry.time.title = `Последнее обновление: ${new Date(thread.updatedAt).toLocaleString()}`;
      } else {
        entry.time.removeAttribute("datetime");
        entry.time.removeAttribute("title");
      }
    }
    for (const row of rows.keys()) if (!seen.has(row)) remove(row);
  };
  const schedule = () => {
    if (disposed || frame !== null) return;
    frame = win.requestAnimationFrame(() => { frame = null; sync(); });
  };
  const observer = new win.MutationObserver(schedule);
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-sidebar-thread-id"] });
  const timer = win.setInterval(sync, 60_000);
  return {
    update(next: readonly SidebarThread[]) {
      threads = new Map(next.map((thread) => [thread.id, thread]));
      sync();
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      win.clearInterval(timer);
      if (frame !== null) win.cancelAnimationFrame(frame);
      for (const row of rows.keys()) remove(row);
      if (previous === null) root.removeAttribute("data-oldtale-sidebar-cards");
      else root.setAttribute("data-oldtale-sidebar-cards", previous);
    },
  };
}
