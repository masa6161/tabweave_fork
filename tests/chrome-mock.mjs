export function createEvent() {
  const listeners = new Set()
  return {
    listeners,
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    emit: (...args) => Promise.all([...listeners].map((listener) => listener(...args))),
  }
}

export function makeTab(id, windowId, title = 'Research', groupId = -1) {
  return { id, windowId, title, groupId, url: 'https://example.com/page', index: id, active: false, pinned: false }
}

export function makeRule(id, pattern, groupTitle = pattern, extras = {}) {
  return {
    id, name: id, enabled: true, target: 'title', mode: 'contains', pattern,
    groupTitle, color: 'blue', scope: 'currentWindow', createdAt: 1, updatedAt: 1, ...extras,
  }
}

export function createChromeMock({ tabs = [], groups = [], preferences = {}, rules = [] } = {}) {
  const tabMap = new Map(tabs.map((tab) => [tab.id, { ...tab }]))
  const groupMap = new Map(groups.map((group) => [group.id, { color: 'blue', collapsed: false, ...group }]))
  const windowIds = new Set(tabs.map((tab) => tab.windowId))
  const calls = []
  let nextGroupId = 1000
  const changed = createEvent()
  const clone = (value) => structuredClone(value)
  function storageArea(area, initial = {}) {
    const data = new Map(Object.entries(initial))
    return {
      data,
      async get(keys) {
        const selected = keys == null ? [...data.keys()] : Array.isArray(keys) ? keys : [keys]
        return Object.fromEntries(selected.filter((key) => data.has(key)).map((key) => [key, clone(data.get(key))]))
      },
      async set(values) {
        const changes = {}
        for (const [key, value] of Object.entries(values)) {
          changes[key] = { oldValue: clone(data.get(key)), newValue: clone(value) }
          data.set(key, clone(value))
        }
        await changed.emit(changes, area)
      },
      async remove(keys) {
        const changes = {}
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          if (data.has(key)) changes[key] = { oldValue: clone(data.get(key)) }
          data.delete(key)
        }
        await changed.emit(changes, area)
      },
    }
  }
  const requireTab = (id) => {
    const tab = tabMap.get(id)
    if (!tab) throw new Error('Tab closed')
    return tab
  }
  const requireGroup = (id) => {
    const group = groupMap.get(id)
    if (!group) throw new Error('Group closed')
    return group
  }
  const pruneGroups = () => {
    for (const id of groupMap.keys()) {
      if (![...tabMap.values()].some((tab) => tab.groupId === id)) groupMap.delete(id)
    }
  }
  const chrome = {
    storage: {
      onChanged: changed,
      session: storageArea('session'),
      local: storageArea('local', { 'tabweave.rules': rules }),
      sync: storageArea('sync', { 'tabweave.preferences': preferences, 'tabweave.rules': rules }),
    },
    runtime: {
      onInstalled: createEvent(), onStartup: createEvent(), onMessage: createEvent(),
      getManifest: () => ({ version: '0.8.1' }),
      getURL: (path) => `chrome-extension://test/${path}`,
      async openOptionsPage() {},
      sendMessage(message) {
        return new Promise((resolve) => {
          const handled = [...chrome.runtime.onMessage.listeners].some((listener) => listener(message, {}, resolve))
          if (!handled) resolve({ ok: false, error: 'Unhandled message' })
        })
      },
    },
    tabs: {
      onCreated: createEvent(), onRemoved: createEvent(), onUpdated: createEvent(),
      onMoved: createEvent(), onAttached: createEvent(), onDetached: createEvent(),
      get: async (id) => clone(requireTab(id)),
      async query(query = {}) {
        return [...tabMap.values()].filter((tab) =>
          (query.windowId == null || tab.windowId === query.windowId)
          && (query.groupId == null || tab.groupId === query.groupId),
        ).map(clone)
      },
      async group({ tabIds, groupId, createProperties }) {
        const members = (Array.isArray(tabIds) ? tabIds : [tabIds]).map(requireTab)
        const windowId = groupId == null
          ? createProperties?.windowId ?? chrome.windows.currentId
          : requireGroup(groupId).windowId
        if (members.some((tab) => tab.windowId !== windowId)) throw new Error('Mixed windows')
        if (groupId == null) {
          groupId = nextGroupId++
          groupMap.set(groupId, { id: groupId, windowId, title: '', color: 'grey', collapsed: false })
        }
        if (requireGroup(groupId).windowId !== windowId) throw new Error('Group in another window')
        calls.push({ type: 'group', windowId, tabIds, groupId })
        members.forEach((tab) => { tab.groupId = groupId })
        pruneGroups()
        return groupId
      },
      async ungroup(ids) {
        for (const id of Array.isArray(ids) ? ids : [ids]) {
          const tab = requireTab(id)
          calls.push({ type: 'ungroup', windowId: tab.windowId, id })
          tab.groupId = -1
        }
        pruneGroups()
      },
      async remove(ids) {
        for (const id of Array.isArray(ids) ? ids : [ids]) {
          calls.push({ type: 'remove', windowId: requireTab(id).windowId, id })
          tabMap.delete(id)
        }
        pruneGroups()
      },
    },
    tabGroups: {
      TAB_GROUP_ID_NONE: -1,
      onCreated: createEvent(), onRemoved: createEvent(), onUpdated: createEvent(),
      get: async (id) => clone(requireGroup(id)),
      query: async ({ windowId } = {}) => [...groupMap.values()].filter((g) => windowId == null || g.windowId === windowId).map(clone),
      async update(id, changes) {
        const group = requireGroup(id)
        calls.push({ type: 'update-group', windowId: group.windowId, id, ...changes })
        Object.assign(group, changes)
        return clone(group)
      },
    },
    windows: {
      WINDOW_ID_CURRENT: -2, onRemoved: createEvent(), currentId: tabs[0]?.windowId ?? 1,
      async get(id, { populate = false } = {}) {
        if (!windowIds.has(id)) throw new Error('Window closed')
        return { id, type: 'normal', ...(populate ? { tabs: [...tabMap.values()].filter((tab) => tab.windowId === id).map(clone) } : {}) }
      },
      async getCurrent() { return chrome.windows.get(chrome.windows.currentId) },
      async getLastFocused() { return chrome.windows.get(chrome.windows.currentId) },
      async getAll({ populate = false } = {}) {
        return [...windowIds].map((id) => ({ id, type: 'normal', ...(populate ? { tabs: [...tabMap.values()].filter((tab) => tab.windowId === id).map(clone) } : {}) }))
      },
    },
    alarms: { onAlarm: createEvent() },
    commands: { onCommand: createEvent() },
  }
  return { chrome, tabMap, groupMap, windowIds, calls }
}
