# Fork changelog / フォークの変更履歴

[Versioning / バージョン管理](./VERSIONING.md) · [Upstream history / upstream の履歴](./CHANGELOG.md)

## 0.8.1-fork.4 - 2026-10-28

Based on upstream TabWeave 0.8.1. Chrome numeric version: `0.8.1.4`.

### 日本語

- 「未グループのタブだけを整理」を設定に追加。ページ更新時の自動整理と、ポップアップ・サイドパネル・設定画面・新規タブ画面の整理ボタンに適用。初期値はオフで、従来の動作を維持。
- 有効時は、既存タブの再分類、グループの統合・枚数不足による解除、既存グループの色・開閉状態の変更を抑止。未グループのタブは既存グループへ追加可能。
- 整理時の重複削除・休止と、タブ作成・ページ移動時の自動重複削除でも、グループ所属済みのタブを保護。
- 日英の設定表示、設定保存、更新時・ボタン操作時の保護、処理待ち中の手動グループ分けを検証する回帰テストを追加。

### English

- Add an "Only organize ungrouped tabs" setting for page-update automation and Organize buttons in the popup, side panel, settings, and new-tab dashboard. It defaults to off to preserve existing behavior.
- When enabled, preserve grouped tabs, skip group consolidation and below-threshold cleanup, and retain existing group colors and collapse states. Ungrouped tabs can still join existing groups.
- Protect grouped tabs from deduplication and hibernation performed by Organize, and from automatic deduplication on tab creation or navigation.
- Add Japanese/English labels and regression coverage for persistence, update/button handling, and manual grouping while work is pending.

## 0.8.1-fork.3 - 2026-10-27

Based on upstream TabWeave 0.8.1. Chrome numeric version: `0.8.1.3`.

### 日本語

- 作成時の自動整理を、新しく作成された未グループのタブだけに限定。設定画面などを開いた際に、既存タブの手動グループ分けを再分類・解除しない。
- 既存グループの統合、色変更、折りたたみ、枚数不足による解除を作成時の整理から除外。最低枚数の判定では既存タブを参照するが、変更はしない。
- 処理待ちの間にユーザーや他の拡張機能がグループへ追加したタブを保護し、連続して作成されたタブも取りこぼさず処理。
- 作成時のみ自動整理が有効な場合は、ウィンドウ設定の復元・ON 切替・タブのウィンドウ間移動で全体整理を行わない。
- 日英の設定説明と回帰テストを更新。

### English

- Limit automatic grouping on creation to newly created, ungrouped tabs. Opening settings or another tab no longer reclassifies or ungroups existing manually grouped tabs.
- Skip existing-group consolidation, recoloring, collapse, and below-threshold cleanup during creation handling. Existing tabs only contribute to minimum-count checks.
- Preserve tabs grouped by the user or another extension while work is queued, and retain every newly created tab when batching event bursts.
- When only creation automation is enabled, restoring or enabling a window's automation and attaching tabs from another window no longer trigger a full-window scan.
- Update Japanese/English setting descriptions and regression tests.

## 0.8.1-fork.2 - 2026-10-17

Based on upstream TabWeave 0.8.1. Chrome numeric version: `0.8.1.2`.

### 日本語

- Chrome 再起動後のウィンドウ別自動整理設定を、保存したタブ構成のハッシュと一意に一致する場合だけ復元。不明なウィンドウは停止状態を維持。
- 連続イベントによる自動整理の待ち行列を抑制。自動整理で折りたたみ済みグループを開き直さず、操作中のグループは折りたたまない。
- ルール・ドメイン・AI 整理のグループ作成先を元のウィンドウに指定し、意図しないウィンドウ間移動を防止。

### English

- Restore per-window automation after Chrome restarts only when saved tab fingerprints match uniquely; keep unidentified windows paused.
- Coalesce automatic event bursts, preserve collapsed groups, and leave the active group expanded.
- Create rule, domain, and AI groups in the tabs' original windows to prevent unintended cross-window moves.

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
