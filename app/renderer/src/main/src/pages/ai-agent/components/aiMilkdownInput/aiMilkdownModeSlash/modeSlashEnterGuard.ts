/** ModeSlash 配置步；由 AIMilkdownModeSlash 与 Enter guard 共用，避免双份字面量漂移 */
export type SlashStep = 'root' | 'goalModes' | 'multiAgentConfig' | 'goalIterations' | 'goalAcceptance' | 'goalDuration'

/**
 * document capture 的 Enter 会先于 textarea 冒泡到达；
 * 验收条件框内应按换行，不触发确认关面板。
 */
export function shouldSkipModeSlashEnterConfirm(step: SlashStep, target: EventTarget | null | undefined): boolean {
  if (step !== 'goalAcceptance') return false
  const el = target as HTMLElement | null | undefined
  return typeof el?.closest === 'function' && !!el.closest('textarea')
}
