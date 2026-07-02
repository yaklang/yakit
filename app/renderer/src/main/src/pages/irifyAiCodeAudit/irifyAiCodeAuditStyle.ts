export const IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT = 'code_security_audit' as const
/** Irify「AI Skill 安全分析」使用的 focus mode loop 名（对应后端 ai_skill_audit loop） */
export const IRIFY_FOCUS_MODE_AI_SKILL_AUDIT = 'ai_skill_audit' as const

/** Irify AI 代码审计入口风格：code / skill；unset=尚未在引导中确认 */
export type IrifyAiCodeAuditStyle = 'code' | 'skill' | 'unset'

/** 仅 AI 侧边栏 focus 切换：unset 在 UI 上默认高亮 code，不展示第三项 */
export function normalizeIrifyAuditStyleForSidebar(style?: IrifyAiCodeAuditStyle): 'code' | 'skill' {
  return style === 'skill' ? 'skill' : 'code'
}

export function isIrifyAuditStyleConfirmed(style?: IrifyAiCodeAuditStyle): style is 'code' | 'skill' {
  return style === 'code' || style === 'skill'
}

/** 根据入口风格解析 focus mode loop（unset 时暂用 code loop） */
export function resolveIrifyFocusModeLoop(style?: IrifyAiCodeAuditStyle): string {
  return style === 'skill' ? IRIFY_FOCUS_MODE_AI_SKILL_AUDIT : IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT
}
