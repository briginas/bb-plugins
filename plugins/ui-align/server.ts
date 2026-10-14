import { defineRpcContract, type BbPluginApi } from '@get-bb/plugin-sdk';
import { z } from 'zod';

const statusSchema = z.object({
  headerPresent: z.boolean(),
  nativeReservation: z.boolean(),
  enabled: z.boolean(),
  zoom: z.number().nullable(),
  controlCenterY: z.number().nullable(),
  targetCenterY: z.number(),
  controls: z.array(z.object({ label: z.string(), centerY: z.number() })).default([]),
});
export const rpcContract = defineRpcContract({
  report: { input: statusSchema, output: z.null() },
});

export default function plugin(bb: BbPluginApi) {
  let latest: (z.infer<typeof statusSchema> & { reportedAt: string }) | null = null;
  bb.rpc.register(rpcContract, {
    report: async input => { latest = { ...input, reportedAt: new Date().toISOString() }; return null; },
  });
  bb.cli.register({
    name: 'ui-align',
    summary: 'Показать состояние выравнивания в последнем окне BB',
    async run(argv) {
      if (argv.length !== 1 || argv[0] !== 'status') return { exitCode: 1, stdout: '', stderr: 'Usage: bb ui-align status\n' };
      return { exitCode: 0, stdout: JSON.stringify(latest ?? { awaitingFrontend: true }, null, 2) + '\n', stderr: '' };
    },
  });
  bb.settings.define({
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
