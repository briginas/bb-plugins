import { defineRpcContract, type BbPluginApi } from '@get-bb/plugin-sdk';
import { z } from 'zod';
import type { CompactHeaderStatus } from './compact-header';

const statusSchema = z.object({
  headerPresent: z.boolean(),
  nativeReservation: z.boolean(),
  enabled: z.boolean(),
  zoom: z.number().nullable(),
  controlCenterY: z.number().nullable(),
  targetCenterY: z.number(),
  controls: z.array(z.object({ label: z.string(), centerY: z.number() })).default([]),
});
const compactHeaderStatusSchema = z.object({
  enabled: z.boolean(),
  active: z.boolean(),
  reason: z.enum(['disabled', 'no-title-bar', 'no-thread', 'split-layout', 'compact-viewport', 'unsupported-layout', 'not-enough-space', 'active']),
  availableWidth: z.number(),
});
export const rpcContract = defineRpcContract({
  report: { input: statusSchema, output: z.null() },
  reportCompactHeader: { input: compactHeaderStatusSchema, output: z.null() },
});

export default function plugin(bb: BbPluginApi) {
  let latest: (z.infer<typeof statusSchema> & { reportedAt: string }) | null = null;
  let compactHeader: CompactHeaderStatus | null = null;
  bb.rpc.register(rpcContract, {
    report: async input => { latest = { ...input, reportedAt: new Date().toISOString() }; return null; },
    reportCompactHeader: async input => { compactHeader = input; return null; },
  });
  bb.cli.register({
    name: 'ui-align',
    summary: 'Показать состояние выравнивания в последнем окне BB',
    async run(argv) {
      if (argv.length !== 1 || argv[0] !== 'status') return { exitCode: 1, stdout: '', stderr: 'Usage: bb ui-align status\n' };
      return { exitCode: 0, stdout: JSON.stringify({ ...(latest ?? { awaitingFrontend: true }), compactHeader }, null, 2) + '\n', stderr: '' };
    },
  });
  bb.settings.define({
    compactHeader: {
      type: 'boolean',
      label: 'Компактная шапка беседы',
      description: 'Показывать заголовок и все его действия в свободном месте верхней панели. При нехватке места и в разделённом экране возвращать обычную шапку. По умолчанию выключено.',
      default: false,
    },
    enabled: {
      type: 'boolean',
      label: 'Выровнять кнопки верхней панели',
      description: 'Учитывать масштаб интерфейса при выравнивании с кнопками окна macOS.',
      default: true,
    },
    offsetY: {
      type: 'number',
      label: 'Точная поправка по вертикали',
      description: 'В пунктах macOS: положительное значение сдвигает кнопки вниз. Диапазон −10…10, по умолчанию 0. Изменения применяются сразу.',
      default: 0,
      experimental_schema: z.number().min(-10).max(10),
    },
  });
  bb.log.info('UI Align loaded; macOS title-bar alignment is active in desktop windows.');
}
