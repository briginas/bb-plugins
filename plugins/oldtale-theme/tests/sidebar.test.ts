import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "../src/server";
import { mountSidebarCards, sidebarCardsEnabled, threadAge } from "../src/sidebar";

const rowMarkup = (id: string) => `<div data-sidebar-rename-row role="button"><span><a data-sidebar-thread-id="${id}" href="/threads/${id}"></a><span><span data-sidebar-thread-provider="codex"></span><span class="bb-thread-title">Title</span></span></span><span data-sidebar-thread-trailing><button aria-label="Thread actions"></button></span></div>`;
const thread = (id: string, branchName: string | null = "feat/sidebar") => ({
  id, updatedAt: Date.now() - 120_000,
  environment: { id: "env", name: "Workspace", branchName, path: "/project", isWorktree: true, providerId: null, workspaceDisplayKind: null },
});
const tick = (dom: JSDOM) => new Promise<void>((resolve) => dom.window.requestAnimationFrame(() => resolve()));

test("sidebar cards default on; the host validates the toggle", async () => {
  assert.equal(sidebarCardsEnabled({}), true);
  assert.equal(sidebarCardsEnabled({ sidebarCards: "false" }), true);
  assert.equal(sidebarCardsEnabled({ sidebarCards: false }), false);
  const { bb, harness } = createFakePluginHost();
  try {
    plugin(bb);
    await harness.behavior.setSettings({ sidebarCards: false });
    await harness.behavior.setSettings({ sidebarCards: true });
    await assert.rejects(harness.behavior.setSettings({ sidebarCards: "false" }));
  } finally { await harness.lifecycle.dispose(); }
});

test("relative age handles minute, hour, day boundaries and clock skew", () => {
  const now = 200_000_000;
  for (const [elapsed, expected] of [[-1000, "<1m"], [59_999, "<1m"], [60_000, "1m"], [3_600_000, "1h"], [86_400_000, "1d"]] as const) {
    assert.equal(threadAge(now - elapsed, now), expected);
  }
  assert.equal(threadAge(NaN, now), "");
});

test("decoration follows live row reuse and disposes without changing host controls", async () => {
  const dom = new JSDOM(`<aside data-sidebar="sidebar">${rowMarkup("a")}</aside><main>${rowMarkup("b")}</main>`, { pretendToBeVisual: true });
  const doc = dom.window.document;
  const row = doc.querySelector<HTMLElement>("aside [data-sidebar-rename-row]")!;
  const original = row.outerHTML;
  const link = row.querySelector("a")!;
  const button = row.querySelector("button")!;
  let clicks = 0;
  button.addEventListener("click", () => clicks++);
  const cards = mountSidebarCards(doc);
  try {
    cards.update([thread("a"), thread("b", "fix/other")]);
    assert.equal(row.querySelector("[data-oldtale-sidebar-branch]")?.textContent, "feat/sidebar");
    assert.equal(row.querySelector("time")?.textContent, "2m");
    assert.equal(row.querySelector("time")?.style.display, "none", "additions stay hidden without Oldtale CSS");
    assert.equal(doc.querySelector("main [data-oldtale-sidebar-row]"), null);
    assert.equal(row.querySelector("a"), link);
    button.click();
    assert.equal(clicks, 1);

    // Virtualized rows may keep their DOM and switch thread ids.
    link.setAttribute("data-sidebar-thread-id", "b");
    await tick(dom);
    assert.equal(row.querySelector("[data-oldtale-sidebar-branch]")?.textContent, "fix/other");
    cards.update([thread("b", '<img src=x onerror="alert(1)">')]);
    assert.equal(row.querySelector("[data-oldtale-sidebar-branch] img"), null);
    assert.match(row.querySelector("[data-oldtale-sidebar-branch]")!.textContent!, /<img/);

    // A freshly expanded section is decorated without a new SDK update.
    doc.querySelector("aside")!.insertAdjacentHTML("beforeend", rowMarkup("b"));
    await tick(dom);
    assert.equal(doc.querySelectorAll("[data-oldtale-sidebar-row]").length, 2);
    cards.update([thread("b", null)]);
    assert.equal(row.querySelector("[data-oldtale-sidebar-branch]")?.textContent, "");
    row.querySelector(".bb-thread-title")!.parentElement!.replaceChildren(doc.createElement("span"));
    await tick(dom);
    assert.equal(row.hasAttribute("data-oldtale-sidebar-row"), false, "unknown markup falls back to native");
  } finally {
    cards.dispose();
    assert.equal(doc.querySelector("[data-oldtale-sidebar-time]"), null);
    assert.equal(doc.documentElement.hasAttribute("data-oldtale-sidebar-cards"), false);
    dom.window.close();
  }

  const fresh = new JSDOM(`<aside data-sidebar="sidebar">${original}</aside>`, { pretendToBeVisual: true });
  const clean = fresh.window.document.querySelector("[data-sidebar-rename-row]")!;
  const before = clean.outerHTML;
  const mounted = mountSidebarCards(fresh.window.document);
  mounted.update([thread("a")]);
  mounted.dispose();
  assert.equal(clean.outerHTML, before);
  clean.querySelector("a")!.setAttribute("data-sidebar-thread-id", "b");
  await tick(fresh);
  assert.equal(clean.querySelector("time"), null, "disposed observer does not redecorate");
  fresh.window.close();
});
