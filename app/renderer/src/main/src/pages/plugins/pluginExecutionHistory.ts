import { HTTPRequestBuilderParams } from '@/models/HTTPRequestBuilder'
import { HybridScanPluginConfig } from '@/models/HybridScan'
import { YakExecutorParam } from '@/pages/invoker/YakExecutorParams'
import { RemotePluginGV } from '@/enums/plugin'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import emiter from '@/utils/eventBus/eventBus'
import type { PluginOpPageInfoProps } from '@/store/pageInfo'
import type { HoldGRPCStreamInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import type {
  PluginExecuteExtraFormValue,
  CustomPluginExecuteFormValue,
} from './operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType'

export type PluginExecutionHistorySource = 'plugin-op' | 'plugin-hub'
export type PluginExecutionHistoryStatus = 'finished' | 'stopped'

export interface PluginExecutionHistoryItem {
  id: string
  pluginId: number
  pluginName: string
  pluginUUID?: string
  pluginType: string
  headImg?: string
  source: PluginExecutionHistorySource
  executedAt: number
  input?: string
  execParams: YakExecutorParam[]
  formValue: CustomPluginExecuteFormValue
  extraParamsValue: PluginExecuteExtraFormValue
  httpRequestTemplate?: HTTPRequestBuilderParams
  linkPluginConfig?: HybridScanPluginConfig
  code?: string
  noHTTPRequestTemplate?: boolean
  /** 本次插件执行的运行时 ID，用于恢复已落库的 HTTP、风险、端口等结果 */
  runtimeId?: string
  /** 自定义表格、文本、日志等仅存在于执行流中的前端结果快照 */
  streamInfo?: HoldGRPCStreamInfo
  /** 标识该记录已经在执行流结束后写入过结果，旧版仅参数记录不会作为可找回历史展示 */
  resultRecorded?: boolean
  /** 本次历史是正常执行完成，还是由用户主动停止 */
  resultStatus?: PluginExecutionHistoryStatus
}

export const PLUGIN_EXECUTION_HISTORY_LIMIT = 10

export const getPluginExecutionHistoryPageInfo = (item: PluginExecutionHistoryItem): PluginOpPageInfoProps => ({
  pluginId: String(item.pluginId),
  pluginName: item.pluginName,
  Input: item.input || '',
  ExecParams: item.execParams || [],
  Code: item.code || '',
  PluginType: item.pluginType,
  autoExecute: false,
  noHTTPRequestTemplate: !!item.noHTTPRequestTemplate,
  FormValue: item.formValue,
  ExtraParamsValue: item.extraParamsValue,
  HistoryId: item.id,
  RuntimeId: item.runtimeId,
})

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

const isHistoryItem = (item: unknown): item is PluginExecutionHistoryItem => {
  if (!item || typeof item !== 'object') return false
  const value = item as Partial<PluginExecutionHistoryItem>
  return (
    !!value.pluginName &&
    Number.isFinite(Number(value.pluginId)) &&
    Number.isFinite(Number(value.executedAt)) &&
    value.resultRecorded === true
  )
}

export const queryPluginExecutionHistory = async (): Promise<PluginExecutionHistoryItem[]> => {
  const value = await getRemoteValue(RemotePluginGV.SinglePluginExecutionHistory)
  if (!value) return []
  try {
    const list = JSON.parse(value, binaryReviver)
    if (!Array.isArray(list)) return []
    return list.filter(isHistoryItem).slice(0, PLUGIN_EXECUTION_HISTORY_LIMIT)
  } catch (error) {
    return []
  }
}

const getPluginIdentity = (item: Pick<PluginExecutionHistoryItem, 'pluginId' | 'pluginUUID' | 'pluginName'>) => {
  if (item.pluginUUID) return `uuid:${item.pluginUUID}`
  if (item.pluginId) return `id:${item.pluginId}`
  return `name:${item.pluginName}`
}

export const savePluginExecutionHistory = async (item: PluginExecutionHistoryItem): Promise<void> => {
  const history = await queryPluginExecutionHistory()
  const identity = getPluginIdentity(item)
  const nextHistory = [item, ...history.filter((record) => getPluginIdentity(record) !== identity)].slice(
    0,
    PLUGIN_EXECUTION_HISTORY_LIMIT,
  )
  await setRemoteValue(RemotePluginGV.SinglePluginExecutionHistory, JSON.stringify(nextHistory, binaryReplacer))
  emiter.emit('refreshPluginExecutionHistory')
}
