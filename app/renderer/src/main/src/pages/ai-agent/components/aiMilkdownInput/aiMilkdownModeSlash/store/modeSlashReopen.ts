/** ModeSlash 面板重开：由输入区 AIMilkdownModeSlash 注册，标签点击时触发 */

export type ModeSlashReopenPayload =
  | { kind: 'goalModes' }
  | { kind: 'goalDuration'; durationKey?: string }
  | { kind: 'goalIterations'; iterations: number }
  | { kind: 'goalAcceptance'; text: string }
  | { kind: 'multiAgentConfig'; subAgents: number }

type Handler = (payload: ModeSlashReopenPayload) => void

/** 以输入卡片为归属，后台页签中的编辑器也可以保持挂载。 */
const reopenHandlers = new WeakMap<Element, Handler>()

/** 注册 reopen handler，返回注销函数 */
export const registerModeSlashReopenHandler = (card: Element, handler: Handler): (() => void) => {
  reopenHandlers.set(card, handler)
  return () => {
    if (reopenHandlers.get(card) === handler) reopenHandlers.delete(card)
  }
}

export const requestModeSlashReopen = (source: Element, payload: ModeSlashReopenPayload) => {
  const card = source.closest('[data-ai-input-card]')
  if (card) reopenHandlers.get(card)?.(payload)
}
