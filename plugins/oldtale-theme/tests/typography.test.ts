import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "../src/server";
import { applyTypography, TEXT_AREAS, typographyProperties } from "../src/typography";

test("settings reject invalid sizes and font names through the host", async () => {
  const { bb, harness } = createFakePluginHost();
  try {
    plugin(bb);
    await harness.behavior.setSettings({ uiFont: "Arial" });
    assert.deepEqual(Object.keys(harness.registrations.settingsDescriptors), [
      ...TEXT_AREAS.flatMap((area) => [area.key, area.lineKey]),
      "uiFont", "codeFont", "serifFont", "terminalFont",
      "sidebarCards", "minimizeWhileRunning", "loader",
    ]);
    for (const level of TEXT_AREAS) {
      for (const value of [8, 16.5, level.max]) {
        await harness.behavior.setSettings({ [level.key]: value });
      }
      for (const value of [0, 7, level.max + 1, Infinity, NaN, "18"]) {
        await assert.rejects(harness.behavior.setSettings({ [level.key]: value }));
      }
      for (const value of [0.5, 1.65, 4]) {
        await harness.behavior.setSettings({ [level.lineKey]: value });
      }
      for (const value of [0, 0.49, 4.01, 24, Infinity, NaN, "1.5"]) {
        await assert.rejects(harness.behavior.setSettings({ [level.lineKey]: value }));
      }
    }
    for (const uiFont of ["", "   ", "bad\nfont", "x".repeat(121)]) {
      await assert.rejects(harness.behavior.setSettings({ uiFont }));
    }
  } finally {
    await harness.lifecycle.dispose();
  }
});

test("defaults remove the previous increase and keep zoom independent", () => {
  const dom = new JSDOM();
  const style = dom.window.document.documentElement.style;
  style.setProperty("zoom", "1.2");
  const cleanup = applyTypography(style, {});
  for (const level of TEXT_AREAS) {
    assert.equal(style.getPropertyValue(`--oldtale-size-${level.token}`), `${level.size}px`);
    assert.equal(style.getPropertyValue(`--oldtale-line-${level.token}`), `${level.lineHeight}em`);
  }
  assert.equal(style.getPropertyValue("zoom"), "1.2");
  cleanup();
  assert.equal(style.getPropertyValue("--oldtale-size-message"), "");
  assert.equal(style.getPropertyValue("zoom"), "1.2");
  dom.window.close();
});

test("changing preferences and disposing restores the previous styles", () => {
  const dom = new JSDOM();
  const style = dom.window.document.documentElement.style;
  style.setProperty("--oldtale-font-sans", '"Existing Font"', "important");
  style.setProperty("--font-mono", "Menlo");
  let cleanup = applyTypography(style, { messageFontSize: 20, uiFont: "Arial" });
  assert.equal(style.getPropertyValue("--oldtale-size-message"), "20px");
  assert.equal(style.getPropertyValue("--oldtale-line-message"), "1.625em");
  assert.equal(style.getPropertyValue("--oldtale-font-sans"), '"Arial"');
  cleanup();
  cleanup = applyTypography(style, { messageFontSize: 18, uiFont: "Menlo" });
  assert.equal(style.getPropertyValue("--oldtale-size-message"), "18px");
  cleanup();
  assert.equal(style.getPropertyValue("--oldtale-font-sans"), '"Existing Font"');
  assert.equal(style.getPropertyPriority("--oldtale-font-sans"), "important");
  assert.equal(style.getPropertyValue("--font-mono"), "Menlo");
  dom.window.close();
});

test("font names stay literal and untrusted values fall back to defaults", () => {
  const font = 'Font "; color: red; /*';
  const properties = typographyProperties({ uiFont: font, codeFont: "monospace", messageFontSize: "20", messageLineHeight: "2", codeFontSize: 64 });
  assert.equal(JSON.parse(properties["--oldtale-font-sans"]), font);
  assert.equal(properties["--oldtale-font-mono"], "monospace");
  assert.equal(properties["--oldtale-size-message"], "15px");
  assert.equal(properties["--oldtale-line-message"], "1.625em");
  assert.equal(properties["--oldtale-size-code"], "14px");
  assert.ok(Object.keys(properties).every((name) => name.startsWith("--oldtale-")));
});

test("area settings change only their own size or line-height multiplier", () => {
  const defaults = typographyProperties({});
  for (const level of TEXT_AREAS) {
    for (const [key, property, value] of [
      [level.key, `--oldtale-size-${level.token}`, "17px"],
      [level.lineKey, `--oldtale-line-${level.token}`, "1.75em"],
    ]) {
      const properties = typographyProperties({ [key]: key === level.key ? 17 : 1.75 });
      assert.deepEqual(properties, { ...defaults, [property]: value });
    }
  }
});

test("obsolete utility-tier settings no longer influence typography", () => {
  const oldValues = { textSize: 30, textSizeXs: 24, lineHeight: 3, lineHeightSm: 2 };
  assert.deepEqual(typographyProperties(oldValues), typographyProperties({}));
  const css = readFileSync(new URL("../themes/oldtale.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\bzoom\s*:|\btransform\s*:/);
  assert.doesNotMatch(css, /--oldtale-(?:text-scale|size-(?:base|xs|sm|lg|xl|2xs|2xl))/);
});
