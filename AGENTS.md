# ESPForge — Agent Instructions

ESPForge is a browser-based visual configuration tool for [ESPHome](https://esphome.io/). Users pick a board, add components, and export a ready-to-flash YAML file. See [README.md](README.md) for the full feature list.

## Repository layout

```
espforge/          # App source (required by HA Supervisor)
  src/
    data/          # Static definitions (boards, components, templates)
    utils/         # YAML generation, import, and validation logic
    components/    # React UI components
    context/       # ProjectContext + reducer (all shared state)
    types/         # TypeScript type definitions
  config.yaml      # HA add-on manifest (contains the version number)
  CHANGELOG.md     # HA Supervisor reads this for "What's new" notifications
.github/workflows/ # deploy.yml (GitHub Pages) + docker.yml (Docker + auto-release)
repository.yaml    # Marks this repo as a valid HA app repository
```

## Build & dev commands

All commands run from `espforge/`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |

No test runner is configured. TypeScript (`strict: true`, `noUnusedLocals`, `noUnusedParameters`) is the sole static analysis tool.

The only build-time env var is `VITE_BASE_PATH` (defaults to `/ESPForge/` for GitHub Pages; Docker sets it to `./`).

## Key files

| File | Role |
|---|---|
| `espforge/src/data/boards.ts` | All board definitions (42 boards) |
| `espforge/src/data/components.ts` | All component definitions (99 components) |
| `espforge/src/data/templates.ts` | Starter templates (14 templates) |
| `espforge/src/types/index.ts` | All shared TypeScript types |
| `espforge/src/utils/yamlGenerator.ts` | Converts `Project` state to ESPHome YAML |
| `espforge/src/utils/validation.ts` | Validation warnings/errors shown in the UI |
| `espforge/src/utils/yamlImporter.ts` | Parses existing ESPHome YAML into `Project` state |
| `espforge/src/context/ProjectContext.tsx` | Global state — all UI reads/writes go through here |

## Adding a board

Add a `Board` object to `espforge/src/data/boards.ts`. Required fields: `id`, `name`, `platform` (`'esp32'` or `'esp8266'`), `variant` (e.g. `'esp32s3'`), `board` (PlatformIO board ID), `pins` array, `defaultI2C`. Optional: `hasBLE`, `hasPSRAM`, `defaultComponents`.

Boards are grouped into sections (ESP32 > ESP32-S2 > ESP32-S3 > LilyGO > ESP32-C3 > Seeed XIAO > ESP32-C6 > CYD > AZ-Delivery > M5Stack > LOLIN/Wemos > Sonoff > Heltec > ESP8266) -- insert new boards in the correct section.

## Adding a component

1. Add a `ComponentDefinition` to `espforge/src/data/components.ts` with `type`, `platform`, `domain`, `category`, `name`, `description`, `icon`, `pins`, `configFields`.
2. If it needs a top-level YAML block, add generation logic to `yamlGenerator.ts`.
3. Add validation rules to `validation.ts` if it has dependencies on other components.
4. Optionally add a template to `templates.ts`.
5. Update the component count in `README.md`.

Valid `ComponentCategory` values: `sensor`, `binary_sensor`, `switch`, `light`, `output`, `display`, `climate`, `media`, `bluetooth`, `ir`, `fan`, `cover`, `button`, `number`, `select`, `lock`, `text`, `misc`.

## Release process

See [espforge/CHANGELOG.md](espforge/CHANGELOG.md) for the version history. To cut a release:

1. Bump `version` in `espforge/config.yaml` and `espforge/package.json`.
2. Run `cd espforge && npm install --package-lock-only` to sync the lock file.
3. Add an entry to `espforge/CHANGELOG.md` (HA Supervisor shows this in-app).
4. Commit all four files and push to `main`.

The `docker.yml` workflow auto-creates a GitHub Release tagged `vx.y.z` and builds + pushes multi-arch Docker images to `ghcr.io/mo3he/espforge`. The `deploy.yml` workflow publishes to GitHub Pages.

## Notable conventions

- All app state lives in `ProjectContext` -- never manage feature state locally in a component unless it is purely ephemeral UI state (hover, open/closed).
- The YAML generator targets current ESPHome conventions (modern `esp32:` block style, not the legacy `esphome.platform` key).
- `ProjectSettings` has `_rawPlatformExtras` and `_rawLoggerExtras` passthrough fields, and `Project` has a top-level `passthroughYaml` field -- use these for blocks the generator does not handle natively rather than adding one-off generator logic.
- No ESLint or Prettier is configured -- rely on TypeScript strict mode.
- `platformFilter` and `variantFilter` on `ComponentDefinition` control which boards show a component in the palette.
