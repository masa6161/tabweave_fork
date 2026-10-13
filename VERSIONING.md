# Fork versioning / フォークのバージョン管理

## 日本語

このフォークの表示バージョンは `X.Y.Z-fork.N`、Chrome の更新判定に使う数値は `X.Y.Z.N` とします。`X.Y.Z` は取り込んだ upstream のバージョン、`N` はそのベースに対するフォークの更新番号です。初回は `0.8.1-fork.1` / `0.8.1.1` です。

フォークを更新するときは `N` を増やし、`package.json` の `version`、`public/manifest.json` の `version_name` と `version`、`CHANGELOG.fork.md` の日英の変更履歴を同じ変更で更新します。upstream の新しいバージョンを取り込んだ場合は、ベースの番号を変更して `N` を 1 から始めます。

設定画面とポップアップは `version_name` を表示します。拡張 API のないプレビューでもビルド対象の manifest を参照します。ビルド時に番号の整合性、Chrome の形式、変更履歴の記載を検証します。

upstream の履歴は `CHANGELOG.md` に保持し、フォーク独自の履歴は `CHANGELOG.fork.md` に記録します。中国語の追記・修正は行いません。

## English

Use `X.Y.Z-fork.N` for the displayed fork version and `X.Y.Z.N` for Chrome's numeric update version. `X.Y.Z` identifies the imported upstream version; `N` counts fork updates on that base. The first fork version is `0.8.1-fork.1` / `0.8.1.1`.

For each fork update, increment `N` and update `package.json`'s `version`, the manifest's `version_name` and `version`, and the Japanese and English notes in `CHANGELOG.fork.md` together. Start at `N = 1` when importing a newer upstream version.

Options and Popup display `version_name`. Browser previews use the build's manifest when extension APIs are unavailable. The build checks matching versions, Chrome's numeric format, and a corresponding changelog entry.

Keep upstream history in `CHANGELOG.md` and fork history in `CHANGELOG.fork.md`. Do not add or edit Chinese copy.
