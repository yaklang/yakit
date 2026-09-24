/** ModeSlash 面板重开：由 AIMilkdownModeSlash 注册 handler，输入区标签点击时触发 */

export type ModeSlashReopenPayload =
  | { kind: 'goalModes' }
  | { kind: 'goalDuration'; durationKey?: string }
  | { kind: 'goalIterations'; iterations: number }
  | { kind: 'goalAcceptance'; text: string }
  | { kind: 'multiAgentConfig'; subAgents: number }

type Handler = (payload: ModeSlashReopenPayload) => void

let reopenHandler: Handler | null = null

export const setModeSlashReopenHandler = (handler: Handler | null) => {
  reopenHandler = handler
}

export const requestModeSlashReopen = (payload: ModeSlashReopenPayload) => {
  reopenHandler?.(payload)
}
