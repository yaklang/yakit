import {
  defaultMcpStartConfig,
  parseMcpStartConfig,
  type YakMCPStartConfig,
} from '@/components/layout/hooks/useMcp/useMcp'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'

const store = createExternalStore({ saving: false, saveFailed: false })
let pending: Partial<YakMCPStartConfig> | null = null
let inFlight: Promise<boolean> | null = null
let timer: ReturnType<typeof setTimeout> | undefined

const readConfig = async (): Promise<Partial<YakMCPStartConfig>> => {
  const raw = await getRemoteValue(RemoteAIAgentGV.YakMCPStartConfig)
  if (!raw) return {}
  const config = parseMcpStartConfig(raw)
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Invalid MCP start configuration')
  }
  return config
}

// Dirty fields and their timer survive settings navigation. Each write reads the latest KV value.
const flush = (): Promise<boolean> => {
  clearTimeout(timer)
  timer = undefined
  if (inFlight) return inFlight
  if (!pending) return Promise.resolve(true)
  inFlight = (async () => {
    store.setSnapshot(() => ({ saving: true, saveFailed: false }))
    while (pending) {
      const patch = pending
      pending = null
      try {
        const latest = await readConfig()
        await setRemoteValue(
          RemoteAIAgentGV.YakMCPStartConfig,
          JSON.stringify({ ...defaultMcpStartConfig, ...latest, ...patch }),
        )
      } catch {
        // Preserve edits made during the failed request; the newest value of each field wins.
        pending = Object.assign({}, patch, pending)
        store.setSnapshot(() => ({ saving: false, saveFailed: true }))
        return false
      }
    }
    store.setSnapshot(() => ({ saving: false, saveFailed: false }))
    return true
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}

export const yakMcpStartConfig = {
  async load() {
    if (!(await flush())) throw new Error('Pending MCP configuration could not be saved')
    return readConfig()
  },
  save(patch: Partial<YakMCPStartConfig>) {
    pending = { ...pending, ...patch }
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), 500)
  },
  flush,
}

export const useYakMcpStartConfigSave = bindExternalStoreHook(store)
