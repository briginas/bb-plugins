import type { BbPluginApi } from "@get-bb/plugin-sdk";

// BB registers the palette from bb.themes in package.json.
export default function plugin(bb: BbPluginApi): void {
  bb.log.info("Oldtale theme loaded");
}
