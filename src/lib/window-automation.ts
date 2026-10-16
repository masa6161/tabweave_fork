import { STORAGE_KEYS } from './constants'

type WindowState = { recordId: string; enabled: boolean }
type SavedWindow = WindowState & { fingerprint: string; updatedAt: number }
const recordPrefix = 'tabweave.windowAutoGroupingRecord.'
const restoreCandidatesKey = 'tabweave.windowAutoGroupingRestoreCandidates'
const stateKey = (windowId: number) => `${STORAGE_KEYS.windowAutoGroupingPaused}.${windowId}`

function isState(value: unknown): value is WindowState {
  return Boolean(value && typeof value === 'object' && 'recordId' in value
    && typeof value.recordId === 'string' && 'enabled' in value && typeof value.enabled === 'boolean')
}

async function fingerprint(window: chrome.windows.Window): Promise<string | undefined> {
  const tabs = window.tabs ?? await chrome.tabs.query({ windowId: window.id })
  // Never identify a window from an incomplete restoration or an empty URL.
  if (!tabs.length || tabs.some((tab) => tab.status === 'loading' || !(tab.pendingUrl || tab.url))) return
  const contents = JSON.stringify([Boolean(window.incognito), tabs.map((tab) => [tab.pendingUrl || tab.url, tab.pinned]).sort()])
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contents))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function isWindowAutoGroupingEnabled(windowId: number): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.storage) return false
  const value: unknown = (await chrome.storage.session.get(stateKey(windowId)))[stateKey(windowId)]
  // Missing session state must not silently enable automation after a restart.
  return isState(value) && value.enabled
}

export async function setWindowAutoGroupingEnabled(windowId: number, enabled: boolean): Promise<void> {
  const key = stateKey(windowId)
  const previous: unknown = (await chrome.storage.session.get(key))[key]
  const state: WindowState = { recordId: isState(previous) ? previous.recordId : crypto.randomUUID(), enabled }
  const window = await chrome.windows.get(windowId, { populate: true })
  const signature = await fingerprint(window)
  // Save the explicit choice before acknowledging it. Separate records avoid
  // lost updates when different windows are toggled concurrently.
  await chrome.storage.local.set({ [`${recordPrefix}${state.recordId}`]: {
    ...state, fingerprint: signature ?? '', updatedAt: Date.now(),
  } satisfies SavedWindow })
  await chrome.storage.session.set({ [key]: state })
}

export async function clearWindowAutoGroupingState(windowId: number): Promise<void> {
  await chrome.storage.session.remove(stateKey(windowId))
  // Keep the last fingerprint: window-removal events also fire during shutdown.
}

// Called by the worker after tab events have settled, and serialized with
// automatic work and explicit toggles. Window IDs are never reused as identity.
export async function reconcileWindowAutoGrouping(canRestore = () => true): Promise<number[]> {
  const [windows, session, local] = await Promise.all([
    chrome.windows.getAll({ populate: true, windowTypes: ['normal'] }),
    chrome.storage.session.get(null),
    chrome.storage.local.get(null),
  ])
  const records = Object.entries(local).flatMap(([key, value]) =>
    key.startsWith(recordPrefix) && isState(value) && 'fingerprint' in value && typeof value.fingerprint === 'string'
      ? [value as SavedWindow] : [])
  const signatures = await Promise.all(windows.map(fingerprint))
  if (!canRestore()) return []
  // Only windows present during the initial quiet period are restoration
  // candidates. A later new window must not inherit a closed window's choice.
  const candidates: number[] = Array.isArray(session[restoreCandidatesKey])
    ? session[restoreCandidatesKey]
    : windows.flatMap((window) => typeof window.id === 'number' ? [window.id] : [])
  if (!Array.isArray(session[restoreCandidatesKey])) {
    await chrome.storage.session.set({ [restoreCandidatesKey]: candidates })
  }
  const claimed = new Set(Object.values(session).filter(isState).map((state) => state.recordId))
  const restored: number[] = []
  const restoredKeys: string[] = []
  for (const [index, window] of windows.entries()) {
    if (typeof window.id !== 'number') continue
    const key = stateKey(window.id)
    const state: unknown = session[key]
    const signature = signatures[index]
    if (isState(state)) {
      if (signature) await chrome.storage.local.set({ [`${recordPrefix}${state.recordId}`]: {
        ...state, fingerprint: signature, updatedAt: Date.now(),
      } satisfies SavedWindow })
      continue
    }
    // Migrate explicit pauses from older versions without enabling anything.
    if (state === true) {
      await setWindowAutoGroupingEnabled(window.id, false)
      continue
    }
    if (!candidates.includes(window.id) || !signature || signatures.filter((candidate) => candidate === signature).length !== 1) continue
    const matches = records.filter((record) => record.fingerprint === signature)
    if (matches.length !== 1 || claimed.has(matches[0].recordId)) continue
    const match = matches[0]
    if (!canRestore()) break
    claimed.add(match.recordId)
    await chrome.storage.session.set({ [key]: { recordId: match.recordId, enabled: match.enabled } satisfies WindowState })
    restoredKeys.push(key)
    if (match.enabled) restored.push(window.id)
  }
  // Tab restoration may resume while Chrome APIs are awaiting completion.
  // Roll back bindings before any queued automatic work can use them.
  if (!canRestore()) {
    if (restoredKeys.length) await chrome.storage.session.remove(restoredKeys)
    return []
  }
  // Bound retained fingerprints, including records left by normally closed windows.
  const obsolete = records.filter((record) => !claimed.has(record.recordId))
    .sort((a, b) => b.updatedAt - a.updatedAt).slice(100)
  if (obsolete.length) await chrome.storage.local.remove(obsolete.map((record) => `${recordPrefix}${record.recordId}`))
  return restored
}
