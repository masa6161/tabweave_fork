import type { RuleScope } from './types'
import { getTargetWindowId, UNGROUPED_ID } from './grouping'

export interface DeduplicateResult {
  closed: number
  duplicates: number
}

function normalizeDuplicateUrl(url = '') {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'about:' && parsed.pathname === 'blank') return 'blank-page'
    if (parsed.protocol === 'chrome:' && parsed.hostname === 'newtab') return 'blank-page'
    if (!['http:', 'https:', 'chrome:', 'chrome-extension:'].includes(parsed.protocol)) return ''
    parsed.hash = ''
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    return parsed.toString()
  } catch {
    return ''
  }
}

function isProtectedTab(tab: chrome.tabs.Tab) {
  return Boolean(tab.pinned || tab.audible)
}

function getKeepScore(tab: chrome.tabs.Tab) {
  return [
    tab.pinned ? 1 : 0,
    tab.audible ? 1 : 0,
    tab.active ? 1 : 0,
    tab.highlighted ? 1 : 0,
    tab.lastAccessed ?? 0,
    -(tab.index ?? 0),
  ]
}

function compareKeepCandidate(a: chrome.tabs.Tab, b: chrome.tabs.Tab) {
  const aScore = getKeepScore(a)
  const bScore = getKeepScore(b)
  for (let index = 0; index < aScore.length; index += 1) {
    if (aScore[index] === bScore[index]) continue
    return bScore[index] - aScore[index]
  }
  return 0
}

export async function queryDeduplicateTabs(scope: RuleScope): Promise<chrome.tabs.Tab[]> {
  if (scope === 'allWindows') {
    const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] })
    return windows.flatMap((window) => window.tabs ?? [])
  }
  const windowId = await getTargetWindowId()
  if (typeof windowId === 'number') return chrome.tabs.query({ windowId })
  return chrome.tabs.query({ currentWindow: true })
}

export async function deduplicateTabs(tabs: chrome.tabs.Tab[], ungroupedOnly = false): Promise<DeduplicateResult> {
  const byUrl = new Map<string, chrome.tabs.Tab[]>()

  for (const tab of tabs) {
    if (typeof tab.id !== 'number') continue
    if (ungroupedOnly && tab.groupId !== UNGROUPED_ID) continue
    const normalizedUrl = normalizeDuplicateUrl(tab.url)
    if (!normalizedUrl) continue
    byUrl.set(normalizedUrl, [...(byUrl.get(normalizedUrl) ?? []), tab])
  }

  const removableIds: number[] = []
  let duplicates = 0

  for (const group of byUrl.values()) {
    if (group.length < 2) continue
    duplicates += group.length - 1

    const sorted = [...group].sort(compareKeepCandidate)
    const [keep, ...candidates] = sorted
    if (!keep) continue

    removableIds.push(
      ...candidates
        .filter((tab) => !isProtectedTab(tab))
        .map((tab) => tab.id)
        .filter((id): id is number => typeof id === 'number'),
    )
  }

  const liveRemovableIds = ungroupedOnly
    ? (await Promise.all(removableIds.map((id) => chrome.tabs.get(id).catch(() => undefined))))
      .flatMap((tab) => tab && typeof tab.id === 'number' && tab.groupId === UNGROUPED_ID && !isProtectedTab(tab) ? [tab.id] : [])
    : removableIds
  if (liveRemovableIds.length > 0) {
    await chrome.tabs.remove(liveRemovableIds)
  }

  return { closed: liveRemovableIds.length, duplicates }
}

export async function deduplicateByScope(scope: RuleScope, ungroupedOnly = false): Promise<DeduplicateResult> {
  return deduplicateTabs(await queryDeduplicateTabs(scope), ungroupedOnly)
}
