# TabWeave fork instructions

- Maintain Japanese and English UI in this fork.
- Chinese copy is upstream-only. Do not add, edit, fix, or improve Chinese translations here, including translations for new fork features.
- Import Chinese updates with `git fetch upstream main` followed by `pnpm run sync:zh`. Keep source values exactly as upstream provides them. See `LOCALIZATION.md`.
- Do not manually edit `src/lib/upstream-chinese.ts`, `public/_locales/zh_CN/messages.json`, `README.zh-CN.md`, or their hashes in `src/lib/upstream-chinese.json`.
- New fork features must have Japanese and English messages. In Chinese mode, missing upstream keys fall back to English; do not add Chinese placeholders.
- Preserve user-authored names, patterns, and prompts when switching UI languages.
- Before committing application changes, run `pnpm test`, `pnpm run lint`, and `pnpm run build`.
