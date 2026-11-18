import { create } from 'zustand'
import i18n from '@/i18n/i18n'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { yakitFailed } from '@/utils/notification'
import { DEFAULT_HIDDEN_HTTP_HEADERS, isValidHTTPHeaderName, normalizeHTTPHeaderNames } from '@/utils/hiddenHTTPHeaders'

export type HeaderRole = 'request' | 'response'

export interface HeaderVisibilitySettings {
  hidden: boolean
  headers: readonly string[]
}

export type HTTPHeaderVisibilitySettings = Record<HeaderRole, HeaderVisibilitySettings>
const roles: HeaderRole[] = ['request', 'response']
// The editor's history namespace is preloaded, including before opening the settings panel.
const t = i18n.getFixedT(null, 'history')

interface EditorHeaderVisibilityStore {
  hidden: Record<HeaderRole, boolean>
  headers: Record<HeaderRole, readonly string[]>
  ready: Record<HeaderRole, boolean>
  initialize: () => Promise<void>
  toggle: (role: HeaderRole) => Promise<void>
  saveSettings: (settings: HTTPHeaderVisibilitySettings) => Promise<void>
}

const parseJSON = (value: unknown): unknown => {
  if (typeof value !== 'string') return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

const parseHeaders = (value: unknown, role: HeaderRole): readonly string[] => {
  if (
    Array.isArray(value) &&
    value.every((header) => typeof header === 'string' && isValidHTTPHeaderName(header.trim()))
  ) {
    return normalizeHTTPHeaderNames(value)
  }
  return DEFAULT_HIDDEN_HTTP_HEADERS[role]
}

const defaults = (): HTTPHeaderVisibilitySettings => ({
  request: { hidden: false, headers: DEFAULT_HIDDEN_HTTP_HEADERS.request },
  response: { hidden: false, headers: DEFAULT_HIDDEN_HTTP_HEADERS.response },
})

export const useEditorHeaderVisibility = create<EditorHeaderVisibilityStore>((set, get) => {
  let initialization: Promise<void> | undefined
  let writes = Promise.resolve()
  let persisted = defaults()
  const visibilityVersion = { request: 0, response: 0 }
  const pendingToggles = { request: 0, response: 0 }

  const enqueue = (write: () => Promise<void>) => {
    const result = writes.then(async () => {
      await get().initialize()
      if (!get().ready.request || !get().ready.response) throw new Error(t('HTTPHeaderVisibility.notLoaded'))
      await write()
    })
    writes = result.catch(() => {})
    return result
  }

  return {
    hidden: { request: false, response: false },
    headers: { ...DEFAULT_HIDDEN_HTTP_HEADERS },
    ready: { request: false, response: false },
    initialize: () => {
      if (initialization) return initialization
      initialization = (async () => {
        const value = await getRemoteValue(FuzzerRemoteGV.WebFuzzerHeaderVisibility)
        const settings = defaults()
        if (value) {
          const parsed = parseJSON(value)
          for (const role of roles) {
            const entry = parsed && typeof parsed === 'object' ? parsed[role] : undefined
            settings[role] = {
              hidden: entry?.hidden === true,
              headers: parseHeaders(entry?.headers, role),
            }
          }
        }
        persisted = settings
        set((state) => ({
          hidden: {
            request: pendingToggles.request ? state.hidden.request : settings.request.hidden,
            response: pendingToggles.response ? state.hidden.response : settings.response.hidden,
          },
          headers: { request: settings.request.headers, response: settings.response.headers },
          ready: { request: true, response: true },
        }))
      })().catch((error) => {
        initialization = undefined
        yakitFailed(String(error))
      })
      return initialization
    },
    toggle: (role) => {
      const hidden = !get().hidden[role]
      const version = ++visibilityVersion[role]
      pendingToggles[role]++
      set((state) => ({ hidden: { ...state.hidden, [role]: hidden } }))
      return enqueue(async () => {
        // Merge with the last committed snapshot, never another pending edit.
        const next = { ...persisted, [role]: { ...persisted[role], hidden } }
        await setRemoteValue(FuzzerRemoteGV.WebFuzzerHeaderVisibility, JSON.stringify(next))
        persisted = next
      })
        .catch((error) => {
          if (visibilityVersion[role] === version) {
            set((state) => ({ hidden: { ...state.hidden, [role]: persisted[role].hidden } }))
          }
          yakitFailed(String(error))
        })
        .finally(() => {
          pendingToggles[role]--
        })
    },
    saveSettings: (settings) => {
      const next = defaults()
      for (const role of roles) {
        const headers = normalizeHTTPHeaderNames(settings[role].headers)
        if (headers.some((header) => !isValidHTTPHeaderName(header)))
          return Promise.reject(new Error(t('HTTPHeaderVisibility.invalidName')))
        next[role] = { hidden: settings[role].hidden, headers }
      }
      const versions = { ...visibilityVersion }
      return enqueue(async () => {
        // A single SetKey commits both directions and their lists together.
        await setRemoteValue(FuzzerRemoteGV.WebFuzzerHeaderVisibility, JSON.stringify(next))
        persisted = next
        set((state) => ({
          hidden: {
            request: visibilityVersion.request === versions.request ? next.request.hidden : state.hidden.request,
            response: visibilityVersion.response === versions.response ? next.response.hidden : state.hidden.response,
          },
          headers: { request: next.request.headers, response: next.response.headers },
        }))
      })
    },
  }
})
