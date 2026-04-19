# ESPForge

Visual, browser-based configuration tool for [ESPHome](https://esphome.io/). Pick a board, add components, configure settings — get a ready-to-flash YAML file. No YAML knowledge required.

## Try it here [ESPForge](https://mo3he.github.io/ESPForge/)

![ESPForge Screenshot](docs/screenshot.png)

## Features

### Build
- **20+ boards** — ESP32, S2, S3, C3, C6, ESP8266, plus M5Stack, Sonoff, XIAO, LilyGO, and more
- **80+ components** — sensors, switches, lights, fans, covers, locks, climate, BLE, IR, media, displays, I/O expanders
- **10 starter templates** — Sensor Node, Smart Relay, LED Strip, BLE Gateway, Garage Door, Power Monitor, etc.
- **Guided onboarding** — template → board → settings → components

### Configure
- **Form-based editing** — every field has labels, defaults, and hints
- **Visual pin mapper** — color-coded board diagram with pin conflict detection
- **Automation builder** — triggers (boot, interval, button press, sensor threshold), conditions, and actions for switches, lights, fans, covers, locks, numbers
- **Full settings** — WiFi, static IP, MQTT, API encryption, OTA, logger levels, SNTP time, status LED

### Export
- **Live YAML preview** — syntax-highlighted, updates as you type
- **Validation** — catches missing WiFi, unassigned pins, empty fields, and conflicts before export
- **Secrets file** — auto-generates `secrets.yaml` for `!secret` references
- **Share via URL** — encode your project in a shareable link

### Quality of life
- Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)
- Save / Load projects as JSON
- Light / Dark theme
- Keyboard shortcuts (Ctrl+S save, Ctrl+E export)
- Responsive layout for tablets

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173/ESPForge/](http://localhost:5173/ESPForge/) in your browser.

## Build

```bash
npm run build
```

Static output is in `dist/`, ready to deploy anywhere.

## Deploy to GitHub Pages

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys on push to `main`:

1. **Settings → Pages** → set Source to **GitHub Actions**
2. Push to `main`

## How it works

ESPForge runs entirely in the browser. Your configuration is never sent to a server. The app builds a structured project in memory and serializes it to valid ESPHome YAML using [js-yaml](https://github.com/nodeca/js-yaml). Share links encode the project as Base64 in the URL hash.

## Tech Stack

- React 18 + TypeScript + Vite 6
- [js-yaml](https://github.com/nodeca/js-yaml)
- No backend — fully static, nothing stored server-side

## Contributing

Issues and PRs welcome. If you'd like to add a board, component, or template, the definitions live in `src/data/`.

## License

MIT
