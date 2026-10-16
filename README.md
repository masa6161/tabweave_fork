<p align="center">
  <img src="./public/icons/icon-128.png" alt="TabWeave icon" width="96" height="96">
</p>

<h1 align="center">TabWeave</h1>

<p align="center">
  Rule-driven Chrome tab grouping for people who keep a lot of tabs open.
</p>

<p align="center">
  <a href="./README.ja.md">日本語ドキュメント</a> ·
  <a href="./README.zh-CN.md">Chinese upstream documentation</a> ·
  <a href="https://chromewebstore.google.com/detail/tabweave/pmfoefbiapldlpljfpjienjahdfmefej">Chrome Web Store</a> ·
  <a href="./PRIVACY.md">Privacy Policy</a> ·
  <a href="./CHANGELOG.md">Changelog</a>
</p>

TabWeave is a Chrome extension for keeping tab groups clean with rule-based automation. It can group tabs by domain, full URL, page title, or regular expressions, then keep existing managed groups in sync as pages finish loading.

This repository is the masa6161 fork. To use a built fork release without Node.js, download its ZIP from [Releases](https://github.com/masa6161/tabweave_fork/releases) and follow the [installation guide](./INSTALL.md). The Chrome Web Store link above installs upstream TabWeave. See [fork release notes](./CHANGELOG.fork.md) for this fork's changes.

## Highlights

- **Rule-based tab grouping** using domain, URL, title, contains, equals, and regex matching.
- **Multiple conditions per rule**. Each condition has its own field, match mode, and pattern.
- **Popup workspace** for checking groups, expanding/collapsing groups, closing tabs, and creating manual groups.
- **Options page** for rule CRUD, drag-to-reorder priority, import/export, preferences, shortcuts, and issue links.
- **Automatic reconciliation**. If a tab no longer matches the rule that grouped it, TabWeave can move it back to ungrouped.
- **Window automation control**. Pause automatic grouping for individual windows from the popup or side panel.
- **Title update detection**. Recheck title rules even when the page URL stays the same.
- **Dark, light, and system themes**.
- **Japanese / English / Chinese UI**, defaulting to the browser language. Chinese copy is imported unchanged from upstream; fork-only features fall back to English in Chinese mode. See [localization maintenance](./LOCALIZATION.md).
- **Chrome command shortcuts** for opening the popup, organizing the current window, closing duplicate tabs, and opening Command search.
- **Command search** for jumping to open tabs, tab groups, history entries, and built-in cleanup commands.
- **Tab snooze**: schedule tabs or groups to close now and reopen at a specified time, with optional daily recurrence.
- **Window snapshots**: save and restore all tabs and groups of a window in one click.
- **AI grouping**: review suggestions before applying them, with optional saving as exact URL rules.
- **New Tab dashboard**: review groups, ungrouped tabs, snoozed tabs, and snapshots. Search uses Chrome's default search provider.

## Screens and entry points

TabWeave provides these entry points:

- **Side Panel / Popup**: workspace for the current window. The Side Panel is enabled by default; turn off "Open as Side Panel" to use the Popup.
- **Options**: rule management and preferences.
- **New Tab**: dashboard, search, snoozed tabs, and snapshots.

The background service worker listens for tab creation, tab updates, and extension commands.

## Window automation

The **Auto-group this window** switch starts paused for new or unidentified windows. Automatic grouping must also be enabled in Settings (on tab creation or page updates); both Settings switches default to off. Turning the window switch off preserves existing groups and excludes that window from automatic rule grouping, domain grouping, duplicate-group merging, and group collapse, including scans triggered by other windows. Manual organize actions remain available.

Turning it back on immediately organizes that window when automatic grouping is enabled. Tabs moved between windows follow the destination window's setting. Page updates include changes to the title alone.

Window choices survive service worker restarts. For Chrome restarts and extension reloads, TabWeave saves the choice and a hash of each window's tab URLs, pinned states, and incognito state in `chrome.storage.local`. After tab events settle for one second, it restores a choice only when the complete tab configuration matches exactly one saved record and one open window. Window IDs and tab order are not used as identity. Loading, changed, identical, or otherwise unrecognized windows stay paused until safely identified or explicitly enabled. Closed-window records are retained for browser shutdown recovery; at most 100 unclaimed records are kept. Choices from older versions that were already erased by a restart cannot be recovered.

Automatic events are coalesced per window. Automatic grouping preserves collapsed groups and leaves the active group expanded to avoid triggering further tab creation or loading through collapse.

## Default rules

TabWeave includes a practical starter set:

| Rule | Examples | Group |
| --- | --- | --- |
| Chrome and extension pages | `chrome://settings/`, extension options pages | `Chrome` |
| GitHub workflow | `github.com` | `Code` |
| Documentation | docs, documentation, guide, manual, 文档, 指南 | `Docs` |
| AI assistants | ChatGPT, Claude, Gemini, Perplexity, Poe, Kimi, Doubao | `AI` |
| Design tools | Figma, Canva, Dribbble, Behance | `Design` |
| Notes and knowledge | Notion, Yuque, Feishu, Lark | `Notes` |
| Mail and calendar | Gmail, Outlook, Google Calendar | `Mail` |
| Video and streaming | YouTube, Bilibili, Netflix, Vimeo, Twitch, Douyin, Kuaishou, iQIYI, Youku | `Video` |
| Images and static assets | icon, img, image, upload, svg, png, jpg, webp | `Assets` |
| Local development | `localhost`, `127.0.0.1`, `0.0.0.0`, `::1` | `Local Dev` |

Default rules are installed for a fresh setup and can be restored from the Options page. After you save changes, your rule list is treated as intentional: deleting every rule keeps the list empty instead of recreating the defaults.

## Rule model

A rule contains:

- Rule name
- Target group name
- Group color
- Enabled state
- One or more match conditions

Each condition contains:

- **Field**: domain, URL, or title
- **Mode**: contains, equals, or regex
- **Pattern**: one or more lines; each line is treated as an OR condition

Rules are evaluated from top to bottom. The first enabled rule that matches a tab decides the target group.

## Import and export

Use **Export** from the Options page to save rules and preferences to a JSON file.

Use **Import** to restore from a JSON file. Importing is a full replacement: TabWeave will warn you first, then overwrite the current rule list and apply any preferences included in the file.

## Development

Use Node.js 24 and pnpm:

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

Run regression tests with Node.js 24:

```bash
pnpm test
```

With the dev server running, open `/tests/popup-preview.html` for a popup preview with simulated Chrome APIs. Add `?theme=light` for the light theme or `?lang=ja` for Japanese. This preview does not operate on your browser's actual tabs.

The Vite dev server is useful for React page development. Chrome extension APIs require loading the built `dist` directory in Chrome.

## Build

```bash
pnpm run build
```

Then load the extension:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project `dist` directory.

## Shortcuts

Declared shortcuts:

| Action | macOS | Windows / Linux |
| --- | --- | --- |
| Open TabWeave | Command + B | Ctrl + B |
| Organize tabs | Option + Shift + G | Ctrl + Shift + G |
| Deduplicate tabs | Option + Shift + D | Ctrl + Shift + X |
| Open Command search | Command + Shift + K | Ctrl + Shift + K |

Chrome may leave a shortcut unset if it conflicts with another command. You can change shortcuts at:

```text
chrome://extensions/shortcuts
```

## Sync notes

TabWeave can store preferences and rules in `chrome.storage.sync`. During development, cross-device sync only works reliably when the extension ID is the same on every device. Unpacked extensions often have different IDs across machines. Published Chrome Web Store extensions have stable IDs.

For development builds, import/export is the most reliable way to move rules between machines. Because import replaces the whole rule set, export the current setup first if you may want to roll back.

## Project structure

```text
src/
  background.ts          MV3 service worker
  popup.tsx              Popup workspace
  options.tsx            Options / rule editor
  components/ui.tsx      Shared UI primitives
  lib/
    constants.ts         Default rules, colors, storage keys
    grouping.ts          Rule matching, grouping, reconciliation
    i18n.ts              Japanese / English messages with upstream Chinese copy
    links.ts             GitHub and extension metadata links
    shortcuts.ts         Platform-aware shortcut formatting
    storage.ts           chrome.storage wrapper
    theme.ts             Theme application helpers
    types.ts             Shared TypeScript types
public/
  manifest.json          Chrome extension manifest
  icons/                 Extension icons
store-assets/
  chrome-web-store-assets.json  Chrome Web Store upload asset map
  store-*.png                   Store screenshots
```

## License

MIT
