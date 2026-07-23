import cloneDeep from 'lodash/cloneDeep'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '../aiRender'
import aiChatPersistStore from './aiChatPersistStore'
import type { SessionContentUpdater } from './type'

/** 同一 sessionId::token 的串行写队列，避免异步 put 未完成又来更新导致丢写 */
const contentWriteChains = new Map<string, Promise<unknown>>()

const contentKey = (sessionId: string, token: string) => `${sessionId}::${token}`

function enqueueContentWrite(sessionId: string, token: string, task: () => Promise<unknown>): Promise<unknown> {
  const key = contentKey(sessionId, token)
  const next = (contentWriteChains.get(key) || Promise.resolve()).then(task, task)
  contentWriteChains.set(
    key,
    next.finally(() => {
      if (contentWriteChains.get(key) === next) {
        contentWriteChains.delete(key)
      }
    }),
  )
  return next
}

/** 生成可 structured-clone 的正文快照 */
export const clonePersistableContent = (data: AIChatQSData): AIChatQSData => {
  return cloneDeep(data)
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
        await aiChatPersistStore.setSessionContent(sessionId, token, next)
      } else {
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

/**
 * 向已落库正文的 reference 追加 refToken。
 * 无旧记录时跳过（stream 尚未 end 时参考资料只挂内存，等 end 一并写入）。
 */
export const appendReferenceToContent = (
  sessionId: string,
  contentToken: string,
  refToken: string,
): Promise<unknown> => {
  return enqueueContentWrite(sessionId, contentToken, async () => {
    try {
      const old = await aiChatPersistStore.getSessionContent(sessionId, contentToken)
      if (!old) return
      const reference = [...(old.reference || [])]
      if (!reference.includes(refToken)) {
        reference.push(refToken)
      }
      const next: AIChatQSData = { ...clonePersistableContent(old), reference }
      await aiChatPersistStore.setSessionContent(sessionId, contentToken, () => next)
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
