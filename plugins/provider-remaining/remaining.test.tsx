// @vitest-environment jsdom
import { cleanup, fireEvent, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { ProviderUsageStatusContent } from "./app.js";
import { UsageSettingsContent } from "./settings.js";
import type { UsageMachine, UsageWindow } from "./usage-schema.js";

afterEach(cleanup);

function machines(window: UsageWindow): UsageMachine[] {
  return [{
    id: "source:remaining-test",
    displayName: "Test pool",
    status: "connected",
    error: null,
    providers: [{
      id: "account",
      providerId: "codex",
      accountLabel: "test@example.com",
      displayName: "Codex",
      logoUrl: null,
      icon: null,
      strings: { iconTint: null },
      signInHint: "Sign in.",
      expiredHint: "Sign in again.",
      usage: {
        status: "ok",
        accountEmail: "test@example.com",
        planLabel: null,
        windows: [window],
      },
    }],
  }];
}

function renderPanels(window: UsageWindow) {
  const data = machines(window);
  return [
    renderSlot({ component: ProviderUsageStatusContent }, {
      pluginId: "provider-remaining",
      dismiss: () => {},
      snapshot: { data: { machines: data }, error: null, isRefreshing: false },
      threadMachineId: null,
      refreshEnabled: false,
    }),
    renderSlot({ component: UsageSettingsContent }, {
      machines: data,
      selectedId: null,
      loading: false,
      error: false,
      onSelect: () => {},
      onRefresh: () => {},
    }),
  ].map((slot) => within(slot.container));
}

it.each([
  [0, 100, "100%", "bg-primary"],
  [42, 58, "58%", "bg-primary"],
  [79, 21, "21%", "bg-primary"],
  [80, 20, "20%", "bg-warning"],
  [94, 6, "6%", "bg-warning"],
  [95, 5, "5%", "bg-destructive"],
  [100, 0, "0%", "bg-destructive"],
  [120, 0, "0%", "bg-destructive"],
  [-10, 100, "100%", "bg-primary"],
  [99.5, 0.5, "1%", "bg-destructive"],
] as const)("renders both panels for source usage %s", (used, remaining, text, color) => {
  const window: UsageWindow = {
    label: "Weekly limit",
    usedPercent: used,
    resetsAt: null,
    cost: null,
  };
  const [sidebar, settings] = renderPanels(window);
  for (const panel of [sidebar, settings]) {
    const bar = panel.getByRole("progressbar", { name: "Weekly limit remaining" });
    expect(bar.getAttribute("aria-valuenow")).toBe(String(remaining));
    expect(bar.getAttribute("aria-valuetext")).toBe(`${text} remaining`);
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe(`${remaining}%`);
    expect(fill.classList.contains(color)).toBe(true);
  }
  expect(sidebar.getByText(text)).toBeTruthy();
  const button = sidebar.getByRole("button", {
    name: `Weekly limit: ${text} remaining. Reset time not reported`,
  });
  expect(button.title).toContain(`${text} remaining`);
  expect(settings.getByText(`${text} remaining`)).toBeTruthy();
  // Display conversion must leave the provider's input untouched.
  expect(window.usedPercent).toBe(used);
});

it("shows remaining percentages for cost-based quotas and retains spending details", () => {
  const [sidebar, settings] = renderPanels({
    label: "Monthly budget",
    usedPercent: 25,
    resetsAt: null,
    cost: { usedUsdCents: 2500, limitUsdCents: 10000 },
  });
  expect(sidebar.getByText("75%")).toBeTruthy();
  fireEvent.click(sidebar.getByRole("button", {
    name: "Monthly budget: 75% remaining. Reset time not reported",
  }));
  expect(sidebar.getByText(/\$25.00 \/ \$100 spent/)).toBeTruthy();
  expect(settings.getByText("75% remaining")).toBeTruthy();
  expect(settings.getByText(/\$25.00 \/ \$100 spent/)).toBeTruthy();
});
