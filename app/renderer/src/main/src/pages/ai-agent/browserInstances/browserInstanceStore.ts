import { useEffect, useSyncExternalStore } from 'react'
import emiter from '@/utils/eventBus/eventBus'
import { yakitManagedBrowser } from '@/services/electronBridge'
import {
  callBrowserExtensionCapability,
  getBrowserExtensionSnapshot,
  type BrowserBridgeConnection,
  type BrowserExtensionSnapshot,
  type BrowserPairingRequest,
} from '@/pages/browserExtension/browserExtensionClient'

export interface AIBrowserTabPreview {
  id: number
  title: string
  url: string
  active?: boolean
  lastAccessed?: number
  favIconUrl?: string
}

export interface AIBrowserThumbnail {
  tabId: number
  title: string
  url: string
  capturedAt: number
  dataUrl: string
}

export interface AIBrowserInstance {
  id: string
  installationId: string
  name: string
  client: string
  clientVersion: string
  origin: string
  createdAt: number
  lastSeenAt: number
  online: boolean
  running: boolean
  identity?: string
  connection?: BrowserBridgeConnection
  tab?: AIBrowserTabPreview
}

export const browserInstanceDisplayName = (instance: AIBrowserInstance) =>
  instance.identity
    ? `${instance.identity} · ${instance.tab?.title || instance.name}`
    : instance.tab?.title || instance.name

export const browserInstanceMentionName = (instance: AIBrowserInstance) => `@${instance.identity || instance.name}`

interface BrowserInstanceState {
  instances: AIBrowserInstance[]
  pending: BrowserPairingRequest[]
  selectedId: string
  loading: boolean
  error: string
}

const BROWSER_INSTANCE_SELECTION_KEY = 'ai-agent.browser-instance.current'
const REFRESH_INTERVAL = 5_000

let state: BrowserInstanceState = {
  instances: [],
  pending: [],
  selectedId: '',
  loading: false,
  error: '',
}
let refreshSequence = 0
let consumerCount = 0
let refreshTimer: number | undefined
const listeners = new Set<() => void>()

const emitChange = () => listeners.forEach((listener) => listener())

const updateState = (next: Partial<BrowserInstanceState>) => {
  state = { ...state, ...next }
  emitChange()
}

const selectedIdFromStorage = () => {
  try {
    return window.localStorage.getItem(BROWSER_INSTANCE_SELECTION_KEY) || ''
  } catch {
    return ''
  }
}

const persistSelectedId = (id: string) => {
  try {
    window.localStorage.setItem(BROWSER_INSTANCE_SELECTION_KEY, id)
  } catch {
    // A browser instance can still be selected for this renderer session.
  }
}

const connectionByDevice = (snapshot: BrowserExtensionSnapshot) =>
  new Map((snapshot.status?.connections || []).map((connection) => [connection.deviceId, connection]))

const toTabPreview = (value: unknown): AIBrowserTabPreview | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const tab = value as Record<string, unknown>
  const id = Number(tab.id)
  const url = typeof tab.url === 'string' ? tab.url : ''
  if (!Number.isSafeInteger(id) || id < 1 || !url) return undefined
  return {
    id,
    url,
    active: tab.active === true,
    lastAccessed: typeof tab.lastAccessed === 'number' ? tab.lastAccessed : undefined,
    title: typeof tab.title === 'string' && tab.title.trim() ? tab.title : url,
    favIconUrl: typeof tab.favIconUrl === 'string' ? tab.favIconUrl : undefined,
  }
}

const readTabPreview = async (connection: BrowserBridgeConnection) => {
  if (!(connection.capabilities || []).includes('browser.tabs')) return undefined
  try {
    const tabs = await callBrowserExtensionCapability<unknown[]>(connection.deviceId, 'browser.tabs', {}, 8_000)
    if (!Array.isArray(tabs)) return undefined
    const previews = tabs.map(toTabPreview).filter((tab): tab is AIBrowserTabPreview => Boolean(tab))
    return (
      previews.find((tab) => tab.active) ||
      previews.sort((left, right) => (right.lastAccessed || 0) - (left.lastAccessed || 0))[0]
    )
  } catch {
    return undefined
  }
}

export const normalizeBrowserInstances = (
  snapshot: BrowserExtensionSnapshot,
  previews: Record<string, AIBrowserTabPreview | undefined> = {},
  profiles: YakitManagedBrowserProfile[] = [],
): AIBrowserInstance[] => {
  const connections = connectionByDevice(snapshot)
  const profilesByInstallation = new Map(
    profiles.filter((profile) => profile.installationId).map((profile) => [profile.installationId!, profile]),
  )
  return snapshot.devices
    .map((device) => {
      const connection = connections.get(device.id)
      const profile = profilesByInstallation.get(device.installationId)
      return {
        ...device,
        name: profile?.name || device.name,
        online: Boolean(connection),
        running: Boolean(connection?.taskId),
        identity:
          connection?.managedInstance?.badge || (profile ? (profile.slotHint === 'left' ? 'A' : 'B') : undefined),
        connection,
        tab: previews[device.id],
      }
    })
    .sort((left, right) => {
      if (left.online !== right.online) return left.online ? -1 : 1
      if (left.running !== right.running) return left.running ? -1 : 1
      if (left.identity && right.identity && left.identity !== right.identity) {
        return left.identity.localeCompare(right.identity)
      }
      if (left.identity !== right.identity) return left.identity ? -1 : 1
      return right.lastSeenAt - left.lastSeenAt
    })
}

const resolveSelectedId = (instances: AIBrowserInstance[]) => {
  const requested = state.selectedId || selectedIdFromStorage()
  if (requested && instances.some((instance) => instance.id === requested)) return requested
  return instances.find((instance) => instance.online)?.id || instances[0]?.id || ''
}

export const refreshBrowserInstances = async (quiet = false) => {
  const sequence = ++refreshSequence
  if (!quiet) updateState({ loading: true })
  try {
    const [snapshot, profiles] = await Promise.all([
      getBrowserExtensionSnapshot(),
      yakitManagedBrowser.list().catch(() => []),
    ])
    const connected = snapshot.status?.connections || []
    const detailEntries = await Promise.all(
      connected.map(async (connection) => [connection.deviceId, await readTabPreview(connection)] as const),
    )
    if (sequence !== refreshSequence) return
    const previews = Object.fromEntries([
      ...state.instances.filter((instance) => instance.tab).map((instance) => [instance.id, instance.tab] as const),
      ...detailEntries,
    ])
    const instances = normalizeBrowserInstances(snapshot, previews, profiles)
    const selectedId = resolveSelectedId(instances)
    if (selectedId) persistSelectedId(selectedId)
    updateState({ instances, pending: snapshot.pending, selectedId, loading: false, error: '' })
  } catch (error) {
    if (sequence !== refreshSequence) return
    updateState({ loading: false, error: `${error}` })
  }
}

export const readBrowserThumbnail = async (instance: AIBrowserInstance) => {
  if (
    !instance.online ||
    !instance.tab?.active ||
    !(instance.connection?.capabilities || []).includes('browser.thumbnail')
  )
    return undefined
  return callBrowserExtensionCapability<AIBrowserThumbnail>(
    instance.id,
    'browser.thumbnail',
    { tabId: instance.tab.id },
    8_000,
  )
}

export const selectBrowserInstance = (id: string) => {
  if (!state.instances.some((instance) => instance.id === id)) return
  persistSelectedId(id)
  updateState({ selectedId: id })
}

const onBrowserExtensionChanged = () => void refreshBrowserInstances(true)

const start = () => {
  consumerCount += 1
  if (consumerCount !== 1) return
  void refreshBrowserInstances()
  emiter.on('onBrowserExtensionChanged', onBrowserExtensionChanged)
  refreshTimer = window.setInterval(() => void refreshBrowserInstances(true), REFRESH_INTERVAL)
}

const stop = () => {
  consumerCount = Math.max(0, consumerCount - 1)
  if (consumerCount !== 0) return
  emiter.off('onBrowserExtensionChanged', onBrowserExtensionChanged)
  if (refreshTimer !== undefined) window.clearInterval(refreshTimer)
  refreshTimer = undefined
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => state

export const useBrowserInstances = () => {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    start()
    return stop
  }, [])
  return current
}
