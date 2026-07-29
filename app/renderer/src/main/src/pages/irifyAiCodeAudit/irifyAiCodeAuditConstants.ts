import { IrifyAiCodeAuditStyle } from './irifyAiCodeAuditStyle'

const CHAT_SEED_BY_STYLE: Record<IrifyAiCodeAuditStyle, string> = {
  code: '开始审计',
  skill: '请审计这个 Skill 是否存在恶意行为',
  unset: '开始审计',
}

export function resolveIrifyAuditDefaultChatSeed(style?: IrifyAiCodeAuditStyle): string {
  return CHAT_SEED_BY_STYLE[style ?? 'unset']
}
