import React, { useEffect } from 'react'
import { useHistoryAIReActChat } from '@/components/historyAIReActChat'

/** 代码审计 AI 输入框默认草稿（不自动发送） */
export const IRIFY_CODE_AUDIT_DEFAULT_CHAT_SEED = '开始审计'

/** 待写入 AI 输入框的草稿；输入框未挂载时先暂存，挂载后再 flush */
export const pendingIrifySeedDraftRef: { current: string | null } = { current: null }

export function tryFlushIrifySeedDraft(setChatInputValue: (text: string) => boolean): boolean {
  const text = pendingIrifySeedDraftRef.current
  if (!text) return false
  if (!setChatInputValue(text)) return false
  pendingIrifySeedDraftRef.current = null
  return true
}

/** 仅暂存草稿；实际写入放到 macrotask，避免在 React layout/commit 阶段触发 Milkdown flushSync */
export function queueIrifySeedDraft(text: string, setChatInputValue: (text: string) => boolean) {
  pendingIrifySeedDraftRef.current = text
  window.setTimeout(() => {
    tryFlushIrifySeedDraft(setChatInputValue)
  }, 0)
}

/** 在 ref / Milkdown 未就绪时轮询重试写入（覆盖模型检查、编辑器初始化等时序），最长约 4s */
function startSeedDraftRetryLoop(apply: () => boolean) {
  let cancelled = false
  let attempts = 0
  const maxAttempts = 80

  const tick = () => {
    if (cancelled) return
    if (!pendingIrifySeedDraftRef.current) return
    if (apply()) return
    attempts += 1
    if (attempts < maxAttempts) {
      window.setTimeout(tick, 50)
    }
  }

  window.setTimeout(tick, 0)
  return () => {
    cancelled = true
  }
}

/**
 * 包裹 AI 聊天区域：mount 时启动一次 retry loop，直到草稿写入成功或 pending 已被清空。
 * 不依赖 children/bridge 整体引用，避免因 activeChat 变化而把已发送清空的输入框又写回去。
 */
export const IrifyAiCodeAuditSeedDraftFlush: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { historyAIReActChatBridge } = useHistoryAIReActChat()
  // 直接依赖 `useMemoizedFn` 稳定引用，确保 effect 只在 mount 时运行一次
  const { setChatInputValue } = historyAIReActChatBridge

  useEffect(() => {
    return startSeedDraftRetryLoop(() => tryFlushIrifySeedDraft(setChatInputValue))
  }, [setChatInputValue])

  return <>{children}</>
}
