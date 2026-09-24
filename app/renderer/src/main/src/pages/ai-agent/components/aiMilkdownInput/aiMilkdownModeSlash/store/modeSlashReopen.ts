/** ModeSlash 面板重开：由输入区 AIMilkdownModeSlash 注册，标签点击时触发 */

export type ModeSlashReopenPayload =
  | { kind: 'goalModes' }
  | { kind: 'goalDuration'; durationKey?: string }
  | { kind: 'goalIterations'; iterations: number }
  | { kind: 'goalAcceptance'; text: string }
  | { kind: 'multiAgentConfig'; subAgents: number }

type Handler = (payload: ModeSlashReopenPayload) => void

/** 栈：后注册的优先；卸载只移除自身，避免清掉仍存活的输入区 handler */
const reopenHandlers: Handler[] = []

/** 注册 reopen handler，返回注销函数 */
export const registerModeSlashReopenHandler = (handler: Handler): (() => void) => {
  reopenHandlers.push(handler)
  return () => {
    const i = reopenHandlers.lastIndexOf(handler)
    if (i >= 0) reopenHandlers.splice(i, 1)
  }
}

/**
 * @deprecated 单槽覆盖写法；多实例场景请用 registerModeSlashReopenHandler。
 * 保留给旧调用/测试：handler 非 null 时清空栈后压入；null 时清空栈。
 */
export const setModeSlashReopenHandler = (handler: Handler | null) => {
  reopenHandlers.length = 0
  if (handler) reopenHandlers.push(handler)
}

export const requestModeSlashReopen = (payload: ModeSlashReopenPayload) => {
  reopenHandlers[reopenHandlers.length - 1]?.(payload)
}
