## Palette

Use Oldtale across the BB interface, terminal, diffs, and file previews.
Dark mode combines graphite surfaces with blue accents and muted syntax colors.
Light mode provides a companion interface and terminal palette with GitHub Light code colors.

The dark terminal palette and syntax rules come from
[WebStorm OldTale Dark](https://github.com/briginas/webstorm-oldtale-dark-theme).

## Select the theme

Installation adds **Oldtale** to Settings → Appearance.
Select the palette there, or run `bb theme set plugin:oldtale-theme:oldtale`.
Choose light or dark mode separately in Appearance.

Installation does not change your active palette.

## Fonts

Open this plugin's **Settings** to change font sizes by area:
code, left sidebar, messages, composer, and the rest of the interface.
Each area has a size in px and a line height in em. Changing one area does not change the others.
The four font-family fields control the interface, code, serif text, and terminal.
Enter an installed family name. Font files are not bundled or downloaded.

Code sizes accept 8–18 px; the other areas accept 8–64 px.
BB fixes file-viewer and diff row heights at 18 px, so the code line-height field applies only to code in messages.

The default family is CodeNewRoman Nerd Font, with a monospace fallback.
Changes apply immediately while Oldtale is active and persist across reloads.
Window zoom and the canvas terminal size stay independent of these settings.

## Requirements

BB 0.46.0 or later, Plugin SDK 0.6.37 or a compatible 0.6.x version, and npm on PATH for Git installation.
The theme needs no external account, service, or font download.
