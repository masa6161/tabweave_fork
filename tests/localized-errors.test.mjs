import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getMessages } from '../src/lib/i18n.ts'
import { localizeErrorMessage } from '../src/lib/localized-errors.ts'

test('Japanese UI translates setup failures and local model recovery steps', () => {
  const ja = getMessages('ja')
  assert.equal(localizeErrorMessage('Missing AI API key', 'ja'), ja.aiErrorMissingKey)
  assert.equal(localizeErrorMessage('Current window is unavailable', 'ja'), ja.errorCurrentWindow)
  assert.equal(localizeErrorMessage('Snapshot not found', 'ja'), ja.errorSnapshotMissing)
  assert.equal(localizeErrorMessage('Failed to create window', 'ja'), ja.errorCreateWindow)
  assert.equal(localizeErrorMessage('Chrome built-in AI model download did not finish in time.', 'ja'), ja.aiErrorBuiltInDownload)
  assert.equal(localizeErrorMessage('Chrome needs a direct user action before starting built-in AI. Run AI organize again from the Popup or Side Panel.', 'ja'), ja.aiErrorBuiltInAction)
})

test('English, Chinese fallback, and unrecognized provider details stay unchanged', () => {
  for (const mode of ['en', 'zh']) {
    assert.equal(localizeErrorMessage('Missing AI API key', mode), 'Missing AI API key')
  }
  const external = 'Provider says: 研究チーム $& {{language}} is unavailable'
  assert.equal(localizeErrorMessage(external, 'ja'), external)
})

test('request errors retain codes and provider text while translating the retry hint', () => {
  const detail = 'Quota exceeded for project $& {code}\nプランを確認'
  const result = localizeErrorMessage(`AI request failed (429): ${detail} Retry after about 30s.`, 'ja')
  assert.equal(result, `AI へのリクエストに失敗しました（429）：${detail} 約 30 秒後に再実行してください。`)
  assert.equal(localizeErrorMessage('AI request failed ({detail}): keep $& {code}', 'ja'), 'AI へのリクエストに失敗しました（{detail}）：keep $& {code}')
})

test('model failures keep model names and unknown errors, including timeout values', () => {
  const result = localizeErrorMessage('AI grouping failed across 2 models: vendor/model: AI request timed out after 75s | 私のモデル: custom provider error', 'ja')
  assert.equal(result, '2 個のモデルで AI グループ化に失敗しました：vendor/model: AI が 75 秒以内に応答しませんでした。 | 私のモデル: custom provider error')
})
