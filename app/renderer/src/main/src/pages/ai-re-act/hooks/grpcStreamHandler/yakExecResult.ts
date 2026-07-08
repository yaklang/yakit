import type { AIMessageHandler, AIMessageHandlerParams } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { checkStreamValidity, convertCardInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStream'
import type { StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'

const handleStatus: AIMessageHandler = (request) => {
  const { res, chatType, store, meta } = request
  if (res.Type !== 'structured' || res.NodeId !== 'status') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as { key: string; value: string }
  if (data.key === 're-act-loading-status-key') {
    if (chatType === 'task') {
      // 任务规划-loading展示标题
      store.getState().updateTaskLoadingStatus({ task: data.value || '加载中...' })
    } else {
      // 自由对话-loading展示标题
      store.getState().updateState({ casualTitle: data.value })
    }
  } else if (data.key === 'plan-executing-loading-status-key') {
    if (chatType === 'task') {
      // 任务规划-loading展示标题
      store.getState().updateTaskLoadingStatus({ plan: data.value || '加载中...' })
    }
  } else {
    const originData = meta.cardKVPair.get(data.key)
    if (originData && originData.Timestamp > res.Timestamp) return

    meta.cardKVPair.set(data.key, {
      Id: data.key,
      Data: data.value,
      Timestamp: res.Timestamp,
      Tags: [],
    })

    if (meta.cardKVPaidTimer) return
    meta.cardKVPaidTimer = setTimeout(() => {
      const cacheCard: AIAgentGrpcApi.AIInfoCard[] = convertCardInfo(meta.cardKVPair)
      store.getState().updateState({ card: cacheCard })
      meta.cardKVPaidTimer = null
    }, 500)
  }
}

const handleCard: (value: AIAgentGrpcApi.AICardMessage, requestInfo: AIMessageHandlerParams) => void = (
  value,
  requestInfo,
) => {
  const { store, meta } = requestInfo

  const logData = value.content as StreamResult.Log
  const checkInfo: AIAgentGrpcApi.AICard = checkStreamValidity(value.content as StreamResult.Log)
  if (!checkInfo) return
  const { id, data, tags } = checkInfo
  const { timestamp } = logData
  const originData = meta.cardKVPair.get(id)
  if (originData && originData.Timestamp > timestamp) {
    return
  }
  meta.cardKVPair.set(id, {
    Id: id,
    Data: data,
    Timestamp: timestamp,
    Tags: Array.isArray(tags) ? tags : [],
  })

  if (meta.cardKVPaidTimer) return
  meta.cardKVPaidTimer = setTimeout(() => {
    const cacheCard: AIAgentGrpcApi.AIInfoCard[] = convertCardInfo(meta.cardKVPair)
    store.getState().updateState({ card: cacheCard })
    meta.cardKVPaidTimer = null
  }, 500)
}

const handleYakExecResult: AIMessageHandler = (requestInfo) => {
  const { res, store, meta } = requestInfo
  if (res.Type !== 'yak_exec_result') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIPluginExecResult

  if (!data?.IsMessage) return
  const message = data?.Message || ''
  const obj: AIAgentGrpcApi.AICardMessage = JSON.parse(Buffer.from(message, 'base64').toString('utf8'))

  if (obj.type !== 'log') return
  const content = obj.content as StreamResult.Log
  switch (content.level) {
    case 'feature-status-card-data':
      handleCard(obj, requestInfo)
      break
    case 'file':
      meta.execFileRecordOrder += 1
      store.getState().updateExecFileRecord(res.CallToolID, content, meta.execFileRecordOrder)
      break
    default:
      break
  }
}

/** 插件执行过程的卡片数据和文件操作记录处理逻辑 */
export const aiYakExecResultDataHandlers = {
  status: handleStatus,
  yak_exec_result: handleYakExecResult,
} as const
