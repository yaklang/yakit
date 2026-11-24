/**
 * AI Bash 自定义安全规则：一条规则 = 一个命令匹配方式 + 模式 + 命中后的处置动作。
 * 落库位置与引擎 commandcheck.RegexRulesStorageKey 一致（profile 数据库 KV，位于 Yakit Home），
 * 引擎在执行 Bash 工具前读取并对完整命令及拆解后的子命令求值。
 */
export const AI_BASH_GUARD_REGEX_RULES_KEY = 'ai-bash-guard-regex-rules'

/** 命中规则后的处置动作：拦截（拒绝执行）/ 询问（等待用户确认）/ 警告（执行并提示） */
export type AIBashGuardAction = 'deny' | 'ask' | 'warn'

/**
 * 命令匹配方式：
 * - exact：整条命令完全相等，例如 ls 只匹配 ls，不匹配 ls -la
 * - prefix：命令前缀，例如 ls 匹配 ls、ls -la，但不匹配 lsof
 * - regex：Go RE2 正则，保留给复杂命令形态
 */
export type AIBashGuardMatch = 'exact' | 'prefix' | 'regex'

/** 页面中的一行规则，uid 仅用于前端渲染与定位错误，不落库 */
export interface AIBashGuardRuleRow {
  uid: string
  name: string
  pattern: string
  action: AIBashGuardAction
  match: AIBashGuardMatch
  description: string
  disabled: boolean
}

/** 落库结构与引擎 commandcheck.RegexRule 的 json tag 保持一致 */
export interface AIBashGuardStoredRule {
  name?: string
  pattern: string
  action: AIBashGuardAction
  match?: AIBashGuardMatch
  description?: string
  disabled?: boolean
}

export const AIBashGuardActions: AIBashGuardAction[] = ['deny', 'ask', 'warn']
export const AIBashGuardMatches: AIBashGuardMatch[] = ['exact', 'prefix', 'regex']

let uidSeed = 0

export const createRuleRow = (row?: Partial<Omit<AIBashGuardRuleRow, 'uid'>>): AIBashGuardRuleRow => ({
  uid: `ai-bash-guard-rule-${Date.now()}-${uidSeed++}`,
  name: row?.name ?? '',
  pattern: row?.pattern ?? '',
  action: row?.action ?? 'deny',
  match: row?.match ?? 'exact',
  description: row?.description ?? '',
  disabled: row?.disabled ?? false,
})

export const normalizeAction = (value: unknown): AIBashGuardAction => {
  switch (typeof value === 'string' ? value.trim().toLowerCase() : '') {
    case 'ask':
    case 'confirm':
      return 'ask'
    case 'warn':
    case 'warning':
      return 'warn'
    default:
      // 引擎对未知动作也按拦截处理，这里保持一致
      return 'deny'
  }
}

const PLAIN_COMMAND_RE = /^[A-Za-z0-9_\-./:@%+=,]+$/

/**
 * 兼容旧数据：没有 match 字段时，纯命令名的拦截规则按精确命令处理，
 * 其它情况保持原来的正则语义。新规则由页面显式选择匹配方式。
 */
export const normalizeMatch = (value: unknown, pattern: string, action: AIBashGuardAction): AIBashGuardMatch => {
  switch (typeof value === 'string' ? value.trim().toLowerCase() : '') {
    case 'exact':
    case 'command':
      return 'exact'
    case 'prefix':
    case 'command_prefix':
      return 'prefix'
    case 'regex':
    case 'pattern':
      return 'regex'
    default:
      return action === 'deny' && PLAIN_COMMAND_RE.test(pattern.trim()) ? 'exact' : 'regex'
  }
}

export interface ParsedStoredRules {
  rules: AIBashGuardStoredRule[]
  error?: string
}

/** 解析引擎中保存的规则 JSON；空值表示尚未配置 */
export const parseStoredRules = (raw: string): ParsedStoredRules => {
  const text = (raw || '').trim()
  if (!text) return { rules: [] }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    return { rules: [], error: `${error}` }
  }
  if (!Array.isArray(data)) return { rules: [], error: 'rootMustBeArray' }

  const rules: AIBashGuardStoredRule[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const record = item as Record<string, unknown>
    const pattern = typeof record.pattern === 'string' ? record.pattern : ''
    if (!pattern.trim()) continue
    const name = typeof record.name === 'string' ? record.name : ''
    const description = typeof record.description === 'string' ? record.description : ''
    const action = normalizeAction(record.action)
    rules.push({
      pattern,
      action,
      match: normalizeMatch(record.match, pattern, action),
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      ...(record.disabled === true ? { disabled: true } : {}),
    })
  }
  return { rules }
}

/** 把页面行转换为落库结构；空的可选字段不写入，保持存储精简 */
export const rowsToStoredRules = (rows: AIBashGuardRuleRow[]): AIBashGuardStoredRule[] =>
  rows.map((row) => {
    const name = row.name.trim()
    const description = row.description.trim()
    return {
      pattern: row.pattern.trim(),
      action: row.action,
      match: row.match,
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      ...(row.disabled ? { disabled: true } : {}),
    }
  })

export type AIBashGuardRuleValidationError =
  | { code: 'patternRequired'; uid: string; index: number }
  | { code: 'patternSyntax'; uid: string; index: number; message: string }
  | { code: 'patternLookaround'; uid: string; index: number }
  | { code: 'patternBackreference'; uid: string; index: number }
  | { code: 'patternDuplicate'; uid: string; index: number; pattern: string }

/** Go RE2 不支持零宽断言与反向引用，提前拦截，避免规则保存后静默失效 */
const RE2_UNSUPPORTED: { test: RegExp; code: 'patternLookaround' | 'patternBackreference' }[] = [
  { test: /\(\?<?[=!]/, code: 'patternLookaround' },
  { test: /\\[1-9]/, code: 'patternBackreference' },
]

/** 保存前校验：模式非空；正则模式额外校验语法与 RE2 兼容性；同匹配方式下不允许重复 */
export const validateRuleRows = (rows: AIBashGuardRuleRow[]): AIBashGuardRuleValidationError[] => {
  const errors: AIBashGuardRuleValidationError[] = []
  const seen = new Map<string, number>()
  rows.forEach((row, index) => {
    const pattern = row.pattern.trim()
    if (!pattern) {
      errors.push({ code: 'patternRequired', uid: row.uid, index })
      return
    }
    if (row.match === 'regex') {
      for (const rule of RE2_UNSUPPORTED) {
        if (rule.test.test(pattern)) {
          errors.push({ code: rule.code, uid: row.uid, index })
          return
        }
      }
      try {
        new RegExp(pattern)
      } catch (error) {
        errors.push({ code: 'patternSyntax', uid: row.uid, index, message: `${error}` })
        return
      }
    }
    const duplicateKey = `${row.match}\u0000${pattern}`
    const duplicateIndex = seen.get(duplicateKey)
    if (duplicateIndex !== undefined) {
      errors.push({ code: 'patternDuplicate', uid: row.uid, index, pattern })
      return
    }
    seen.set(duplicateKey, index)
  })
  return errors
}

const getIPC = (): any => {
  try {
    // 与 NewPortScan 等页面一致：渲染端通过 preload 暴露的 window.require 访问 ipcRenderer
    return (window as any).require?.('electron')?.ipcRenderer
  } catch (error) {
    return undefined
  }
}

export interface LoadedGuardRules {
  rows: AIBashGuardRuleRow[]
  error?: string
}

/** 从引擎读取规则（GetKey 走 profile 数据库） */
export const readRulesFromEngine = async (): Promise<LoadedGuardRules> => {
  const ipc = getIPC()
  if (!ipc) return { rows: [], error: 'ipcUnavailable' }
  try {
    const raw = await ipc.invoke('GetKey', { Key: AI_BASH_GUARD_REGEX_RULES_KEY })
    const parsed = parseStoredRules(typeof raw === 'string' ? raw : '')
    if (parsed.error) return { rows: [], error: parsed.error }
    return { rows: parsed.rules.map((rule) => createRuleRow(rule)) }
  } catch (error) {
    return { rows: [], error: `${error}` }
  }
}

/** 保存规则到引擎（SetKey 会触发引擎侧的规则缓存失效） */
export const writeRulesToEngine = async (rows: AIBashGuardRuleRow[]): Promise<void> => {
  const ipc = getIPC()
  if (!ipc) throw new Error('electron ipcRenderer unavailable')
  await ipc.invoke('SetKey', {
    Key: AI_BASH_GUARD_REGEX_RULES_KEY,
    Value: JSON.stringify(rowsToStoredRules(rows)),
  })
}
