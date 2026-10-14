import { useEffect } from 'react';
import { definePluginApp, useSettings, useRpc } from '@get-bb/plugin-sdk/app';
import { mountAlignment, setPreferences, subscribeStatus } from './alignment';
import type { rpcContract } from './server';

function SettingsSync() {
  const { values, isLoading } = useSettings();
  const { call } = useRpc<typeof rpcContract>();
  useEffect(() => subscribeStatus(status => {
    void call('report', status).catch(error => console.warn('[UI Align] status report failed', error));
  }), [call]);
  useEffect(() => {
    if (isLoading || !values) return;
    setPreferences({
      enabled: values.enabled !== false,
      offsetY: typeof values.offsetY === 'number' ? values.offsetY : 0,
    });
  }, [values?.enabled, values?.offsetY, isLoading]);
  return null;
}

export default definePluginApp(app => {
  app.contentScripts.register({
    id: 'align-macos-titlebar',
    mount: ({ signal }) => mountAlignment(signal),
  });
  app.slots.experimental_appOverlay({ id: 'settings-sync', component: SettingsSync });
});
