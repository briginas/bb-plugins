# Upstream provenance

The first commit imports the complete `plugins/provider-usage` directory from
[BB](https://github.com/get-bb/bb), without changing its files.

- Upstream commit: `a7d5dfcc8c27df1fea42847526ee62a338fe8052`
- Source: https://github.com/get-bb/bb/tree/a7d5dfcc8c27df1fea42847526ee62a338fe8052/plugins/provider-usage
- Imported on: 2026-10-14
- License: MIT; the upstream copyright notice is preserved in `LICENSE`.

Later commits prepare a standalone plugin and change quota displays to remaining
percentages. This project is maintained independently and is not an official BB plugin.

## Vendored UI

The standalone preparation commit also vendors these BB registry files from the
same upstream commit, under the same MIT license:

- `components/ui/button.tsx`
- `components/ui/coarse-pointer-sizing.ts`
- `components/ui/dropdown-menu.tsx`
- `components/ui/icon.tsx`
- `components/ui/menu-item-hover.tsx`
- `components/ui/motion.ts`
- `components/ui/option-display.tsx`
- `components/ui/overlay-trigger.ts`
- `lib/portal-scope.ts`
- `components/ui/responsive-overlay.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/tooltip.tsx`
- `components/ui/hooks/use-compact-viewport.tsx`
- `components/ui/hooks/use-media-query.ts`
- `components/ui/hooks/use-pointer-coarse.ts`
- `lib/utils.ts`
