# Fork changelog / フォークの変更履歴

[Versioning / バージョン管理](./VERSIONING.md) · [Upstream history / upstream の履歴](./CHANGELOG.md)

## 0.8.1-fork.1 - 2026-10-14

Based on upstream TabWeave 0.8.1. Chrome numeric version: `0.8.1.1`.

### 日本語

- ウィンドウごとの自動整理 ON/OFF と、URL を変えないタイトル変更時の再分類を追加。
- 日本語 UI と日英中の切り替えを追加。中国語は upstream から原文のまま取り込み、フォーク独自の項目は英語で表示。
- 日本語のエラー、読み上げラベル、色名と説明を補完。日本語のガイド・プライバシーポリシー・変更履歴と、翻訳確認の記録を追加。
- 設定画面とポップアップにフォークのバージョンを表示。リポジトリ・問題報告・バージョンのリンクをフォーク先へ変更。
- バージョンの不一致と変更履歴の記載漏れをビルド時に検出。
- タグからビルド済み ZIP を作成する手順と、普段の Chrome プロファイルへの読み込み手順を追加。

### English

- Add per-window automatic grouping controls and reclassification when only a page title changes.
- Add Japanese UI and Japanese/English/Chinese selection. Import Chinese copy unchanged from upstream; fork-only keys fall back to English.
- Complete Japanese errors, accessibility labels, color names, and explanations. Add Japanese guides, privacy policy, changelog, and translation review records.
- Display the fork version in Options and Popup. Point repository, issue, and version links to the fork.
- Check version consistency and release notes during builds.
- Package tagged builds as ZIP archives with instructions for loading them in a regular Chrome profile.
