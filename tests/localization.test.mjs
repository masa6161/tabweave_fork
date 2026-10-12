import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { createChromeMock, makeRule, makeTab } from './chrome-mock.mjs'
import { UPSTREAM_ZH } from '../src/lib/upstream-chinese.ts'
import { applyLanguage, getLanguageName, getMessages, resolveLanguage } from '../src/lib/i18n.ts'
import { DEFAULT_AI_GROUPING_PROMPT_JA, DEFAULT_RULES, STORAGE_KEYS, getDefaultAiGroupingPrompt } from '../src/lib/constants.ts'
import { LEGACY_AI_GROUPING_PROMPT, LEGACY_DEFAULT_RULE_NAMES, LEGACY_DOCS_PATTERN } from '../src/lib/legacy-localization.ts'
import { getAiGroupingSettings, getPreferences, getRules, getSnapshots, normalizePreferences, savePreferences, saveRules } from '../src/lib/storage.ts'
import { getCurrentWindowSnapshot, testPattern } from '../src/lib/grouping.ts'

let fixture
beforeEach(() => {
  fixture = createChromeMock({ tabs: [makeTab(1, 10)] })
  globalThis.chrome = fixture.chrome
})

function withBrowserLanguage(language, run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { value: { language }, configurable: true })
  try { return run() } finally { Object.defineProperty(globalThis, 'navigator', original) }
}

test('language selection supports Japanese, English and upstream Chinese', () => {
  withBrowserLanguage('en-US', () => {
    assert.equal(resolveLanguage('ja'), 'ja')
    assert.equal(resolveLanguage('en'), 'en')
    assert.equal(resolveLanguage('system'), 'en')
    assert.equal(getLanguageName('ja'), 'Japanese')
    assert.equal(resolveLanguage('zh'), 'zh')
    assert.equal(getLanguageName('zh'), 'Chinese')
  })
  for (const locale of ['ja', 'ja-JP', 'JA-jp']) {
    withBrowserLanguage(locale, () => assert.equal(resolveLanguage('system'), 'ja'))
  }
  for (const locale of ['zh-CN', 'zh-TW']) {
    withBrowserLanguage(locale, () => assert.equal(resolveLanguage('system'), 'zh'))
  }
  withBrowserLanguage('fr-FR', () => assert.equal(resolveLanguage('system'), 'en'))
})

test('Japanese copy has every English key and preserves interpolation variables', () => {
  const en = getMessages('en')
  const ja = getMessages('ja')
  assert.deepEqual(Object.keys(ja).sort(), Object.keys(en).sort())
  const variables = (text) => text.match(/\{\{?\w+\}?\}/g)?.sort() ?? []
  for (const key of Object.keys(en)) {
    const english = Array.isArray(en[key]) ? en[key] : [en[key]]
    const japanese = Array.isArray(ja[key]) ? ja[key] : [ja[key]]
    assert.equal(japanese.length, english.length, key)
    japanese.forEach((value, i) => {
      assert.ok(value.trim(), key)
      assert.deepEqual(variables(value), variables(english[i]), key)
    })
  }
  assert.equal(ja.languageJa, '日本語')
  assert.equal(ja.languageZh, '中国語')
  assert.equal(ja.windowAutoGrouping, 'このウィンドウを自動整理')
})

test('Chinese language preferences remain Chinese on read, import normalization and save', async () => {
  const legacy = { languageMode: 'zh', autoGroupOnUpdate: true, organizeScope: 'allWindows' }
  fixture.chrome.storage.sync.data.set(STORAGE_KEYS.preferences, legacy)
  const prefs = await getPreferences()
  assert.equal(prefs.languageMode, 'zh')
  assert.equal(prefs.autoGroupOnUpdate, true)
  assert.equal(prefs.organizeScope, 'allWindows')
  assert.equal(normalizePreferences(legacy).languageMode, 'zh')
  await savePreferences(legacy)
  assert.equal(fixture.chrome.storage.sync.data.get(STORAGE_KEYS.preferences).languageMode, 'zh')
})

test('legacy initial rule names and docs pattern migrate while custom edits stay intact', async () => {
  const oldRules = DEFAULT_RULES.map((rule) => ({ ...rule, name: LEGACY_DEFAULT_RULE_NAMES[rule.id] }))
  const docs = oldRules.find((rule) => rule.id === 'docs-default')
  docs.pattern = LEGACY_DOCS_PATTERN
  docs.conditions = [{ id: 'docs-condition', target: 'title', mode: 'regex', pattern: LEGACY_DOCS_PATTERN }]
  fixture.chrome.storage.local.data.set(STORAGE_KEYS.rules, oldRules)
  const migrated = await getRules()
  for (const rule of migrated) {
    assert.equal(rule.name, DEFAULT_RULES.find((item) => item.id === rule.id).name)
  }
  const migratedDocs = migrated.find((rule) => rule.id === 'docs-default')
  assert.equal(migratedDocs.conditions[0].pattern, migratedDocs.pattern)
  assert.equal(testPattern('API ドキュメント', migratedDocs.pattern, migratedDocs.mode), true)
  const custom = [
    { ...oldRules[0], name: 'My browser pages' },
    { ...docs, name: 'My docs', pattern: 'my-docs', conditions: [{ id: 'edited', target: 'title', mode: 'regex', pattern: 'my-docs' }] },
    makeRule('custom-rule', 'example', 'Research', { name: '独自のルール' }),
  ]
  await saveRules(custom)
  const saved = await getRules()
  assert.deepEqual(saved.map((rule) => rule.name), custom.map((rule) => rule.name))
  assert.equal(saved[1].pattern, 'my-docs')
  assert.equal(saved[1].conditions[0].pattern, 'my-docs')
})

test('default AI prompt follows the selected language while custom prompts stay intact', async () => {
  fixture.chrome.storage.sync.data.set(STORAGE_KEYS.preferences, { languageMode: 'ja' })
  fixture.chrome.storage.local.data.set(STORAGE_KEYS.aiGroupingSettings, { customPrompt: LEGACY_AI_GROUPING_PROMPT })
  assert.equal((await getAiGroupingSettings()).customPrompt, DEFAULT_AI_GROUPING_PROMPT_JA)
  fixture.chrome.storage.local.data.set(STORAGE_KEYS.aiGroupingSettings, { customPrompt: 'My project grouping instructions' })
  assert.equal((await getAiGroupingSettings()).customPrompt, 'My project grouping instructions')
  fixture.chrome.storage.local.data.delete(STORAGE_KEYS.aiGroupingSettings)
  assert.equal((await getAiGroupingSettings()).customPrompt, getDefaultAiGroupingPrompt('ja'))
  fixture.chrome.storage.sync.data.set(STORAGE_KEYS.preferences, { languageMode: 'zh' })
  assert.equal((await getAiGroupingSettings()).customPrompt, LEGACY_AI_GROUPING_PROMPT)
})

test('unnamed tabs and groups use Japanese copy and legacy snapshot names migrate', async () => {
  fixture.chrome.storage.sync.data.set(STORAGE_KEYS.preferences, { languageMode: 'ja' })
  fixture.tabMap.get(1).title = ''
  fixture.tabMap.get(1).groupId = 50
  fixture.groupMap.set(50, { id: 50, windowId: 10, title: '', color: 'blue', collapsed: false })
  const snapshot = await getCurrentWindowSnapshot(10)
  assert.equal(snapshot.groups[0].title, '名前のないグループ')
  assert.equal(snapshot.groups[0].tabs[0].title, '無題')
  fixture.chrome.storage.local.data.set(STORAGE_KEYS.snapshots, [
    { id: 'legacy', name: '快照 10/12 23:15', tabs: [] },
    { id: 'custom', name: 'Research snapshot', tabs: [] },
  ])
  assert.deepEqual((await getSnapshots()).map((item) => item.name), ['スナップショット 10/12 23:15', 'Research snapshot'])
})

test('page language and options title track the selected language', () => {
  const original = globalThis.document
  globalThis.document = { documentElement: {}, title: '' }
  try {
    applyLanguage('ja', true)
    assert.equal(document.documentElement.lang, 'ja')
    assert.equal(document.title, 'TabWeave 設定')
    applyLanguage('en', true)
    assert.equal(document.documentElement.lang, 'en')
    assert.equal(document.title, 'TabWeave Settings')
    applyLanguage('zh', true)
    assert.equal(document.documentElement.lang, 'zh')
    assert.equal(document.title, `TabWeave ${UPSTREAM_ZH.settings}`)
  } finally { globalThis.document = original }
})


test('Chinese copy is upstream-only and new feature labels fall back to English', () => {
  const zh = getMessages('zh')
  for (const [key, value] of Object.entries(UPSTREAM_ZH)) assert.deepEqual(zh[key], value, key)
  for (const key of ['windowAutoGrouping', 'windowAutoGroupingEnabled', 'windowAutoGroupingPaused', 'windowAutoGroupingNeedsSettings', 'aiPromptTabCount', 'languageJa']) {
    assert.equal(key in UPSTREAM_ZH, false, key)
    assert.equal(zh[key], getMessages('en')[key], key)
  }
})

test('Chinese mode uses upstream default rule names and snapshot labels without changing custom names', async () => {
  fixture.chrome.storage.sync.data.set(STORAGE_KEYS.preferences, { languageMode: 'zh' })
  fixture.chrome.storage.local.data.set(STORAGE_KEYS.rules, [...DEFAULT_RULES, makeRule('custom', 'custom', 'Custom', { name: 'My rule' })])
  const rules = await getRules()
  for (const rule of rules.filter((item) => item.id in LEGACY_DEFAULT_RULE_NAMES)) {
    assert.equal(rule.name, LEGACY_DEFAULT_RULE_NAMES[rule.id])
  }
  assert.equal(rules.at(-1).name, 'My rule')
  fixture.chrome.storage.local.data.set(STORAGE_KEYS.snapshots, [{ id: 'auto', name: 'スナップショット 10/12 23:15', tabs: [] }])
  assert.equal((await getSnapshots())[0].name, `${UPSTREAM_ZH.newTabSnapshots} 10/12 23:15`)
})
