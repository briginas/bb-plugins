#!/bin/sh
set -eu

# Keep editable source in dev/; BB's palette list requires a real directory.
theme_source=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
theme_root=$(bb theme dir)
theme_target="$theme_root/oldtale"

if [ -e "$theme_target" ] || [ -L "$theme_target" ]; then
  if [ -L "$theme_target" ] || [ ! -f "$theme_target/.source" ] || [ "$(cat "$theme_target/.source")" != "$theme_source" ]; then
    printf 'Theme path belongs to another installation; nothing was replaced: %s\n' "$theme_target" >&2
    exit 1
  fi
fi

mkdir -p "$theme_target"
for asset in theme.css theme.json pierre-dark.json LICENSE THIRD_PARTY_NOTICES.md; do
  cp "$theme_source/$asset" "$theme_target/$asset"
done
printf '%s\n' "$theme_source" > "$theme_target/.source"
printf 'Registered Oldtale: %s\nActivate with: bb theme set oldtale\n' "$theme_target"
