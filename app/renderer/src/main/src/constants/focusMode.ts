export const IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT = 'code_security_audit' as const
/** Irify「AI Skill 安全分析」使用的 focus mode loop 名（对应后端 ai_skill_audit loop） */
export const IRIFY_FOCUS_MODE_AI_SKILL_AUDIT = 'ai_skill_audit' as const
export const YAK_RUNNER_FOCUS_MODE_CODE_SECURITY_AUDIT = 'write_yaklang_code' as const

/** Irify AI 代码审计入口风格：code=AI 代码审计；skill=AI Skill 安全分析 */
export type IrifyAiCodeAuditStyle = 'code' | 'skill'

/** 根据入口风格解析对应的 focus mode loop 名 */
export function resolveIrifyFocusModeLoop(style?: IrifyAiCodeAuditStyle): string {
  return style === 'skill' ? IRIFY_FOCUS_MODE_AI_SKILL_AUDIT : IRIFY_FOCUS_MODE_CODE_SECURITY_AUDIT
}
