import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteGV } from '@/yakitGV'
import type { HoldGRPCStreamInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'

type Item = { count: number; lastUsedAt: number; id?: number; headImg?: string }
type Cache = Record<string, Item>
export type PluginExecuteCacheConfig = {
  formValue: Record<string, any>
  customExtraParamsValue: Record<string, any>
  extraParamsValue: Record<string, any>
  jsonSchemaInitial?: Record<string, any>
}
export type PluginLastExecuteRecord = {
  runtimeId?: string
  executeConfig: PluginExecuteCacheConfig
  streamInfo: HoldGRPCStreamInfo
}
type LastExecuteCacheItem = PluginLastExecuteRecord & { savedAt: number }
type LastExecuteCache = Record<string, LastExecuteCacheItem>
const MAX_LAST_EXECUTE_RECORDS = 10
const pendingRestorePluginNames = new Set<string>()
const { ipcRenderer } = window.require('electron')

export const markPluginRestoreOnOpen = (name: string) => {
  if (name) pendingRestorePluginNames.add(name)
}

export const takePluginRestoreOnOpen = (name: string) => {
  if (!name || !pendingRestorePluginNames.has(name)) return false
  pendingRestorePluginNames.delete(name)
  return true
}

export const getPluginUsageCache = async (): Promise<Cache> => {
  try {
    const raw = await getRemoteValue(RemoteGV.PluginUsageRecords)
    return raw ? (JSON.parse(raw) as Cache) : {}
  } catch {
    return {}
  }
}

export const recordPluginUsage = async (name: string, extra?: Pick<Item, 'id' | 'headImg'>) => {
  // name.startsWith('Get*') 属于下载插件
  if (!name || name.startsWith('Get*')) return
  const data = await getPluginUsageCache()
  const prev = data[name] || { count: 0, lastUsedAt: 0 }
  let detail = { id: extra?.id ?? prev.id, headImg: extra?.headImg ?? prev.headImg }
  if (!detail.id || !detail.headImg) {
    try {
      const res = await ipcRenderer.invoke('QueryYakScriptByNames', { YakScriptName: [name] })
      const script = (res?.Data || [])[0]
      if (script) {
        detail = {
          id: detail.id || script.Id,
          headImg: detail.headImg || script.HeadImg,
        }
      }
    } catch {}
  }
  data[name] = {
    count: prev.count + 1,
    lastUsedAt: Date.now(),
    id: detail.id,
    headImg: detail.headImg,
  }
  await setRemoteValue(RemoteGV.PluginUsageRecords, JSON.stringify(data))
}

export const sortPluginsByUsage = <T extends { ScriptName: string }>(list: T[], usage: Cache) => {
  if (!Object.keys(usage).length) return list
  return [...list].sort((a, b) => (usage[b.ScriptName]?.count || 0) - (usage[a.ScriptName]?.count || 0))
}

const readLastExecuteCache = async (): Promise<LastExecuteCache> => {
  try {
    const raw = await getRemoteValue(RemoteGV.PluginLastExecuteRecords)
    return raw ? (JSON.parse(raw) as LastExecuteCache) : {}
  } catch {
    return {}
  }
}

export const getPluginLastExecuteRecord = async (name: string) => {
  if (!name) return undefined
  return (await readLastExecuteCache())[name]
}

export const recordPluginLastExecute = async (name: string, record: PluginLastExecuteRecord) => {
  if (!name || name.startsWith('Get*')) return
  const data = await readLastExecuteCache()
  data[name] = { ...record, savedAt: Date.now() }
  const nextData = Object.fromEntries(
    Object.entries(data)
      .sort((a, b) => b[1].savedAt - a[1].savedAt)
      .slice(0, MAX_LAST_EXECUTE_RECORDS),
  )
  await setRemoteValue(RemoteGV.PluginLastExecuteRecords, JSON.stringify(nextData))
}
