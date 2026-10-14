// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { ProviderRemainingIcon, updateFooterBadge } from "./footer-badge.js";
import { selectUsageTab } from "./usage-selection.js";
import type { UsageProvider } from "./usage-schema.js";

afterEach(cleanup);

function account(providerId: string, values: number[]): UsageProvider {
  return {
    id: `${providerId}:${values.join(",")}`,
    providerId,
    accountLabel: null,
    displayName: providerId,
    logoUrl: null,
    icon: null,
    strings: { iconTint: null },
    signInHint: "Sign in.",
    expiredHint: "Sign in again.",
    usage: {
      status: "ok",
      accountEmail: null,
      planLabel: null,
      windows: values.map((usedPercent) => ({
        label: "Limit", usedPercent, resetsAt: null, cost: null,
      })),
    },
  };
}

it("uses the lowest remaining window across only the selected provider's accounts", () => {
  const accounts = [account("codex", [37, 82]), account("codex", [94]), account("claude", [99])];
  const selected = selectUsageTab(accounts, "codex");
  updateFooterBadge(selected.accounts, false);
  const icon = renderSlot({ component: ProviderRemainingIcon }, { className: "size-4" });
  expect(icon.getByText("6")).toBeTruthy();
  expect(icon.getByText("6").className).toContain("text-warning-text");
  expect(selectUsageTab(accounts, "missing").providerIds).toEqual(["codex", "claude"]);
  expect(selectUsageTab(accounts, "all").accounts).toHaveLength(3);
});

it.each([
  [-10, "100", "text-sidebar-foreground"],
  [120, "0", "text-destructive"],
  [79.9, "20", "text-sidebar-foreground"],
  [80, "20", "text-warning-text"],
  [95, "5", "text-destructive"],
])("clamps, rounds and colors %s percent used", (used, text, color) => {
  updateFooterBadge([account("codex", [used])], false);
  const icon = renderSlot({ component: ProviderRemainingIcon }, {});
  expect(icon.getByText(text).className).toContain(color);
});

it.each(["missing", "unauthenticated", "expired", "error", "no-limits"])(
  "shows unavailable quota for %s rather than inventing a percentage",
  (status) => {
    const value = account("codex", []);
    if (status === "missing") value.usage = null;
    if (status === "unauthenticated" || status === "expired") value.usage = { status };
    if (status === "error") value.usage = { status, message: "Unavailable" };
    updateFooterBadge([value], false);
    const icon = renderSlot({ component: ProviderRemainingIcon }, {});
    expect(icon.getByText("—")).toBeTruthy();
    expect(icon.queryByText("100")).toBeNull();
  },
);

it("marks a retained measurement as stale", () => {
  updateFooterBadge([account("codex", [82])], true);
  const icon = renderSlot({ component: ProviderRemainingIcon }, {});
  const badge = icon.getByText("18");
  expect(badge.dataset.stale).toBe("true");
  expect(badge.className).toContain("decoration-dotted");
  expect(badge.title).toContain("last update");
});
