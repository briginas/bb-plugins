// @vitest-environment jsdom
import { act, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadPluginApp, mountPluginContentScripts, renderSlot } from "@get-bb/plugin-sdk/testing/app";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("loads and refreshes the badge while closed, shares polling with the card, and disposes it", async () => {
  vi.useFakeTimers();
  let usedPercent = 82;
  const fetchMock = vi.fn(async (_url, init: RequestInit) => {
    const request = JSON.parse(String(init.body));
    return Response.json({ ok: true, result: { machines: [{
      id: "source:pool", displayName: "Pool", status: "connected", error: null,
      providers: [{
        id: "pool:codex", providerId: "codex", accountLabel: null, displayName: "Codex",
        logoUrl: null, icon: null, strings: { iconTint: null },
        signInHint: "Sign in.", expiredHint: "Sign in again.",
        usage: request.providerIds.length === 0 ? null : {
          status: "ok", accountEmail: null, planLabel: null,
          windows: [{ label: "Limit", usedPercent, resetsAt: null, cost: null }],
        },
      }],
    }] } });
  });
  vi.stubGlobal("fetch", fetchMock);
  const app = await loadPluginApp(() => import("./app"));
  const mounted = await mountPluginContentScripts(app, { pluginId: "provider-remaining" });
  const background = renderSlot(app.appOverlays[0]!, {}, { pluginId: "provider-remaining" });
  const icon = renderSlot(app.icons[0]!, {});
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(icon.getByText("18")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);

  const disclosure = app.experimentalSidebarFooterItems[0]!;
  if (disclosure.kind !== "disclosure") throw new Error("Missing disclosure");
  const card = renderSlot(disclosure, { dismiss() {} }, { pluginId: "provider-remaining" });
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  card.lifecycle.unmount();
  usedPercent = 97;
  await act(() => vi.advanceTimersByTimeAsync(2 * 60_000));
  expect(icon.getByText("3")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  document.dispatchEvent(new Event("visibilitychange"));
  await act(() => vi.advanceTimersByTimeAsync(2 * 60_000));
  expect(fetchMock).toHaveBeenCalledTimes(3);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  document.dispatchEvent(new Event("visibilitychange"));
  background.lifecycle.unmount();
  icon.lifecycle.unmount();
  await mounted.lifecycle.dispose();
  await act(() => vi.advanceTimersByTimeAsync(30 * 60_000));
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
