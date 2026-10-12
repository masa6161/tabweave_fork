import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { createChromeMock, makeTab, makeRule } from './chrome-mock.mjs'
import { applyRulesToTabs } from '../src/lib/grouping.ts'
import { isWindowAutoGroupingEnabled, saveRules, setWindowAutoGroupingEnabled } from '../src/lib/storage.ts'

let fixture
let workerId = 0
const research = makeRule('research', 'Research')
const titleOf = (id) => fixture.groupMap.get(fixture.tabMap.get(id).groupId)?.title
const update = (id, changes) => {
  Object.assign(fixture.tabMap.get(id), changes)
  return fixture.chrome.tabs.onUpdated.emit(id, changes, { ...fixture.tabMap.get(id) })
}
const toggle = (windowId, enabled) => fixture.chrome.runtime.sendMessage({ type: 'TABWEAVE_SET_WINDOW_AUTO_GROUPING', windowId, enabled })

async function start(overrides = {}) {
  fixture = createChromeMock({
    tabs: [makeTab(1, 10), makeTab(2, 20), makeTab(3, 30)],
    preferences: { autoGroupOnUpdate: true, domainFallbackGrouping: false, organizeScope: 'allWindows' },
    rules: [research],
    ...overrides,
  })
  globalThis.chrome = fixture.chrome
  await import(`../src/background.ts?worker=${++workerId}`)
}

beforeEach(() => start())

test('windows default to enabled and concurrent pauses use independent session keys', async () => {
  assert.equal(await isWindowAutoGroupingEnabled(10), true)
  await Promise.all([setWindowAutoGroupingEnabled(10, false), setWindowAutoGroupingEnabled(20, false)])
  assert.equal(await isWindowAutoGroupingEnabled(10), false)
  assert.equal(await isWindowAutoGroupingEnabled(20), false)
  assert.equal(await isWindowAutoGroupingEnabled(30), true)
  assert.equal(fixture.chrome.storage.sync.data.has('tabweave.windowAutoGroupingPaused.10'), false)
})

test('title-only updates classify tabs sharing a URL and obey reordered priorities', async () => {
  await saveRules([
    makeRule('specific', 'Research paper', 'Papers'), research, makeRule('mail', 'Inbox', 'Mail'),
  ])
  await update(1, { title: 'Research paper' })
  await update(2, { title: 'Inbox' })
  assert.equal(titleOf(1), 'Papers')
  assert.equal(titleOf(2), 'Mail')
  await saveRules([research, makeRule('specific', 'Research paper', 'Papers')])
  await update(1, { title: 'Research paper revised' })
  assert.equal(titleOf(1), 'Research')
})

test('title removal ungroups a tab that no longer matches its managed group', async () => {
  await update(1, { title: 'Research paper' })
  assert.equal(titleOf(1), 'Research')
  await update(1, { title: '' })
  assert.equal(fixture.tabMap.get(1).groupId, -1)
})

test('all-window scans skip paused rules, fallback cleanup, merges, and collapse', async () => {
  await start({
    tabs: [makeTab(1, 10), makeTab(2, 20, 'Research', 50), makeTab(4, 20, 'Research', 51), makeTab(5, 20, 'Other'), makeTab(6, 20, 'Other'), makeTab(3, 30)],
    groups: [{ id: 50, windowId: 20, title: 'Duplicates' }, { id: 51, windowId: 20, title: 'Duplicates' }],
    preferences: { autoGroupOnUpdate: true, domainFallbackGrouping: true, groupMinTabs: 2, organizeScope: 'allWindows', autoCollapseGroups: true },
  })
  assert.equal((await toggle(20, false)).ok, true)
  const beforeTabs = [...fixture.tabMap.values()].filter((tab) => tab.windowId === 20).map((tab) => ({ ...tab }))
  const beforeGroups = [...fixture.groupMap.values()].filter((group) => group.windowId === 20).map((group) => ({ ...group }))
  await update(1, { title: 'Research revised' })
  assert.equal(titleOf(1), 'Research')
  assert.equal(titleOf(3), 'Research')
  assert.deepEqual([...fixture.tabMap.values()].filter((tab) => tab.windowId === 20), beforeTabs)
  assert.deepEqual([...fixture.groupMap.values()].filter((group) => group.windowId === 20), beforeGroups)
  assert.equal(fixture.calls.some((call) => call.windowId === 20), false)
})

test('current-window updates use the event window even when another window is focused', async () => {
  fixture.chrome.storage.sync.data.get('tabweave.preferences').organizeScope = 'currentWindow'
  await update(2, { title: 'Research revised' })
  assert.equal(titleOf(2), 'Research')
  assert.equal(fixture.tabMap.get(1).groupId, -1)
})

test('tab attachments use the destination pause state and only organize that window', async () => {
  await toggle(20, false)
  fixture.tabMap.get(1).windowId = 20
  await fixture.chrome.tabs.onAttached.emit(1, { newWindowId: 20, newPosition: 1 })
  assert.equal(fixture.calls.length, 0)
  fixture.tabMap.get(1).windowId = 30
  await fixture.chrome.tabs.onAttached.emit(1, { newWindowId: 30, newPosition: 1 })
  assert.equal(titleOf(1), 'Research')
  assert.equal(fixture.calls.every((call) => call.windowId === 30), true)
})

test('resuming reorganizes only the selected window and leaves global preferences intact', async () => {
  await toggle(20, false)
  const preferences = structuredClone(fixture.chrome.storage.sync.data.get('tabweave.preferences'))
  assert.deepEqual(await toggle(20, true), { ok: true, enabled: true })
  assert.equal(titleOf(2), 'Research')
  assert.equal(fixture.calls.every((call) => call.windowId === 20), true)
  assert.deepEqual(fixture.chrome.storage.sync.data.get('tabweave.preferences'), preferences)
})

test('a restarted worker respects saved pauses and window removal clears only that window', async () => {
  await toggle(20, false)
  await toggle(30, false)
  fixture.chrome.tabs.onUpdated.listeners.clear()
  fixture.chrome.windows.onRemoved.listeners.clear()
  await import(`../src/background.ts?worker=${++workerId}`)
  await update(2, { title: 'Research revised' })
  assert.equal(fixture.calls.length, 0)
  fixture.windowIds.delete(20)
  fixture.tabMap.delete(2)
  await fixture.chrome.windows.onRemoved.emit(20)
  assert.equal(await isWindowAutoGroupingEnabled(20), true)
  assert.equal(await isWindowAutoGroupingEnabled(30), false)
})

test('paused windows still support explicitly requested manual grouping', async () => {
  await toggle(20, false)
  await applyRulesToTabs([research], [fixture.tabMap.get(2)], false)
  assert.equal(titleOf(2), 'Research')
})

test('a tab moved after the source scan is refreshed is not grouped in a paused destination', async () => {
  await toggle(20, false)
  const stale = { ...fixture.tabMap.get(1) }
  fixture.tabMap.get(1).windowId = 20
  await applyRulesToTabs([research], [stale], true, 1, { automatic: true, windowIds: [10] })
  assert.equal(fixture.calls.length, 0)
})

test('pause acknowledgement waits for in-flight grouping and blocks later automatic mutations', async () => {
  let release
  let entered
  const blocked = new Promise((resolve) => { entered = resolve })
  const gate = new Promise((resolve) => { release = resolve })
  const original = fixture.chrome.tabs.group
  fixture.chrome.tabs.group = async (args) => {
    entered()
    await gate
    return original(args)
  }
  const organizing = update(2, { title: 'Research revised' })
  await blocked
  let acknowledged = false
  const pausing = toggle(20, false).then((response) => { acknowledged = true; return response })
  await Promise.resolve()
  assert.equal(acknowledged, false)
  release()
  await organizing
  assert.equal((await pausing).ok, true)
  const before = fixture.calls.length
  await update(1, { title: 'Research later' })
  assert.equal(fixture.calls.slice(before).some((call) => call.windowId === 20), false)
})

test('creation respects pauses and evaluates minimum counts within the new tab window', async () => {
  await start({
    tabs: [makeTab(1, 10), makeTab(4, 10), makeTab(2, 20)],
    preferences: { autoGroupOnCreate: true, autoGroupOnUpdate: false, groupMinTabs: 2 },
    rules: [makeRule('threshold', 'Research', 'Research', { minTabs: 2 })],
  })
  await toggle(20, false)
  await fixture.chrome.tabs.onCreated.emit(fixture.tabMap.get(2))
  assert.equal(fixture.calls.length, 0)
  await fixture.chrome.tabs.onCreated.emit(fixture.tabMap.get(1))
  assert.equal(titleOf(1), 'Research')
  assert.equal(titleOf(4), 'Research')
  assert.equal(fixture.calls.every((call) => call.windowId === 10), true)
})

test('unrelated updates are inert and title-only changes do not trigger automatic tab deletion', async () => {
  fixture.chrome.storage.sync.data.get('tabweave.preferences').autoDeduplicateTabs = true
  await fixture.chrome.tabs.onUpdated.emit(1, { audible: true })
  assert.equal(fixture.calls.length, 0)
  await update(1, { title: 'Research revised' })
  assert.equal(titleOf(1), 'Research')
  assert.equal(fixture.calls.some((call) => call.type === 'remove'), false)
})

test('invalid requests fail without breaking later toggles and global automation remains optional', async () => {
  assert.equal((await toggle(-1, false)).ok, false)
  assert.equal((await toggle(999, false)).ok, false)
  assert.equal((await toggle(20, false)).ok, true)
  fixture.chrome.storage.sync.data.get('tabweave.preferences').autoGroupOnUpdate = false
  assert.equal((await toggle(20, true)).ok, true)
  await update(2, { title: 'Research revised' })
  assert.equal(fixture.calls.length, 0)
})
