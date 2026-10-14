export type Preferences = { enabled: boolean; offsetY: number };

let preferences: Preferences = { enabled: true, offsetY: 0 };
const listeners = new Set<() => void>();
export type AlignmentStatus = {
  headerPresent: boolean;
  nativeReservation: boolean;
  enabled: boolean;
  zoom: number | null;
  controlCenterY: number | null;
  targetCenterY: number;
  controls: { label: string; centerY: number }[];
};
let latestStatus: AlignmentStatus | null = null;
const statusListeners = new Set<(status: AlignmentStatus) => void>();
export function subscribeStatus(listener: (status: AlignmentStatus) => void): () => void {
  statusListeners.add(listener);
  if (latestStatus) listener(latestStatus);
  return () => { statusListeners.delete(listener); };
}

export function setPreferences(next: Preferences): void {
  preferences = {
    enabled: next.enabled,
    offsetY: Number.isFinite(next.offsetY) ? Math.max(-10, Math.min(10, next.offsetY)) : 0,
  };
  for (const listener of listeners) listener();
}

const HEADER = '[data-testid="app-window-title-bar"]';
// BB 0.46: native traffic lights start at y=18; their 14px diameter puts
// their centre at y=25 in macOS points, independent of Electron page zoom.
const NATIVE_CENTER_Y = 25;
// This class reserves room for macOS traffic lights. BB removes it in full
// screen and never adds it to a browser, Windows or Linux title bar.
const NATIVE_RESERVATION = 'pl-[84px]';
// Host transforms can live on a group (history/right panel) or on the
// nested button itself (sidebar). Target the transform owners in both cases.
const TRANSFORM_OWNER = '[class~="[transform:translateY(var(--bb-macos-chrome-control-y))]"]';

export function mountAlignment(signal: AbortSignal): () => void {
  if (signal.aborted) return () => {};
  const style = document.createElement('style');
  style.dataset.bbUiAlign = 'true';
  document.head.append(style);
  let header: HTMLElement | null = null;
  let frame = 0;
  let disposed = false;

  const resize = new ResizeObserver(() => schedule());
  const update = () => {
    frame = 0;
    if (disposed) return;
    const next = document.querySelector<HTMLElement>(HEADER);
    if (next !== header) {
      if (header) resize.unobserve(header);
      header = next;
      if (header) resize.observe(header);
    }
    let css = '';
    if (preferences.enabled && header?.classList.contains(NATIVE_RESERVATION)) {
      // BB's frameless window has no horizontal native border: outerWidth is
      // measured in macOS points, innerWidth in zoomed CSS pixels. Unlike DPR,
      // this ratio also works across Retina/non-Retina display changes.
      const zoom = window.outerWidth / window.innerWidth;
      if (Number.isFinite(zoom) && zoom >= 0.5 && zoom <= 3) {
        const rect = header.getBoundingClientRect();
        if (rect.height > 0) {
          const y = (NATIVE_CENTER_Y + preferences.offsetY) / zoom - rect.top - rect.height / 2;
          css = `${HEADER}.pl-\\[84px\\] ${TRANSFORM_OWNER} { --bb-macos-chrome-control-y: ${y.toFixed(4)}px !important; }`;
        }
      }
    }
    if (style.textContent !== css) style.textContent = css;
    const zoom = window.outerWidth / window.innerWidth;
    const control = header?.querySelector('button')?.getBoundingClientRect();
    latestStatus = {
      headerPresent: header !== null,
      nativeReservation: header?.classList.contains(NATIVE_RESERVATION) ?? false,
      enabled: preferences.enabled,
      zoom: Number.isFinite(zoom) ? zoom : null,
      controlCenterY: control && Number.isFinite(zoom) ? (control.top + control.height / 2) * zoom : null,
      targetCenterY: NATIVE_CENTER_Y + preferences.offsetY,
      controls: header && Number.isFinite(zoom) ? Array.from(header.querySelectorAll('button')).map(button => {
        const rect = button.getBoundingClientRect();
        return { label: button.getAttribute('aria-label') ?? button.getAttribute('data-testid') ?? button.textContent?.trim() ?? 'button', centerY: (rect.top + rect.height / 2) * zoom };
      }) : [],
    };
    for (const listener of statusListeners) listener(latestStatus);
  };
  const schedule = () => {
    if (!disposed && !frame) frame = requestAnimationFrame(update);
  };
  const mutation = new MutationObserver((records) => {
    // React can replace the header across shell/layout changes. Ignore chat
    // streaming and unrelated DOM changes rather than polling navigation.
    if (records.some(record =>
      record.target === header ||
      [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].some(node =>
        node instanceof Element && (node.matches(HEADER) || node.querySelector(HEADER)),
      ),
    )) schedule();
  });
  mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  listeners.add(schedule);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    mutation.disconnect();
    resize.disconnect();
    window.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    listeners.delete(schedule);
    signal.removeEventListener('abort', dispose);
    style.remove();
  };
  signal.addEventListener('abort', dispose, { once: true });
  update();
  return dispose;
}
