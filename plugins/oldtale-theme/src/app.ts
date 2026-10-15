import { useEffect } from "react";
import { definePluginApp, useSettings } from "@get-bb/plugin-sdk/app";
import { applyTypography } from "./typography";

function TypographySync() {
  const { values, isLoading } = useSettings();
  useEffect(() => {
    if (isLoading || !values) return;
    return applyTypography(document.documentElement.style, values);
  }, [values, isLoading]);
  return null;
}

export default definePluginApp((app) => {
  app.slots.experimental_appOverlay({ id: "typography-sync", component: TypographySync });
});
