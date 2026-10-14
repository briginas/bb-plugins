import type { UsageProvider } from "./usage-schema.js";

export const ALL_PROVIDERS_TAB_ID = "all";

export function selectUsageTab(
  accounts: UsageProvider[],
  requestedId: string | null,
) {
  const available = accounts.filter(
    (account) => account.usage?.status !== "not_installed",
  );
  const providerIds = [...new Set(available.map((account) => account.providerId))];
  const tabIds = [
    ...(providerIds.length > 1 ? [ALL_PROVIDERS_TAB_ID] : []),
    ...providerIds,
  ];
  const tabId = tabIds.includes(requestedId ?? "")
    ? requestedId
    : (tabIds[0] ?? null);
  return {
    tabId,
    providerIds:
      tabId === ALL_PROVIDERS_TAB_ID
        ? providerIds
        : tabId === null ? [] : [tabId],
    accounts: available.filter(
      (account) => tabId === ALL_PROVIDERS_TAB_ID || account.providerId === tabId,
    ),
  };
}
