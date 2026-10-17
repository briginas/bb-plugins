import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { DEFAULT_FONT, TEXT_AREAS, validFont, validTextSize, validLineHeight } from "./typography";
import { LOADERS } from "./chat";

export default function plugin(bb: BbPluginApi): void {
  const fontSchema = z.string().refine(validFont, "Введите название семейства шрифта (1–120 символов, без переносов строк).");
  const fontDescription = "Название одного установленного семейства, например CodeNewRoman Nerd Font, Menlo или Arial. Применяется сразу, когда выбрана тема Oldtale.";
  const lineSchema = z.number().refine(validLineHeight, "Межстрочный интервал должен быть от 0.5 до 4 em.");
  const sizeSettings = Object.fromEntries(TEXT_AREAS.flatMap((level) => [
    [level.key, {
      type: "number" as const,
      label: `${level.label}: размер шрифта (px)`,
      description: `По умолчанию ${level.size} px. ${level.description}`,
      default: level.size,
      experimental_schema: z.number().refine((value) => validTextSize(value) && value <= level.max, `Размер должен быть от 8 до ${level.max} px.`),
    }],
    [level.lineKey, {
      type: "number" as const,
      label: `${level.label}: межстрочный интервал (em)`,
      description: `По умолчанию ${level.lineHeight} em. От 0.5 до 4 em. Высота строки относительно размера шрифта этой области.${level.token === "code" ? " Для кода в сообщениях; в просмотре файлов и diff BB фиксирует высоту строки на 18 px." : ""}`,
      default: level.lineHeight,
      experimental_schema: lineSchema,
    }],
  ]));
  bb.settings.define({
    ...sizeSettings,
    uiFont: { type: "string", label: "Шрифт интерфейса", description: fontDescription, default: DEFAULT_FONT, experimental_schema: fontSchema },
    codeFont: { type: "string", label: "Шрифт кода", description: fontDescription, default: DEFAULT_FONT, experimental_schema: fontSchema },
    serifFont: { type: "string", label: "Шрифт для текста с засечками", description: fontDescription, default: DEFAULT_FONT, experimental_schema: fontSchema },
    terminalFont: { type: "string", label: "Шрифт терминала", description: fontDescription, default: DEFAULT_FONT, experimental_schema: fontSchema },
    minimizeWhileRunning: {
      type: "boolean",
      label: "Сворачивать пустой ввод во время ответа",
      description: "Поле становится однострочным во время генерации. Набор текста или голосовой ввод возвращает полную высоту.",
      default: true,
    },
    loader: {
      type: "select",
      label: "Индикатор ожидания",
      description: "drive — пиксельная сетка; dots — точки; orbit — орбита; coins — монеты; bb — стандартный индикатор. Если монеты недоступны, используется сетка.",
      options: [...LOADERS],
      default: "drive",
    },
  });
  bb.log.info("Oldtale theme loaded");
}
