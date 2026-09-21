import cloneDeep from 'lodash/cloneDeep'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '../aiRender'
import type { AIAgentGrpcApi } from '../grpcApi'
import aiChatPersistStore from './aiChatPersistStore'
import type { SessionContentUpdater } from './type'

/**
 * 同一 sessionId::token 的串行写队列，避免异步 put 未完成又来更新导致丢写。
 * 同时承载 sessionContent 与 sessionReference 两类写（主键结构一致 [sessionId, token]），
 * drainSessionContentWrites 按 sessionId 前缀一并排干。
 */
const contentWriteChains = new Map<string, Promise<unknown>>()

const contentKey = (sessionId: string, token: string) => `${sessionId}::${token}`

function enqueueContentWrite(sessionId: string, token: string, task: () => Promise<unknown>): Promise<unknown> {
  const key = contentKey(sessionId, token)
  const next = (contentWriteChains.get(key) || Promise.resolve()).then(task, task)
  contentWriteChains.set(key, next)
  next.finally(() => {
    if (contentWriteChains.get(key) === next) {
      contentWriteChains.delete(key)
    }
  })
  return next
}

/** 生成可 structured-clone 的正文快照 */
export const clonePersistableContent = (data: AIChatQSData): AIChatQSData => {
  return cloneDeep(data)
}

/** IDB 灌回：缺 stageSettled 视为已完成，可淘汰 */
export const applyHydratedStageSettled = (content: AIChatQSData): AIChatQSData => {
  if (content.stageSettled !== false) content.stageSettled = true
  return content
}

/** 按 token 读取会话正文；读盘失败返回 undefined，不抛 */
export const persistGetSessionContent = async (sessionId: string, token: string): Promise<AIChatQSData | undefined> => {
  try {
    return await aiChatPersistStore.getSessionContent(sessionId, token)
  } catch {
    return undefined
  }
}

/**
 * 写入/覆盖会话正文（入队串行）。
 * next 为完整对象时直接 put；为 updater 时走同事务 get→update→put。
 */
export const upsertSessionContent = (
  sessionId: string,
  token: string,
  next: AIChatQSData | SessionContentUpdater,
): Promise<unknown> => {
  return enqueueContentWrite(sessionId, token, async () => {
    try {
      if (typeof next === 'function') {
        await aiChatPersistStore.setSessionContent(sessionId, token, (old) => {
          const result = next(old)
          result.stageSettled = true
          return result
        })
      } else {
        next.stageSettled = true
        const snapshot = clonePersistableContent(next)
        await aiChatPersistStore.setSessionContent(sessionId, token, () => snapshot)
      }
    } catch {
      // 持久化失败不打断主流程
    }
  })
}

/** 独立单条首次/更新落库（薄封装，便于各 handler 统一调用） */
export const persistIndependentItem = (sessionId: string, data: AIChatQSData): Promise<unknown> => {
  return upsertSessionContent(sessionId, data.id, data)
}

/**
 * 删除已落库正文（走同 token 串行队列，避免未完成的 put 在 delete 后又写回孤儿行）。
 * 典型场景：QUESTION 前端 uuid → 后端 taskId 替换。
 */
export const deletePersistedContent = (sessionId: string, token: string): Promise<unknown> => {
  return enqueueContentWrite(sessionId, token, async () => {
    try {
      await aiChatPersistStore.deleteSessionContent(sessionId, token)
    } catch {
      // 持久化失败不打断主流程
    }
  })
}

/** TOOL_RESULT 终态：success / failed / user_cancelled */
export const isToolResultTerminalStatus = (status: string | undefined): boolean => {
  return status === 'success' || status === 'failed' || status === 'user_cancelled'
}

/** 工具已终态时追加写正文；未终态不落库 */
export const persistToolResultIfTerminal = (sessionId: string, toolResult: AIChatQSData): Promise<unknown> | void => {
  if (toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) return
  if (!isToolResultTerminalStatus(toolResult.data.tool.status)) return
  return upsertSessionContent(sessionId, toolResult.id, toolResult)
}

/**
 * 写入/覆盖参考资料（入队串行，纳入 session 排干）。
 * 复用 contentWriteChains（key=sessionId::refToken），drainSessionContentWrites 按 sessionId 前缀一并排干。
 */
export const setSessionReferencePersist = (
  sessionId: string,
  refToken: string,
  data: AIAgentGrpcApi.ReferenceMaterialPayload,
): Promise<unknown> => {
  return enqueueContentWrite(sessionId, refToken, async () => {
    try {
      await aiChatPersistStore.setSessionReference(sessionId, refToken, data)
    } catch {
      // 持久化失败不打断主流程
    }
  })
}

/**
 * 排干某 session 所有在飞的正文/参考资料写，resolve 时该 session 的 token 写队列已排空。
 * 整 session 删除前调用，确保 delete 事务排在所有 put 之后，避免 delete 后迟到的 put 又写回孤儿行。
 */
export const drainSessionContentWrites = (sessionId: string): Promise<unknown[]> => {
  const prefix = `${sessionId}::`
  const chains: Promise<unknown>[] = []
  for (const [key, chain] of contentWriteChains) {
    if (key.startsWith(prefix)) {
      chains.push(chain.catch(() => {}))
    }
  }
  return Promise.all(chains)
}
