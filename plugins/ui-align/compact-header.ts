import { subscribeStatus } from './alignment.js';

const TITLE_BAR = '[data-testid="app-window-title-bar"]';
const ROW = '[data-testid="app-page-header-content-row"]';
const THREAD_ACTIONS = '[data-thread-header-pane-actions]';
const MARKER = 'data-bb-ui-align-compact-header';
const TARGETS = `${TITLE_BAR}, ${ROW}, ${THREAD_ACTIONS}, [data-split-pane-id]`;

export type CompactHeaderStatus = {
  enabled: boolean;
  active: boolean;
  reason: 'disabled' | 'no-title-bar' | 'no-thread' | 'split-layout' |
    'compact-viewport' | 'unsupported-layout' | 'not-enough-space' | 'active';
  availableWidth: number;
};

let enabled = false;
const refreshListeners = new Set<() => void>();
const statusListeners = new Set<(status: CompactHeaderStatus) => void>();
let latestStatus: CompactHeaderStatus | null = null;

export function setCompactHeaderEnabled(value: boolean): void {
  if (enabled === value) return;
  enabled = value;
  for (const refresh of refreshListeners) refresh();
}

export function subscribeCompactHeaderStatus(listener: (status: CompactHeaderStatus) => void): () => void {
  statusListeners.add(listener);
  if (latestStatus) listener(latestStatus);
  return () => { statusListeners.delete(listener); };
}

function visible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
}

// A transformed/contained ancestor changes the containing block of position:fixed.
// Keep the native layout in that case rather than painting over conversation text.
function supportsViewportPosition(header: HTMLElement): boolean {
  for (let parent = header.parentElement; parent; parent = parent.parentElement) {
    const css = getComputedStyle(parent);
    if (css.transform !== 'none' || css.translate !== 'none' || css.rotate !== 'none' || css.scale !== 'none' ||
      css.perspective !== 'none' || css.filter !== 'none' ||
      css.backdropFilter !== 'none' || /transform|perspective|filter/.test(css.willChange) ||
      /paint|layout|strict|content/.test(css.contain) || css.contentVisibility === 'auto') return false;
  }
  return true;
}

export function mountCompactHeader(signal: AbortSignal): () => void {
  if (signal.aborted) return () => {};
  const style = document.createElement('style');
  style.dataset.bbUiAlignCompactHeaderStyle = '';
  document.head.append(style);
  let activeHeader: HTMLElement | null = null;
  let frame = 0;
  let disposed = false;
  const observed = new Set<Element>();
  const media = matchMedia('(min-width: 768px) and (pointer: fine)');
  const resize = new ResizeObserver(() => schedule());

  const observe = (elements: Element[]) => {
    const next = new Set(elements);
    for (const element of observed) if (!next.has(element)) { resize.unobserve(element); observed.delete(element); }
    for (const element of next) if (!observed.has(element)) { resize.observe(element); observed.add(element); }
  };
  const clear = () => {
    activeHeader?.removeAttribute(MARKER);
    activeHeader = null;
    if (style.textContent) style.textContent = '';
  };
  const report = (reason: CompactHeaderStatus['reason'], availableWidth = 0) => {
    const status = { enabled, active: reason === 'active', reason, availableWidth: Math.round(availableWidth) };
    if (JSON.stringify(status) === JSON.stringify(latestStatus)) return;
    latestStatus = status;
    for (const listener of statusListeners) listener(status);
  };

  const update = () => {
    frame = 0;
    if (disposed) return;
    const bar = document.querySelector<HTMLElement>(TITLE_BAR);
    const headers = Array.from(document.querySelectorAll<HTMLElement>(THREAD_ACTIONS))
      .map(actions => actions.closest('header'))
      .filter((header): header is HTMLElement => header !== null && visible(header));
    const uniqueHeaders = [...new Set(headers)];
    const header = uniqueHeaders[0];
    const row = header?.querySelector<HTMLElement>(`:scope > ${ROW}`);
    // Follow structural replacements, sizes and action changes, without polling.
    observe([...(bar ? [bar, ...Array.from(bar.children)] : []),
      ...(header && row ? [header, row, ...Array.from(row.children)] : [])]);
    const fallback = (reason: CompactHeaderStatus['reason'], width = 0) => { clear(); report(reason, width); };
    if (!enabled) return fallback('disabled');
    if (!bar || !visible(bar)) return fallback('no-title-bar');
    if (!media.matches) return fallback('compact-viewport');
    if (!header || !row) return fallback('no-thread');
    // BB also marks the single conversation pane, and can repeat its ID on
    // nested layout wrappers. Only distinct visible panes indicate a split.
    const visiblePaneIds = new Set(Array.from(document.querySelectorAll('[data-split-pane-id]'))
      .filter(visible).map(pane => pane.getAttribute('data-split-pane-id')));
    if (uniqueHeaders.length !== 1 || visiblePaneIds.size > 1) {
      return fallback('split-layout');
    }
    if (!supportsViewportPosition(header) || row.children.length !== 2) return fallback('unsupported-layout');

    const barRect = bar.getBoundingClientRect();
    const barCss = getComputedStyle(bar);
    // Reserve every direct child, including controls added by other plugins.
    const occupied = Array.from(bar.children).filter(visible).map(child => {
      // Shortcut hints can extend beyond their relatively positioned wrapper.
      const rects = [child, ...Array.from(child.querySelectorAll('*'))].filter(visible)
        .map(element => element.getBoundingClientRect());
      return { left: Math.min(...rects.map(rect => rect.left)), right: Math.max(...rects.map(rect => rect.right)) };
    })
      .sort((a, b) => a.left - b.left);
    let start = barRect.left + (parseFloat(barCss.paddingLeft) || 0);
    const end = barRect.right - (parseFloat(barCss.paddingRight) || 0);
    let gap = { left: start, width: 0 };
    for (const rect of [...occupied, { left: end, right: end }]) {
      const width = Math.min(rect.left, end) - start - 16;
      if (width > gap.width) gap = { left: start + 8, width };
      start = Math.max(start, rect.right);
    }
    const actions = row.lastElementChild as HTMLElement;
    const center = row.firstElementChild as HTMLElement;
    const centerContent = center.firstElementChild as HTMLElement | null;
    const title = centerContent?.firstElementChild as HTMLElement | null;
    if (!centerContent || !title) return fallback('unsupported-layout');
    // Keep all native actions, title metadata and the overflow menu. Only the
    // title may truncate; if the rest cannot fit, restore the original row.
    const metadata = Array.from(centerContent.children).slice(1)
      .reduce((width, element) => width + element.getBoundingClientRect().width + 8, 0);
    const required = Math.max(actions.getBoundingClientRect().width, actions.scrollWidth) + metadata + 176;
    if (gap.width < required || barRect.height < 28) return fallback('not-enough-space', gap.width);

    if (activeHeader !== header) { clear(); activeHeader = header; header.setAttribute(MARKER, ''); }
    const transformOwner = bar.querySelector<HTMLElement>('[class~="[transform:translateY(var(--bb-macos-chrome-control-y))]"]');
    const offset = transformOwner ? parseFloat(getComputedStyle(transformOwner).getPropertyValue('--bb-macos-chrome-control-y')) || 0 : 0;
    const z = (parseInt(barCss.zIndex, 10) || 44) + 1;
    const selector = `[${MARKER}]`;
    // Keep the existing React nodes and their ancestry: menus, rename, SDK slots
    // and delegated events stay owned by BB. Fixed positioning removes the old
    // row from normal flow, recovering its height without moving DOM nodes.
    const css = `
${selector} { position: fixed !important; inset: auto !important; left: ${gap.left}px !important; top: ${barRect.top}px !important; width: ${gap.width}px !important; height: ${barRect.height}px !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; background: transparent !important; z-index: ${z} !important; pointer-events: none !important; }
${selector} > ${ROW} { width: 100% !important; height: 100% !important; padding: 0 !important; gap: 8px !important; transform: translateY(${offset}px) !important; pointer-events: none !important; }
${selector} > ${ROW} > :first-child { overflow: hidden; min-width: 0; pointer-events: none !important; }
${selector} > ${ROW} > :first-child > :first-child, ${selector} > ${ROW} > :last-child { pointer-events: auto !important; -webkit-app-region: no-drag !important; app-region: no-drag !important; }
${selector} > ${ROW} > :first-child > :first-child { min-width: 0; max-width: 100%; }
${selector} > ${ROW} > :first-child > :first-child > :first-child { min-width: 0; flex-shrink: 1; }
`;
    if (style.textContent !== css) style.textContent = css;
    report('active', gap.width);
  };
  const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(update); };
  const unsubscribeAlignment = subscribeStatus(schedule);
  const mutation = new MutationObserver(records => {
    if (records.some(record => {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if (!target || target === style || target.closest('[data-thread-window]')) return false;
      if (target.closest(`${TITLE_BAR}, header:has(> ${ROW})`)) return true;
      if (record.type === 'attributes') return target.matches(TARGETS) || !!target.querySelector(TARGETS);
      return [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].some(node =>
        node instanceof Element && (node.matches(TARGETS) || node.querySelector(TARGETS)));
    })) schedule();
  });
  mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  media.addEventListener('change', schedule);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  refreshListeners.add(schedule);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    mutation.disconnect();
    resize.disconnect();
    media.removeEventListener('change', schedule);
    window.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    refreshListeners.delete(schedule);
    unsubscribeAlignment();
    signal.removeEventListener('abort', dispose);
    clear();
    style.remove();
  };
  signal.addEventListener('abort', dispose, { once: true });
  update();
  return dispose;
}
