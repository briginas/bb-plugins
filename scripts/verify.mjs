import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(new URL(path, new URL("../", import.meta.url)), "utf8");
const json = (path) => JSON.parse(read(path));
const pkg = json("package.json");
const theme = pkg.bb.themes[0];
const css = read(theme.css);
const upstream = json("upstream/oldtale-dark.json");
const { name, ...codeTheme } = json(theme.codeTheme.dark);

assert.ok(name, "The code theme needs a name for BB");
assert.deepEqual(codeTheme, upstream, "Code colors and syntax rules must retain their upstream values");

const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const declarations = (selector) => Object.fromEntries(
  blocks.filter(([, selectors]) => selectors.trim().split(/\s*,\s*/).includes(selector))
    .flatMap(([, , body]) => [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
      .map(([, key, value]) => [key, value.trim()])),
);
const dark = declarations(".dark");
const light = declarations(".light");
const ansiNames = ["Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White"];

for (let index = 0; index < 16; index++) {
  const upstreamKey = `terminal.ansi${index >= 8 ? "Bright" : ""}${ansiNames[index % 8]}`;
  assert.equal(dark[`--ansi-${index}`], upstream.colors[upstreamKey], `ANSI color ${index} changed`);
  for (const [mode, tokens] of [["light", light], ["dark", dark]]) {
    assert.match(tokens[`--ansi-${index}`] ?? "", /^#[\da-f]{6}$/i, `${mode}: missing ANSI color ${index}`);
    assert.match(tokens[`--ansi-bg-fg-${index}`] ?? "", /^#[\da-f]{6}$/i, `${mode}: missing ANSI foreground ${index}`);
  }
}

const metadata = json("dist/server.meta.json");
const pluginId = pkg.name.replace(/^bb-plugin-/, "");
assert.equal(metadata.pluginId, pluginId, "Build metadata has the wrong plugin ID");
assert.equal(metadata.pluginVersion, pkg.version, "Build metadata has the wrong version");
assert.equal(metadata.sdkVersion, pkg.devDependencies["@get-bb/plugin-sdk"], "Build metadata has the wrong SDK version");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const [pack] = JSON.parse(execFileSync(npm, ["pack", "--dry-run", "--ignore-scripts", "--json"], {
  cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
}));
const files = new Set(pack.files.map(({ path }) => path));
for (const path of [
  pkg.bb.server, pkg.bb.branding.icon, theme.css, theme.codeTheme.dark,
  "dist/server.js", "dist/server.meta.json", "LICENSE", "THIRD_PARTY_NOTICES.md", "PLUGIN_OVERVIEW.md",
]) {
  assert.ok(files.has(path.replace(/^\.\//, "")), `Package is missing ${path}`);
}

console.log("Verified: original code colors, 16 dark ANSI colors, both terminal modes, build identity, and packaged assets.");
