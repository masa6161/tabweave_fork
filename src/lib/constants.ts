import { LEGACY_AI_GROUPING_PROMPT } from './legacy-localization'
import type { AiGroupingProvider, AiGroupingSettings, AutoGroupRule, ChromeGroupColor, Preferences } from './types'

export const STORAGE_KEYS = {
  rules: 'tabweave.rules',
  preferences: 'tabweave.preferences',
  hibernateLastResult: 'tabweave.hibernateLastResult',
  aiGroupingSettings: 'tabweave.aiGroupingSettings',
  aiGroupingApiKeyCursor: 'tabweave.aiGroupingApiKeyCursor',
  snoozedTabs: 'tabweave.snoozedTabs',
  snapshots: 'tabweave.snapshots',
  windowAutoGroupingPaused: 'tabweave.windowAutoGroupingPaused',
} as const

export const DEFAULT_GROUP_MIN_TABS = 3
export const DEFAULT_HIBERNATE_AFTER_MINUTES = 30
export const OPENROUTER_AI_GROUPING_MODEL_PLACEHOLDER = 'provider/model'
export const DEFAULT_GEMINI_AI_GROUPING_MODEL = 'gemini-2.5-flash'
export const DEFAULT_AI_GROUPING_MODELS: Record<AiGroupingProvider, string> = {
  openai: 'gpt-4.1-mini',
  openrouter: '',
  gemini: DEFAULT_GEMINI_AI_GROUPING_MODEL,
  compatible: '',
  chromeBuiltIn: '',
}
export const DEFAULT_AI_GROUPING_PROMPT_EN = [
  'Group tabs by the user intent behind them, not only by domain.',
  'Return group names and explanations in {{language}}.',
  'When several tabs support the same task or project, group them together even if they come from different tools or domains.',
  'For development work, treat local/dev pages, GitHub issues or PRs, deployment dashboards, logs, monitoring, API docs, product requirements, design files, and related chats as one workflow when they clearly refer to the same feature, bug, release, or product.',
  'Prefer practical group names based on the project, product, feature, workflow, or intent when obvious; otherwise use categories such as Code, Research, Design, AI, Docs, Social, Shopping, Travel, or Finance.',
  'Keep one-off pages ungrouped unless they clearly belong with another tab.',
  'Use concise group names that would make sense in a Chrome tab group.',
].join('\n')

export const DEFAULT_AI_GROUPING_PROMPT_JA = [
  'ドメインだけでなく、ユーザーの目的に沿ってタブをグループ化してください。',
  'グループ名と説明は {{language}} で返してください。',
  '同じ作業やプロジェクトに関連するタブは、ツールやドメインが異なっていても同じグループにまとめてください。',
  '開発作業では、同じ機能・不具合・リリース・製品に関係するローカル開発ページ、GitHub の Issue や PR、デプロイ管理画面、ログ、監視、API ドキュメント、要件、デザイン、チャットを一連の作業として扱ってください。',
  'プロジェクト・製品・機能・作業・目的が明らかな場合は、それに基づく実用的なグループ名を優先してください。それ以外は、開発、調査、デザイン、AI、文書、交流、買い物、旅行、金融などの分類名を使ってください。',
  'ほかのタブと明確に関連しない単独のページは、未分類のままにしてください。',
  'Chrome のタブグループで分かりやすい、短いグループ名を使ってください。',
].join('\n')

export const DEFAULT_AI_GROUPING_PROMPT = DEFAULT_AI_GROUPING_PROMPT_EN

export function getDefaultAiGroupingPrompt(lang: 'ja' | 'en'): string {
  return lang === 'ja' ? DEFAULT_AI_GROUPING_PROMPT_JA : DEFAULT_AI_GROUPING_PROMPT_EN
}

export function isDefaultAiGroupingPrompt(prompt: string): boolean {
  const trimmed = prompt.trim()
  return trimmed === DEFAULT_AI_GROUPING_PROMPT_EN || trimmed === DEFAULT_AI_GROUPING_PROMPT_JA || trimmed === LEGACY_AI_GROUPING_PROMPT
}

export const DEFAULT_PREFERENCES: Preferences = {
  autoGroupOnCreate: false,
  autoGroupOnUpdate: false,
  organizeScope: 'currentWindow',
  autoDeduplicateTabs: false,
  deduplicateOnOrganize: false,
  autoHibernateTabs: false,
  hibernateAfterMinutes: DEFAULT_HIBERNATE_AFTER_MINUTES,
  hibernateScope: 'currentWindow',
  hibernateProtectMedia: true,
  hibernateProtectCollaboration: true,
  hibernateOnOrganize: false,
  hibernateWhitelist: '',
  autoCollapseGroups: false,
  domainFallbackGrouping: true,
  groupMinTabs: DEFAULT_GROUP_MIN_TABS,
  duplicateScope: 'currentWindow',
  syncRules: false,
  autoGroupOnPopupOpen: false,
  openInSidePanel: true,
  themeMode: 'system',
  languageMode: 'system',
  uiDensity: 'compact',
  newTabDashboardEnabled: true,
  newTabShowSearch: true,
}

export const DEFAULT_AI_GROUPING_SETTINGS: AiGroupingSettings = {
  enabled: false,
  provider: 'openai',
  model: DEFAULT_AI_GROUPING_MODELS.openai,
  models: { ...DEFAULT_AI_GROUPING_MODELS },
  apiKey: '',
  apiKeys: {},
  baseUrl: '',
  sendUrls: true,
  sendTitles: true,
  sendPageContext: true,
  includeGroupedTabs: false,
  scope: 'currentWindow',
  customPrompt: DEFAULT_AI_GROUPING_PROMPT,
}

export const GROUP_COLORS: ChromeGroupColor[] = [
  'blue',
  'purple',
  'cyan',
  'green',
  'yellow',
  'orange',
  'red',
  'pink',
  'grey',
]

export const COLOR_CLASS: Record<ChromeGroupColor, string> = {
  grey: 'bg-zinc-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-500',
  pink: 'bg-pink-500',
  purple: 'bg-violet-500',
  cyan: 'bg-cyan-400',
  orange: 'bg-orange-500',
}

const defaultTimestamp = 1_775_772_000_000

export const DEFAULT_RULES: AutoGroupRule[] = [
  {
    id: 'chrome-management-default',
    name: 'Chrome と拡張のページ',
    enabled: true,
    target: 'url',
    mode: 'regex',
    pattern: '^chrome-extension://|^chrome://(?!newtab/?$)',
    groupTitle: 'Chrome',
    color: 'blue',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: 'github-default',
    name: 'GitHub の作業',
    enabled: true,
    target: 'url',
    mode: 'contains',
    pattern: 'github.com',
    groupTitle: 'Code',
    color: 'purple',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: 'docs-default',
    name: 'ドキュメントとナレッジ',
    enabled: true,
    target: 'title',
    mode: 'regex',
    pattern: '(docs|documentation|ドキュメント|資料|ガイド|マニュアル|リファレンス|guide|manual|reference)',
    groupTitle: 'Docs',
    color: 'cyan',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: 'ai-default',
    name: 'AI アシスタント',
    enabled: true,
    target: 'url',
    mode: 'regex',
    pattern: '(chatgpt\\.com|claude\\.ai|gemini\\.google\\.com|perplexity\\.ai|poe\\.com|kimi\\.com|doubao\\.com)',
    groupTitle: 'AI',
    color: 'green',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: 'design-default',
    name: 'デザインツール',
    enabled: true,
    target: 'url',
    mode: 'regex',
    pattern: '(figma\\.com|canva\\.com|dribbble\\.com|behance\\.net)',
    groupTitle: 'Design',
    color: 'pink',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: 'notes-default',
    name: 'ノートとナレッジ管理',
    enabled: true,
    target: 'url',
    mode: 'regex',
    pattern: '(notion\\.so|notion\\.site|yuque\\.com|feishu\\.cn|larksuite\\.com)',
    groupTitle: 'Notes',
    color: 'yellow',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: 'mail-default',
    name: 'メールとカレンダー',
    enabled: true,
    target: 'url',
    mode: 'regex',
    pattern: '(mail\\.google\\.com|outlook\\.live\\.com|outlook\\.office\\.com|calendar\\.google\\.com)',
    groupTitle: 'Mail',
    color: 'orange',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: 'video-default',
    name: '動画と配信',
    enabled: true,
    target: 'url',
    mode: 'regex',
    pattern: '(youtube\\.com|youtu\\.be|netflix\\.com|vimeo\\.com|twitch\\.tv)\n(bilibili\\.com|douyin\\.com|kuaishou\\.com|iqiyi\\.com|youku\\.com)',
    conditions: [
      {
        id: 'video-global-condition',
        target: 'url',
        mode: 'regex',
        pattern: '(youtube\\.com|youtu\\.be|netflix\\.com|vimeo\\.com|twitch\\.tv)',
      },
      {
        id: 'video-cn-condition',
        target: 'url',
        mode: 'regex',
        pattern: '(bilibili\\.com|douyin\\.com|kuaishou\\.com|iqiyi\\.com|youku\\.com)',
      },
    ],
    groupTitle: 'Video',
    color: 'red',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: 'assets-default',
    name: '画像と静的リソース',
    enabled: true,
    target: 'url',
    mode: 'regex',
    pattern: '(/|[-_.])(icon|icons|img|image|images|upload|uploads|asset|assets)(/|[-_.])|\\.(svg|png|jpe?g|gif|webp|avif|ico)(\\?|#|$)',
    groupTitle: 'Assets',
    color: 'cyan',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: 'local-dev-default',
    name: 'ローカル開発環境',
    enabled: true,
    target: 'url',
    mode: 'regex',
    pattern: '^https?://(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[::1\\])(:\\d+)?',
    groupTitle: 'Local Dev',
    color: 'grey',
    scope: 'currentWindow',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
]

export const DEFAULT_RULE_IDS = new Set(DEFAULT_RULES.map((rule) => rule.id))
