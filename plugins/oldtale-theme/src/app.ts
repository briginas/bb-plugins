import { useEffect } from "react";
import { definePluginApp, useSettings } from "@get-bb/plugin-sdk/app";
import { applyTypography } from "./typography";
import { applyChatPreferences, chatPreferences, mountLoaderPhaseSync } from "./chat";
import { registerCoinsWorklet } from "./coins-worklet";

function TypographySync() {
  const { values, isLoading } = useSettings();
  useEffect(() => {
    if (isLoading || !values) return;
    return applyTypography(document.documentElement.style, values);
  }, [values, isLoading]);
  return null;
}

function ChatSync() {
  const { values, isLoading } = useSettings();
  const { loader, minimize } = chatPreferences(values ?? {});
  useEffect(() => {
    if (isLoading) return;
    return applyChatPreferences(document.documentElement, { loader, minimizeWhileRunning: minimize });
  }, [isLoading, loader, minimize]);
  useEffect(() => mountLoaderPhaseSync(document), []);
  useEffect(() => {
    if (isLoading || loader !== "coins") return;
    let current = true;
    registerCoinsWorklet().then((ready) => {
      if (current && ready) document.documentElement.setAttribute("data-oldtale-coins-ready", "");
    });
    return () => {
      current = false;
      document.documentElement.removeAttribute("data-oldtale-coins-ready");
    };
  }, [isLoading, loader]);
  return null;
}

export default definePluginApp((app) => {
  app.slots.experimental_appOverlay({ id: "typography-sync", component: TypographySync });
  app.slots.experimental_appOverlay({ id: "chat-sync", component: ChatSync });
});
