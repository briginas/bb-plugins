import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "../src/server";
import { applyChatPreferences, chatPreferences, LOADERS, mountLoaderPhaseSync } from "../src/chat";
import { registerCoinsWorklet } from "../src/coins-worklet";

test("chat preferences validate untrusted settings and restore attributes", () => {
  assert.deepEqual(chatPreferences({}), { loader: "drive", minimize: true });
  assert.deepEqual(chatPreferences({ loader: "invalid", minimizeWhileRunning: "false" }), { loader: "drive", minimize: true });
  const dom = new JSDOM();
  const root = dom.window.document.documentElement;
  root.setAttribute("data-oldtale-loader", "bb");
  const cleanup = applyChatPreferences(root, { loader: "coins", minimizeWhileRunning: false });
  assert.equal(root.getAttribute("data-oldtale-loader"), "coins");
  assert.equal(root.getAttribute("data-oldtale-minimize"), "false");
  cleanup();
  assert.equal(root.getAttribute("data-oldtale-loader"), "bb");
  assert.equal(root.hasAttribute("data-oldtale-minimize"), false);
  dom.window.close();
});

test("the host exposes and validates the selected chat features", async () => {
  const { bb, harness } = createFakePluginHost();
  try {
    plugin(bb);
    for (const loader of LOADERS) await harness.behavior.setSettings({ loader });
    await harness.behavior.setSettings({ minimizeWhileRunning: false });
    await assert.rejects(harness.behavior.setSettings({ loader: "bad" }));
    await assert.rejects(harness.behavior.setSettings({ minimizeWhileRunning: "false" }));
  } finally {
    await harness.lifecycle.dispose();
  }
});

test("loader phase sync only touches Oldtale loops in the timeline and disposes", () => {
  const dom = new JSDOM('<div data-timeline-row-list><span id="target"></span></div><span id="outside"></span>');
  const doc = dom.window.document;
  Object.defineProperty(doc, "timeline", { value: { currentTime: 1234 } });
  const target = doc.getElementById("target")!;
  const make = (name: string, iterations = Infinity) => ({ animationName: name, currentTime: 0, effect: { target, getTiming: () => ({ iterations }) } });
  const loops = [make("oldtale-px-a"), make("native-spin"), make("oldtale-once", 1)];
  Object.defineProperty(target, "getAnimations", { value: () => loops });
  const cleanup = mountLoaderPhaseSync(doc);
  target.dispatchEvent(new dom.window.Event("animationstart", { bubbles: true }));
  assert.deepEqual(loops.map(a => a.currentTime), [1234, 0, 0]);
  cleanup();
  loops[0].currentTime = 0;
  target.dispatchEvent(new dom.window.Event("animationstart", { bubbles: true }));
  assert.equal(loops[0].currentTime, 0);
  dom.window.close();
});

test("coins safely fall back when Paint Worklets are unavailable or rejected", async () => {
  const key = Symbol.for("bb.oldtale.coins-registration");
  const globals = globalThis as unknown as Record<PropertyKey, unknown>;
  const originalCss = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  const previous = globals[key];
  try {
    delete globals[key];
    Object.defineProperty(globalThis, "CSS", { configurable: true, value: undefined });
    assert.equal(await registerCoinsWorklet(), false);
    Object.defineProperty(globalThis, "CSS", { configurable: true, value: { paintWorklet: { addModule: async () => { throw new Error("CSP"); } } } });
    assert.equal(await registerCoinsWorklet(), false);
  } finally {
    if (previous === undefined) delete globals[key]; else globals[key] = previous;
    if (originalCss) Object.defineProperty(globalThis, "CSS", originalCss); else delete globals.CSS;
  }
});
