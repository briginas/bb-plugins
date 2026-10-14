# BB plugins

Personal plugins for BB IDE.
Each plugin has its own directory, package, dependencies, and version under `plugins/`.
The collection manifest at [`.bb/plugins.json`](.bb/plugins.json) lists the plugin names and paths.

## Plugins

- [Provider remaining](plugins/provider-remaining/README.md) (`provider-remaining`): shows the remaining provider quota in the sidebar and plugin settings.
- [Oldtale Theme](plugins/oldtale-theme/README.md) (`oldtale-theme`): adds Oldtale colors for the interface, terminal, and code in dark and light modes.

## Install

From this repository directory, install plugins by name:

```sh
bb plugin install path:. --plugin provider-remaining
bb plugin install path:. --plugin oldtale-theme
```

After this repository is published on GitHub, install from the main branch:

```sh
bb plugin install git:https://github.com/briginas/bb-plugins.git@main --plugin provider-remaining
bb plugin install git:https://github.com/briginas/bb-plugins.git@main --plugin oldtale-theme
```

Each plugin keeps its existing package name and plugin ID.
The collection manifest selects the plugin directory.

## Development

Run development commands from each plugin's directory.
Each plugin's README lists its checks.
For `provider-remaining`:

```sh
cd plugins/provider-remaining
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Each plugin keeps its own `package-lock.json`.
The repository has no shared dependency installation or shared release version.
The build writes artifacts to the plugin's `dist/` directory.

For `oldtale-theme`:

```sh
cd plugins/oldtale-theme
npm ci
npm run check
```

The commands start from the repository root.
GitHub Actions runs the Oldtale checks from its plugin directory.

## Add a plugin

Create the plugin under `plugins/<name>/` with its own `package.json`, code, README, and license.
Add an entry to `.bb/plugins.json` with the plugin name and `"source": "./plugins/<name>"`.
Add a link to its README in the plugin list.

## Release a plugin

Each plugin uses tags in the form `<name>/vX.Y.Z`.
A release changes only that plugin's version and lockfile.
For Oldtale version `0.1.0`, the tag is `oldtale-theme/v0.1.0`.

Before a release, run all checks in the plugin's README.
Make sure that the package version matches the release tag.
Commit the release changes.
Then create and push the tag for that plugin.

For a `provider-remaining` release at version `0.1.0`:

```sh
git tag -a provider-remaining/v0.1.0 -m "Release provider-remaining 0.1.0"
git push origin main
git push origin provider-remaining/v0.1.0
```

After the release tag is published, install with that plugin's tag prefix:

```sh
bb plugin install 'git:https://github.com/briginas/bb-plugins.git@^0.1.0' --plugin provider-remaining --tag-prefix provider-remaining/
```

## Migration and licenses

The repository preserves the Git history from [`briginas/bb-plugin-provider-remaining`](https://github.com/briginas/bb-plugin-provider-remaining).
The migration moves that plugin into `plugins/provider-remaining/` at version `0.1.0`.
Its [upstream provenance](plugins/provider-remaining/UPSTREAM.md) records the original BB source.

The repository also preserves the Git history from [`briginas/bb-plugin-oldtale-theme`](https://github.com/briginas/bb-plugin-oldtale-theme).
The migration adds that plugin under `plugins/oldtale-theme/` and sets its version to `0.1.0`.
Its [upstream provenance](plugins/oldtale-theme/UPSTREAM.md) records the source palette and migration.

Each plugin keeps its license in its own directory.
