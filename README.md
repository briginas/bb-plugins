# Provider remaining

A standalone BB IDE plugin that shows the remaining percentage of provider quota
in the sidebar and plugin settings.

This project derives from BB's built-in **Provider usage** plugin.
The first commit preserves its original source files.
Later commits add the standalone build and remaining-quota display.
See [UPSTREAM.md](UPSTREAM.md) for the source revision and [LICENSE](LICENSE) for the MIT license.
This project is independent of BB.

## Install

Requirements: BB 0.46.0 or later, Plugin SDK 0.6.37 or later, and npm on PATH.
At least one enabled source plugin must report provider usage.
Supported sources include provider plugins and Account Pooler.

Install from GitHub:

```sh
bb plugin install https://github.com/briginas/bb-plugin-provider-remaining
```

The plugin ID is `provider-remaining`.
The sidebar shortcut and installed-plugin entry use **Provider remaining**.
The plugin also adds its quota page under
**Settings → Installed plugins → Provider remaining**.

The built-in **Provider usage** plugin is separate.
Both plugins can remain enabled.
To hide its shortcut, right-click **Provider usage** in the sidebar footer and choose **Hide**.
**Settings → Appearance → Sidebar footer** also controls shortcut order and visibility.

## Quota display

Each quota window shows a percentage, a bar, and its reset time.
Both the sidebar and settings calculate the remaining percentage with:

```text
remaining = clamp(100 - usedPercent, 0, 100)
```

A source value of 82% used produces 18% remaining and an 18%-wide bar.
At 100% used, the display shows 0% remaining and an empty bar.
Values outside the source range produce a remaining percentage between 0% and 100%.
Displayed percentages round to whole numbers. Bar widths retain the fractional percentage.

Colors retain the original warning thresholds:

- Red: 5% or less remaining.
- Yellow: more than 5% and at most 20% remaining.
- Normal: more than 20% remaining.

Provider tabs retain warning dots for accounts outside the selected tab.
Their tooltips describe low remaining quota.
Screen-reader labels and progress bars also report the remaining percentage.
For monetary limits, the main percentage and bar show remaining quota.
The settings page also shows the amount spent and total budget.
In the sidebar, click the quota row to show these spending details.

Missing measurements, authentication failures, and plans without reported limits
keep their separate states.
The plugin does not treat unavailable quota as 100% remaining.
After a failed refresh, it retains the last measurement and shows a retry notice.

## Sources and accounts

The sidebar groups accounts by provider.
For multiple providers, the **All** tab shows every account with its provider icon.
Shared sources such as Account Pooler are selected by default.
A machine selection shows that machine's local accounts.
The plugin fetches quota measurements for the selected provider tabs or settings source.

Known provider account identities are deduplicated within each source.
Unknown identities remain separate, even if their email addresses match.

The source contract remains `provider-usage.v1`.
RPC measurements retain `usedPercent`. The conversion happens only in the display.
Source plugins do not need changes for this plugin.

List source plugins and inspect their contracts:

```sh
bb plugin rpc list --method provider-usage.v1.listResources --json
bb plugin rpc inspect <plugin-id> provider-usage.v1.listResources --json
```

The host commands `bb settings usage --json` and `bb.sdk.system.usageLimits()`
retain their original behavior. They do not aggregate shared pool accounts.

## Development

Clone the repository and install dependencies:

```sh
git clone https://github.com/briginas/bb-plugin-provider-remaining.git
cd bb-plugin-provider-remaining
npm ci
```

Run the checks and build:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The project pins Plugin SDK 0.6.37 and the BB build CLI 0.46.0.
The build emits backend and frontend artifacts under `dist/`.
Git installations use the installed BB CLI to build from source with production dependencies.

Backend tests use the SDK harness and `better-sqlite3`.
If npm blocks its install script and the native module cannot load,
approve that package's script with `npm approve-scripts better-sqlite3`.
Then run `npm rebuild better-sqlite3`.

For a local installation, run:

```sh
bb plugin install .
bb plugin dev
```

The tests cover source aggregation, refresh behavior, authentication states,
remaining percentages, clamping, empty bars, warning thresholds, and monetary limits.
