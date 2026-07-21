import type { HoldGRPCStreamInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import type {
  SavePluginExecutionHistoryRequest,
  QueryPluginExecutionHistoryRequest,
  ExecHistoryRecord,
  PluginExecutionUsageItem,
} from '@/pages/invoker/schema'

// 历史存储已从 profile KV (getRemoteValue/setRemoteValue) 迁移到后端 project 库的 ExecHistory 表，
// 通过 gRPC 接口 SavePluginExecutionHistory / GetPluginExecutionUsageRanking / QueryExecHistory 落库。
// 对外函数签名保持兼容，消费方零改动（recordPluginLastExecute 增加可选 meta 参数补全后端字段）。

const { ipcRenderer } = window.require('electron')

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

/** recordPluginLastExecute 的可选元数据，用于补全后端 SavePluginExecutionHistory 所需字段。
 *  消费方若能拿到 plugin 对象，应尽量补传，以保证使用次数排行（按 plugin_id 分组）可用。 */
export type PluginLastExecuteMeta = {
  pluginId?: number
  pluginType?: string
  pluginUUID?: string
  headImg?: string
  source?: string // plugin-op | plugin-hub
  execParams?: string // JSON: []*YakExecutorParam 序列化
  input?: string
  httpRequestTemplate?: string // JSON
  linkPluginConfig?: string // JSON
}

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
    return new Uint8Array((value as { data?: number[] }).data as number[])
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

// ===== 使用次数 =====
// 后端 GetPluginExecutionUsageRanking 按 plugin_id 分组统计，返回按 count 降序的列表。
// 这里把它转成 hejiahui 原有的 {[pluginName]: {count, lastUsedAt, id, headImg}} map 形态，
// 供 MenuPlugin 的"最近使用"排序使用（消费方零改动）。

export const getPluginUsageCache = async (): Promise<Cache> => {
  try {
    const resp = await ipcRenderer.invoke('GetPluginExecutionUsageRanking', {})
    const data: PluginExecutionUsageItem[] = resp?.Data || []
    const cache: Cache = {}
    for (const it of data) {
      if (!it.PluginName) continue
      cache[it.PluginName] = {
        count: it.Count,
        lastUsedAt: it.LastExecutedAt ? it.LastExecutedAt * 1000 : 0,
        id: it.PluginId,
        headImg: it.HeadImg || '',
      }
    }
    return cache
  } catch {
    return {}
  }
}

// 使用次数由后端 SavePluginExecutionHistory 落库驱动，前端点执行时不再单独记次数。
// 保留函数供消费方调用，降级为 no-op（不丢信息：后端排行已含 PluginId/HeadImg）。
export const recordPluginUsage = async (_name: string, _extra: { id: number; headImg: string }) => {
  // no-op: 计数由后端 SavePluginExecutionHistory 驱动
}

export const sortPluginsByUsage = <T extends { ScriptName: string }>(list: T[], usage: Cache) => {
  if (!Object.keys(usage).length) return list
  return [...list].sort((a, b) => (usage[b.ScriptName]?.count || 0) - (usage[a.ScriptName]?.count || 0))
}

// ===== 最近执行记录 =====
// 后端按 plugin 存多条历史，前端"最近执行"只取每个插件最新一条。
// 这里通过 QueryExecHistory(YakScriptName=name, Pagination.Limit=1) 取最新一条，
// 再从 ExecHistoryRecord.StreamInfo(JSON) 反序列化出 streamInfo 快照恢复现场。

const recordFromHistory = (rec: ExecHistoryRecord): PluginLastExecuteRecord | undefined => {
  if (!rec.StreamInfo) return undefined
  // StreamInfo 字段存的是整个 PluginLastExecuteRecord（含 executeConfig + streamInfo + runtimeId）的 JSON，
  // 后端作为 opaque blob 透传，前端整体反序列化恢复现场。
  try {
    const parsed = JSON.parse(rec.StreamInfo, binaryReviver) as PluginLastExecuteRecord
    if (!parsed.executeConfig || !parsed.streamInfo) return undefined
    // 优先用 ExecHistoryRecord.RuntimeId 覆盖（后端权威）
    if (rec.RuntimeId) parsed.runtimeId = rec.RuntimeId
    return parsed
  } catch {
    return undefined
  }
}

export const getPluginLastExecuteRecord = async (name: string): Promise<PluginLastExecuteRecord | undefined> => {
  if (!name) return undefined
  await lastExecuteSaveQueue.catch(() => undefined)
  try {
    const req: QueryPluginExecutionHistoryRequest = {
      YakScriptName: name,
      Pagination: { Page: 1, Limit: 1, OrderBy: 'updated_at', Order: 'desc' },
    }
    const resp = await ipcRenderer.invoke('QueryExecHistory', req)
    const data: ExecHistoryRecord[] = resp?.Data || []
    const latest = data[0]
    if (!latest) return undefined
    return recordFromHistory(latest)
  } catch {
    return undefined
  }
}

export const recordPluginLastExecute = async (
  name: string,
  record: PluginLastExecuteRecord,
  meta?: PluginLastExecuteMeta,
) => {
  if (!name || name.startsWith('Get*')) return
  const recordValue = JSON.stringify(record, binaryReplacer)
  const saveTask = lastExecuteSaveQueue
    .catch(() => undefined)
    .then(async () => {
      const parsed = JSON.parse(recordValue, binaryReviver) as PluginLastExecuteRecord
      // 把整个 PluginLastExecuteRecord（executeConfig + streamInfo + runtimeId）作为 opaque JSON 存进 StreamInfo，
      // 恢复时整体反序列化。后端不解析，只透传。
      const streamInfoBlob = JSON.stringify(parsed, binaryReplacer)
      const req: SavePluginExecutionHistoryRequest = {
        PluginId: meta?.pluginId || 0,
        PluginName: name,
        PluginUUID: meta?.pluginUUID || '',
        PluginType: meta?.pluginType || '',
        Source: meta?.source || 'plugin-op',
        Input: meta?.input || '',
        ExecParams: meta?.execParams || '',
        FormValue: '',
        ExtraParamsValue: '',
        HTTPRequestTemplate: meta?.httpRequestTemplate || '',
        LinkPluginConfig: meta?.linkPluginConfig || '',
        StreamInfo: streamInfoBlob,
        ResultStatus: 'finished',
        RuntimeId: parsed.runtimeId || '',
        HeadImg: meta?.headImg || '',
      }
      try {
        await ipcRenderer.invoke('SavePluginExecutionHistory', req)
      } catch {}
    })
  lastExecuteSaveQueue = saveTask
  return saveTask
}
