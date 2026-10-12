# Localization maintenance

This fork supports Japanese, English, and Chinese. Browser-language detection selects Japanese or Chinese when applicable, and English otherwise.

Japanese and English are maintained in this fork. Chinese text is owned by [upstream TabWeave](https://github.com/zxpzdtom/tabweave) and must only change through an upstream import. Do not translate new fork features into Chinese, polish existing Chinese copy, or correct Chinese wording locally.

Chinese resources are generated in `src/lib/upstream-chinese.ts`, copied unchanged into `public/_locales/zh_CN/messages.json` and `README.zh-CN.md`, and tracked by revision and SHA-256 hashes in `src/lib/upstream-chinese.json`. They include the original UI dictionary, default rule names, documentation pattern, AI prompt, and AI examples. The Chinese UI merges this dictionary over English messages, so new fork-only keys display English. Japanese and English contain the new window automation labels.

To import upstream changes:

```sh
git fetch upstream main
pnpm run sync:zh
pnpm test
pnpm run lint
pnpm run build
```

Review the upstream revision and generated diff, then commit the import as its own change. If upstream changes its file format, adapt the importer while preserving upstream Chinese values exactly. Never edit generated Chinese text or update the recorded hashes to approve a local wording change.

User-written rule names, patterns, prompts, and page titles remain user data. Do not translate or overwrite them based on the UI language.
