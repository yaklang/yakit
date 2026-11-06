/** ModeSlash 配置步；由 AIMilkdownModeSlash 与 Enter guard 共用，避免双份字面量漂移 */
export type SlashStep = 'root' | 'goalModes' | 'multiAgentConfig' | 'goalIterations' | 'goalAcceptance' | 'goalDuration'

export type ModeSlashEnterConfirmOptions = {
  /** 验收条件草稿；仅 goalAcceptance 步使用，空串时不可确认 */
  acceptanceDraft?: string
}

/**
 * document capture 的 Enter 是否应跳过确认：
 * - 验收框 textarea 内：应换行，不确认
 * - 验收草稿为空：与确认按钮 disabled 一致，不确认
 */
export function shouldSkipModeSlashEnterConfirm(
  step: SlashStep,
  target: EventTarget | null | undefined,
  options?: ModeSlashEnterConfirmOptions,
): boolean {
  if (step !== 'goalAcceptance') return false
  if (!(options?.acceptanceDraft ?? '').trim()) return true
  const el = target as HTMLElement | null | undefined
  return typeof el?.closest === 'function' && !!el.closest('textarea')
}
