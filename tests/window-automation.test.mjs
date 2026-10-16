import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { createChromeMock, makeTab, makeRule } from './chrome-mock.mjs'
import { applyRulesToTabs } from '../src/lib/grouping.ts'
import { isWindowAutoGroupingEnabled, saveRules, setWindowAutoGroupingEnabled } from '../src/lib/storage.ts'
import { reconcileWindowAutoGrouping } from '../src/lib/window-automation.ts'

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
  for (const windowId of fixture.windowIds) await setWindowAutoGroupingEnabled(windowId, true)
  await import(`../src/background.ts?worker=${++workerId}`)
}

beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout'] })
  return start()
})
afterEach(() => mock.timers.reset())

test('unknown windows default to paused and concurrent pauses use independent records', async () => {
  assert.equal(await isWindowAutoGroupingEnabled(999), false)
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
  assert.equal(await isWindowAutoGroupingEnabled(20), false)
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

test('browser restart restores unique windows by content rather than reused window IDs', async () => {
  fixture.tabMap.get(1).url = 'https://research.example/'
  fixture.tabMap.get(2).url = 'https://mail.example/'
  fixture.tabMap.get(3).url = 'https://work.example/'
  await toggle(10, true)
  await toggle(20, false)
  await toggle(30, true)
  fixture.calls.length = 0
  fixture.chrome.storage.session.data.clear()
  // Chrome assigns different IDs, including reusing another window's old ID.
  fixture.tabMap.get(1).windowId = 20
  fixture.tabMap.get(2).windowId = 40
  fixture.tabMap.get(3).windowId = 50
  fixture.windowIds.clear()
  ;[20, 40, 50].forEach((id) => fixture.windowIds.add(id))
  await fixture.chrome.tabs.onCreated.emit(fixture.tabMap.get(2))
  await update(1, { title: 'Research restored' })
  assert.equal(fixture.calls.length, 0)
  assert.equal(await isWindowAutoGroupingEnabled(20), false)
  await reconcileWindowAutoGrouping()
  assert.equal(await isWindowAutoGroupingEnabled(20), true)
  assert.equal(await isWindowAutoGroupingEnabled(40), false)
  assert.equal(await isWindowAutoGroupingEnabled(50), true)
  await update(1, { title: 'Research ready' })
  assert.equal(fixture.calls.some((call) => call.windowId === 40), false)
})

test('ambiguous, incomplete and unrecognized restorations stay paused', async () => {
  await toggle(20, false)
  fixture.chrome.storage.session.data.clear()
  await reconcileWindowAutoGrouping()
  for (const id of fixture.windowIds) assert.equal(await isWindowAutoGroupingEnabled(id), false)
  fixture.tabMap.get(1).url = 'https://new.example/'
  fixture.tabMap.get(2).status = 'loading'
  fixture.tabMap.get(3).url = ''
  await reconcileWindowAutoGrouping()
  for (const id of fixture.windowIds) assert.equal(await isWindowAutoGroupingEnabled(id), false)
})

test('a unique window still loading is restored only after its full fingerprint is available', async () => {
  fixture.tabMap.get(1).url = 'https://unique.example/'
  await setWindowAutoGroupingEnabled(10, true)
  fixture.chrome.storage.session.data.clear()
  fixture.tabMap.get(1).status = 'loading'
  assert.deepEqual(await reconcileWindowAutoGrouping(), [])
  assert.equal(await isWindowAutoGroupingEnabled(10), false)
  fixture.tabMap.get(1).status = 'complete'
  assert.deepEqual(await reconcileWindowAutoGrouping(), [10])
  assert.equal(await isWindowAutoGroupingEnabled(10), true)
})

test('saved fingerprints track paused-window navigation and tab order does not affect restoration', async () => {
  fixture.tabMap.get(1).url = 'https://old.example/'
  fixture.tabMap.set(4, makeTab(4, 10))
  await setWindowAutoGroupingEnabled(10, false)
  fixture.tabMap.get(1).url = 'https://new.example/'
  await reconcileWindowAutoGrouping()
  const tab = fixture.tabMap.get(1)
  fixture.tabMap.delete(1)
  fixture.tabMap.set(1, tab)
  fixture.chrome.storage.session.data.clear()
  await reconcileWindowAutoGrouping()
  const state = fixture.chrome.storage.session.data.get('tabweave.windowAutoGroupingPaused.10')
  assert.equal(state.enabled, false)
  assert.ok(state.recordId)
  const records = [...fixture.chrome.storage.local.data.entries()].filter(([key]) => key.startsWith('tabweave.windowAutoGroupingRecord.'))
  assert.equal(JSON.stringify(records).includes('https://'), false)
})

test('different duplicate counts or pinned states never inherit an enabled choice', async () => {
  fixture.tabMap.get(1).url = 'https://unique.example/'
  fixture.tabMap.set(4, { ...makeTab(4, 10), url: 'https://unique.example/' })
  await setWindowAutoGroupingEnabled(10, true)
  fixture.chrome.storage.session.data.clear()
  fixture.tabMap.delete(4)
  await reconcileWindowAutoGrouping()
  assert.equal(await isWindowAutoGroupingEnabled(10), false)
  fixture.tabMap.set(4, { ...makeTab(4, 10), url: 'https://unique.example/', pinned: true })
  await reconcileWindowAutoGrouping()
  assert.equal(await isWindowAutoGroupingEnabled(10), false)
})

test('a later new window cannot inherit a closed window record in the same session', async () => {
  fixture.tabMap.get(1).url = 'https://unique.example/'
  await setWindowAutoGroupingEnabled(10, true)
  await reconcileWindowAutoGrouping()
  fixture.windowIds.delete(10)
  fixture.tabMap.delete(1)
  await fixture.chrome.windows.onRemoved.emit(10)
  fixture.windowIds.add(40)
  fixture.tabMap.set(4, { ...makeTab(4, 40), url: 'https://unique.example/' })
  await reconcileWindowAutoGrouping()
  assert.equal(await isWindowAutoGroupingEnabled(40), false)
})

test('restoration rolls back if tab events resume during a storage write', async () => {
  fixture.tabMap.get(1).url = 'https://unique.example/'
  await setWindowAutoGroupingEnabled(10, true)
  fixture.chrome.storage.session.data.clear()
  let settled = true
  const original = fixture.chrome.storage.session.set
  fixture.chrome.storage.session.set = async (values) => {
    await original(values)
    if (values['tabweave.windowAutoGroupingPaused.10']) settled = false
  }
  assert.deepEqual(await reconcileWindowAutoGrouping(() => settled), [])
  assert.equal(await isWindowAutoGroupingEnabled(10), false)
})

test('quiet-period restoration refreshes the switch after an extension reload without onStartup', async () => {
  fixture.tabMap.get(1).url = 'https://unique.example/'
  await setWindowAutoGroupingEnabled(10, true)
  fixture.chrome.storage.session.data.clear()
  await update(1, { title: 'Research restored' })
  mock.timers.tick(999)
  assert.equal(await isWindowAutoGroupingEnabled(10), false)
  assert.equal(fixture.calls.length, 0)
  mock.timers.tick(1)
  // Toggle a different window as a queue barrier after the timer callback.
  await toggle(20, false)
  assert.equal(await isWindowAutoGroupingEnabled(10), true)
  assert.equal(titleOf(1), 'Research')
})

test('legacy explicit pauses migrate without allowing unknown windows', async () => {
  fixture.chrome.storage.session.data.clear()
  fixture.chrome.storage.session.data.set('tabweave.windowAutoGroupingPaused.20', true)
  await reconcileWindowAutoGrouping()
  assert.equal(await isWindowAutoGroupingEnabled(20), false)
  assert.equal(typeof fixture.chrome.storage.session.data.get('tabweave.windowAutoGroupingPaused.20').recordId, 'string')
})

test('automatic scans preserve collapsed groups and leave the active group expanded', async () => {
  await start({
    tabs: [makeTab(1, 10, 'Research', 50), { ...makeTab(4, 10, 'Inbox', 51), active: true }],
    groups: [{ id: 50, windowId: 10, title: 'Research', collapsed: true }, { id: 51, windowId: 10, title: 'Mail' }],
    rules: [research, makeRule('mail', 'Inbox', 'Mail')],
    preferences: { autoGroupOnCreate: true, autoGroupOnUpdate: true, autoCollapseGroups: true },
  })
  for (let i = 0; i < 5; i++) {
    await fixture.chrome.tabs.onCreated.emit(fixture.tabMap.get(4))
    await update(1, { title: `Research ${i}` })
  }
  assert.equal(fixture.groupMap.get(50).collapsed, true)
  assert.equal(fixture.groupMap.get(51).collapsed, false)
  assert.deepEqual(fixture.calls, [])
})

test('tab creation and fallback grouping keep background-window tabs in their original window', async () => {
  await start({
    tabs: [makeTab(1, 10), makeTab(2, 20), makeTab(4, 20, 'Other'), makeTab(5, 20, 'Other')],
    preferences: { autoGroupOnCreate: true, autoGroupOnUpdate: true, domainFallbackGrouping: true, groupMinTabs: 2 },
  })
  await fixture.chrome.tabs.onCreated.emit(fixture.tabMap.get(2))
  await update(4, { title: 'Other revised' })
  assert.equal(titleOf(2), 'Research')
  assert.notEqual(fixture.tabMap.get(4).groupId, -1)
  assert.equal([...fixture.tabMap.values()].filter((tab) => tab.windowId === 20).length, 3)
  assert.equal(fixture.calls.every((call) => call.windowId === 20), true)
})

test('event bursts coalesce and a pause does not wait behind one scan per tab event', async () => {
  let release
  let entered
  const gate = new Promise((resolve) => { release = resolve })
  const blocked = new Promise((resolve) => { entered = resolve })
  const originalGroup = fixture.chrome.tabs.group
  const originalQuery = fixture.chrome.tabs.query
  let scans = 0
  fixture.chrome.tabs.query = async (query = {}) => {
    if (!Object.keys(query).length) scans++
    return originalQuery(query)
  }
  fixture.chrome.tabs.group = async (args) => {
    entered()
    await gate
    return originalGroup(args)
  }
  const initial = update(1, { title: 'Research first' })
  await blocked
  const burst = Array.from({ length: 200 }, (_, index) => update(1, { title: `Research ${index}` }))
  // Allow event listeners to enqueue while the first scan remains blocked.
  for (let i = 0; i < 10; i++) await Promise.resolve()
  const pausing = toggle(10, false)
  release()
  await Promise.all([initial, ...burst, pausing])
  assert.ok(scans <= 2, `expected at most two scans, got ${scans}`)
  assert.equal(await isWindowAutoGroupingEnabled(10), false)
})
