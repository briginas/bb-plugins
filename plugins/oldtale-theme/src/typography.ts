export const DEFAULT_FONT = "CodeNewRoman Nerd Font";
// User-facing controls describe areas, never the host's utility size tiers.
export const TEXT_AREAS = [
  { key: "codeFontSize", lineKey: "codeLineHeight", token: "code", label: "Код", size: 14, lineHeight: 1.5, max: 18,
    description: "Код в сообщениях, просмотре файлов и diff. От 8 до 18 px: BB фиксирует высоту строк просмотра файлов и diff на 18 px." },
  { key: "sidebarFontSize", lineKey: "sidebarLineHeight", token: "sidebar", label: "Левая панель", size: 14, lineHeight: 1.5, max: 64,
    description: "Проекты, треды и пункты левой панели. Остальные области не меняются." },
  { key: "messageFontSize", lineKey: "messageLineHeight", token: "message", label: "Сообщения", size: 15, lineHeight: 1.625, max: 64,
    description: "Текст сообщений пользователя и ассистента. Размер кода задаётся отдельно." },
  { key: "composerFontSize", lineKey: "composerLineHeight", token: "composer", label: "Поле ввода", size: 15, lineHeight: 1.7, max: 64,
    description: "Текст в поле ввода сообщения, включая новый тред и редактирование сообщений." },
  { key: "uiFontSize", lineKey: "uiLineHeight", token: "ui", label: "Остальной интерфейс", size: 15, lineHeight: 1.5, max: 64,
    description: "Настройки, кнопки, меню и подписи вне областей с отдельными настройками." },
] as const;

export const fontKeys = ["uiFont", "codeFont", "serifFont", "terminalFont"] as const;

export function validFont(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 120
    && !/[\u0000-\u001f\u007f]/.test(value);
}

export function validTextSize(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 8 && value <= 64;
}

export function validLineHeight(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0.5 && value <= 4;
}

const genericFamilies = new Set(["serif", "sans-serif", "monospace", "system-ui", "cursive", "fantasy", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded"]);

function fontFamily(value: string): string {
  const family = value.trim();
  return genericFamilies.has(family) ? family : JSON.stringify(family);
}

export function typographyProperties(values: Record<string, unknown>): Record<string, string> {
  const properties: Record<string, string> = {};
  const tokens = { uiFont: "sans", codeFont: "mono", serifFont: "serif", terminalFont: "terminal" };
  for (const key of fontKeys) {
    const value = values[key];
    properties[`--oldtale-font-${tokens[key]}`] = fontFamily(validFont(value) ? value : DEFAULT_FONT);
  }
  for (const level of TEXT_AREAS) {
    const value = values[level.key];
    const size = validTextSize(value) && value <= level.max ? value : level.size;
    const lineValue = values[level.lineKey];
    const lineHeight = validLineHeight(lineValue) ? lineValue : level.lineHeight;
    properties[`--oldtale-size-${level.token}`] = `${size}px`;
    properties[`--oldtale-line-${level.token}`] = `${lineHeight}em`;
  }
  return properties;
}

// Only Oldtale's stylesheet consumes these namespaced properties.
export function applyTypography(style: CSSStyleDeclaration, values: Record<string, unknown>): () => void {
  const properties = typographyProperties(values);
  const previous = Object.keys(properties).map((name) => ({
    name, value: style.getPropertyValue(name), priority: style.getPropertyPriority(name),
  }));
  for (const [name, value] of Object.entries(properties)) style.setProperty(name, value);
  return () => {
    for (const { name, value, priority } of previous) {
      if (value) style.setProperty(name, value, priority);
      else style.removeProperty(name);
    }
  };
}
