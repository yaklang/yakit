import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteGV } from '@/yakitGV'
import type { HoldGRPCStreamInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'

type Item = { count: number; lastUsedAt: number; id: number; headImg: string }
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
const RESTORE_REQUEST_TTL = 5000
const pendingRestorePlugins = new Map<string, number>()
let lastExecuteSaveQueue: Promise<void> = Promise.resolve()

const binaryReplacer = (_key: string, value: unknown) => {
  if (value instanceof Uint8Array) {
    return { __yakitBinary: true, data: Array.from(value) }
  }
  if (
    value &&
    typeof value === 'object' &&
    (value as { type?: string }).type === 'Buffer' &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return { __yakitBinary: true, data: (value as { data: number[] }).data }
  }
  return value
}

const binaryReviver = (_key: string, value: unknown) => {
  if (
    value &&
    typeof value === 'object' &&
    (value as { __yakitBinary?: boolean }).__yakitBinary &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return new Uint8Array((value as { data: number[] }).data)
  }
  return value
}

export const markPluginRestoreOnOpen = (name: string) => {
  if (name) pendingRestorePlugins.set(name, Date.now())
}

export const takePluginRestoreOnOpen = (name: string) => {
  if (!name) return false
  const markedAt = pendingRestorePlugins.get(name)
  pendingRestorePlugins.delete(name)
  return markedAt !== undefined && Date.now() - markedAt <= RESTORE_REQUEST_TTL
}

export const getPluginUsageCache = async (): Promise<Cache> => {
  try {
    const raw = await getRemoteValue(RemoteGV.PluginUsageRecords)
    return raw ? (JSON.parse(raw) as Cache) : {}
  } catch {
    return {}
  }
}

export const recordPluginUsage = async (name: string, extra: { id: number; headImg: string }) => {
  // name.startsWith('Get*') 属于下载插件
  if (!name || name.startsWith('Get*')) return
  const data = await getPluginUsageCache()
  const prev = data[name]
  data[name] = {
    count: (prev?.count || 0) + 1,
    lastUsedAt: Date.now(),
    id: extra.id,
    headImg: extra.headImg,
  }
  try {
    await setRemoteValue(RemoteGV.PluginUsageRecords, JSON.stringify(data))
  } catch {}
}

export const sortPluginsByUsage = <T extends { ScriptName: string }>(list: T[], usage: Cache) => {
  if (!Object.keys(usage).length) return list
  return [...list].sort((a, b) => (usage[b.ScriptName]?.count || 0) - (usage[a.ScriptName]?.count || 0))
}

const readLastExecuteCache = async (): Promise<LastExecuteCache> => {
  try {
    const raw = await getRemoteValue(RemoteGV.PluginLastExecuteRecords)
    if (!raw) return {}
    const value = JSON.parse(raw, binaryReviver)
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as LastExecuteCache) : {}
  } catch {
    return {}
  }
}

export const getPluginLastExecuteRecord = async (name: string): Promise<PluginLastExecuteRecord | undefined> => {
  if (!name) return undefined
  await lastExecuteSaveQueue.catch(() => undefined)
  const record = (await readLastExecuteCache())[name]
  if (!record?.executeConfig || !record.streamInfo) return undefined
  return record
}

export const recordPluginLastExecute = async (name: string, record: PluginLastExecuteRecord) => {
  if (!name || name.startsWith('Get*')) return
  const recordValue = JSON.stringify(record, binaryReplacer)
  const saveTask = lastExecuteSaveQueue
    .catch(() => undefined)
    .then(async () => {
      const data = await readLastExecuteCache()
      data[name] = {
        ...(JSON.parse(recordValue, binaryReviver) as PluginLastExecuteRecord),
        savedAt: Date.now(),
      }
      const nextData = Object.fromEntries(
        Object.entries(data)
          .sort((a, b) => b[1].savedAt - a[1].savedAt)
          .slice(0, MAX_LAST_EXECUTE_RECORDS),
      )
      try {
        await setRemoteValue(RemoteGV.PluginLastExecuteRecords, JSON.stringify(nextData, binaryReplacer))
      } catch {}
    })
  lastExecuteSaveQueue = saveTask
  return saveTask
}
