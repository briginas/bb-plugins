# Source and adaptation

This project adapts
[briginas/webstorm-oldtale-dark-theme](https://github.com/briginas/webstorm-oldtale-dark-theme)
for BB.

The source revision is
[`e96caad130033e5ec6b72d8aa91c7a138bc34116`](https://github.com/briginas/webstorm-oldtale-dark-theme/tree/e96caad130033e5ec6b72d8aa91c7a138bc34116).
`upstream/oldtale-dark.json` preserves the original theme file.

`themes/pierre-dark.json` contains that file with the additional name `bb-oldtale-dark`.
The syntax rules, semantic colors, editor colors, and diff colors retain their original values.

`themes/oldtale.css` maps the palette to BB design tokens.
The dark terminal palette retains all 16 original ANSI colors.
The interface uses graphite surfaces and brighter blue accents for links and controls.
Secondary text colors provide contrast on these surfaces.
The light interface and terminal palettes are companion adaptations.
Light code colors use the bundled `github-light` theme.

The first Git commit preserves the standalone BB theme before plugin packaging.
The plugin retains its CSS and code theme without color changes.

See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the MIT license and source notices.

## Monorepository migration

The plugin moved from [`briginas/bb-plugin-oldtale-theme`](https://github.com/briginas/bb-plugin-oldtale-theme)
to `plugins/oldtale-theme/` in [`briginas/bb-plugins`](https://github.com/briginas/bb-plugins).
The monorepository preserves both commits through `a09bf0d`.
The monorepository starts this plugin at version `0.1.0`.
The plugin ID, palette IDs, CSS, code colors, and assets retain their original values.
