# Copilot Instructions for Salaty

Salaty is an **Electron.js** desktop app (Islamic prayer times + Quran/Athkar/Qibla/Ramadan/Tasbih suite). Main process + multi-page renderer, no frontend framework, no test suite.

## Commands

```bash
npm install
npm start                # run the app
npm run dev              # run with --enable-logging (opens DevTools, enables dev-only UI e.g. settings "Test Popups" section)
npm run lint             # eslint src/  (flat config: eslint.config.js)
npx eslint src/renderer/js/foo.js   # lint a single file
node --check src/renderer/js/foo.js # quick syntax check of a single file (require('electron') fails outside Electron, so this is the fastest sanity check for a renderer/main file — full require()-based execution needs `npm start`)
npm run format            # prettier --write "src/**/*.{js,html,css}"
npm run build             # electron-builder (current platform)
npm run build:linux       # electron-builder --linux
npm run dist              # electron-builder --publish=never
```

There is **no automated test suite** (no `test` script/framework). CI (`.github/workflows/ci.yml`) only runs `npm run lint --if-present` (non-blocking) and `npm run build` across ubuntu/windows/macos. Validate changes by running the app (`npm start`/`npm run dev`) and/or `node --check` on touched files.

## Architecture

- **Main process** (`src/main/`): `main.js` creates the frameless, transparent `mainWindow`, the system tray, and the auto-updater; `ipc-handlers.js` owns almost all IPC handlers, the persisted `settingsData` object, and creation of secondary `BrowserWindow`s; `player-manager.js` owns the hidden mini-player window.
- **Renderer** (`src/renderer/`): one HTML file per feature under `pages/` (`index.html`, `settings.html`, `quran.html`, `athkar.html`, `tasbih.html`, `qibla.html`, `ramadan.html`, `asma.html`, `prayer-tracker.html`, `radio.html`, `livestreams.html`, `hijri-calendar.html`, `features.html`, popup pages, etc.). Every normal page loads `<script type="module" src="../js/renderer.js">`.
- **Single entry-point routing**: `renderer.js`'s `initializeApp()` fetches settings via `ipcRenderer.invoke('get-settings')`, applies language/theme, then branches on `window.location.pathname` (`if (pagePath.includes('quran.html')) ...`) to call that page's `init*Page()` from its own module (`quranUI.js`, `athkarUI.js`, `tasbihUI.js`, `settings.js`, etc.). **New pages must be registered here** with a matching `pathPath.includes('yourpage.html')` branch, and typically call `setupScreenSizeForPage('your-container-class')` first.
- **Multi-window model**: besides `mainWindow`, there are independent `BrowserWindow`s for the mini-player (`player-manager.js`), the floating prayer widget (`ipc-handlers.js` → `createPrayerWidget()`), and themed notification popups (`showThemedPopup()` in `ipc-handlers.js`, type `'athkar'` or `'adhan'`). Popup pages (`athkar-popup.html`) load their script directly as a classic (non-module) `<script>` and talk to main via `ipcRenderer`/`ipcMain.on` — they do **not** go through `renderer.js`. Popups measure real content height client-side (double `requestAnimationFrame` + `document.body.scrollHeight`) and send `show-themed-popup-ready` before being resized/shown, to avoid flashing an incorrectly-sized window. Any settings/theme change that must reach every open window needs to be broadcast explicitly to each window reference (see the `theme-changed` broadcast in `ipc-handlers.js`'s `save-settings` handler) — there is no shared renderer state across windows.
- **Settings persistence**: `settingsData` (in-memory, main process) is the source of truth, saved to `app.getPath('userData')/settings.json`, falling back to the bundled `settings.json` at repo root on first run. Renderer code never talks to disk directly — it always goes through `ipcRenderer.invoke('get-settings' | 'save-settings', ...)`. Renderer's `globalStore.js` exports a `state.settings` object that mirrors these settings (with its own hardcoded defaults) and is what UI modules read/write in-memory during a session. **When adding a new setting**: add a default in `ipc-handlers.js`'s `settingsData`, mirror the default in `globalStore.js`'s `state.settings`, add the control markup in `settings.html`, and wire it up in `settings.js` (`init...()` to populate from `state.settings`, and inside `saveSettings()` to persist back via `save-settings`).
- **i18n**: `translations.js` loads `src/renderer/locales/{en,fr,ar}.json`, each split into sections (`ui`, `themes`, `tracker`, ...). Use `t(key, section = 'ui')` and `getLanguage()`/`setLanguage()`. Language/direction must be (re)applied per window (`setLanguage(...)`, `applyLanguageDirection()` toggles `document.body.classList('rtl')` + `rtl.css`) — popups do this independently of the main window via their own `get-settings` call. **Always add new keys to all three locale files** (en/fr/ar), keeping the same key name/section across files.
- **Remote-content-with-local-fallback pattern**: `config-api/api.js` fetches JSON content (Athkar, 99 Names, audio albums) from `raw.githubusercontent.com/.../src/renderer/data/*.json` and falls back to the bundled copy in `src/renderer/data/` on failure — this lets content (e.g. adding athkar) be updated without an app release. Follow this pattern (`fetchWithFallback(filename, localFallbackData)`) for any new remotely-updatable dataset.
- **Analytics**: `utils/analytics.js` (renderer) and `utils/analytics-manager.js` (main, initialized in `main.js` right after settings load) provide tracking calls like `analytics.featureOpen('x')`, `analytics.navigation(from, to)`, `analytics.settingsSaved(settings)`, `analytics.error(context, message)`. Existing pages call `analytics.featureOpen('<page>')` in their `renderer.js` branch — do the same for new feature pages.
- **Screen size**: `screenSize.js`'s `screenSizeManager` handles the small/big window-size toggle; call `setupScreenSizeForPage(containerClass)` on page init and use `ipcRenderer.invoke('resize-window', w, h)` before navigating between pages of different sizes (see `navigate-to` usages in `renderer.js`).
- `packages/common` and `packages/extension` are separate, not wired into the Electron build (`package.json`'s `build.files` only includes `src/**/*`, `package.json`, `settings.json`) — don't assume they're part of the running app unless asked.

## Conventions

- Plain CommonJS `require()`/`module.exports` throughout, even in files loaded as `<script type="module">` — this only works because every `BrowserWindow` is created with `nodeIntegration: true, contextIsolation: false`. Don't introduce `import`/`export` syntax or assume a preload/contextBridge exists.
- No UI framework — direct DOM manipulation via `document.getElementById`/`querySelector`. Confirmation dialogs are hand-built DOM overlays appended to `document.body` (see `showResetConfirm`/`showResetAllConfirm` in `tasbihUI.js`), not native `confirm()`.
- Feature pages share a consistent header structure: back button → navigates via `ipcRenderer.invoke('navigate-to', 'features')` (or `'go-back'`), title, then window controls (minimize/fullscreen/close) — copy this pattern for new feature pages instead of inventing a new header layout.
- One CSS file per page/feature under `src/renderer/css/` (e.g. `tasbih.css`, `qibla.css`), plus shared `main.css`, `themes.css`, `components.css`, `utilities.css`, `rtl.css`. Theme colors are CSS custom properties (`--accent-color`, `--accent-rgb`, `--bg-surface`, `--border-color`, ...) switched by a `theme-<name>` class on the root/`#app` element — reuse these variables rather than hardcoding colors so new UI respects all 12+ themes automatically.
