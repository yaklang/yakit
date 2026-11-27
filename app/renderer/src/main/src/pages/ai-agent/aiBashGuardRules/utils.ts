/**
 * AI Bash 自定义安全规则：一条规则 = 匹配方式 + 匹配内容 + 处置动作。
 * 存储 key 与引擎 aicommon.BashGuardRegexRulesStorageKey 一致（profile 数据库 KV，位于 Yakit Home），
 * 引擎读取后对完整命令及拆解出的子命令分别求值。
 */
export const AI_BASH_GUARD_REGEX_RULES_KEY = 'ai-bash-guard-regex-rules'

/** 命中后的处置动作：拦截（拒绝执行）/ 询问（等待确认）/ 警告（继续执行并提示） */
export type AIBashGuardAction = 'deny' | 'ask' | 'warn'

/** 匹配方式：正则 / 精确命令 / 命令前缀，缺省由引擎按正则处理 */
export type AIBashGuardMatch = 'regex' | 'exact' | 'prefix'

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

/** 落库结构与引擎 aicommon.BashGuardRegexRule 的 json tag 保持一致 */
export interface AIBashGuardStoredRule {
  name?: string
  pattern: string
  action: AIBashGuardAction
  match: AIBashGuardMatch
  description?: string
  disabled: boolean
}

let uidSeed = 0

export const createRuleRow = (row?: Partial<Omit<AIBashGuardRuleRow, 'uid'>>): AIBashGuardRuleRow => ({
  uid: `ai-bash-guard-rule-${Date.now()}-${uidSeed++}`,
  name: row?.name ?? '',
  pattern: row?.pattern ?? '',
  action: row?.action ?? 'deny',
  match: row?.match ?? 'regex',
  description: row?.description ?? '',
  // 引擎对缺失的 disabled 按关闭处理，新建规则同样默认关闭，需手动开启。
  disabled: row?.disabled ?? true,
})

/** 引擎对未知动作按拦截处理，这里保持一致 */
const normalizeAction = (value: unknown): AIBashGuardAction => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (text === 'ask' || text === 'confirm') return 'ask'
  if (text === 'warn' || text === 'warning') return 'warn'
  return 'deny'
}

const normalizeMatch = (value: unknown): AIBashGuardMatch => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return text === 'exact' || text === 'prefix' ? text : 'regex'
}

export const parseStoredRules = (raw: string): { rules: AIBashGuardStoredRule[]; error?: string } => {
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
    rules.push({
      pattern,
      action: normalizeAction(record.action),
      match: normalizeMatch(record.match),
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      // 与引擎一致：只有显式 false 才表示启用
      disabled: record.disabled !== false,
    })
  }
  return { rules }
}

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
      // 引擎对缺失的 disabled 按关闭处理，必须显式写入
      disabled: row.disabled,
    }
  })

export type AIBashGuardRuleValidationError =
  | { code: 'patternRequired'; uid: string }
  | { code: 'patternSyntax'; uid: string; message: string }
  | { code: 'patternLookaround'; uid: string }
  | { code: 'patternBackreference'; uid: string }
  | { code: 'patternDuplicate'; uid: string; pattern: string }

/** Go RE2 不支持零宽断言与反向引用，提前拦截，避免规则保存后被引擎静默跳过 */
const RE2_UNSUPPORTED: { test: RegExp; code: 'patternLookaround' | 'patternBackreference' }[] = [
  { test: /\(\?<?[=!]/, code: 'patternLookaround' },
  { test: /\\[1-9]/, code: 'patternBackreference' },
]

/** 保存前校验：内容非空；正则额外校验语法与 RE2 兼容性；同匹配方式下不允许重复 */
export const validateRuleRows = (rows: AIBashGuardRuleRow[]): AIBashGuardRuleValidationError[] => {
  const errors: AIBashGuardRuleValidationError[] = []
  const seen = new Set<string>()
  rows.forEach((row) => {
    const pattern = row.pattern.trim()
    if (!pattern) {
      errors.push({ code: 'patternRequired', uid: row.uid })
      return
    }
    if (row.match === 'regex') {
      for (const rule of RE2_UNSUPPORTED) {
        if (rule.test.test(pattern)) {
          errors.push({ code: rule.code, uid: row.uid })
          return
        }
      }
      try {
        new RegExp(pattern)
      } catch (error) {
        errors.push({ code: 'patternSyntax', uid: row.uid, message: `${error}` })
        return
      }
    }
    const duplicateKey = `${row.match}\u0000${pattern}`
    if (seen.has(duplicateKey)) {
      errors.push({ code: 'patternDuplicate', uid: row.uid, pattern })
      return
    }
    seen.add(duplicateKey)
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

/** 从引擎读取规则（GetKey 走 profile 数据库） */
export const readRulesFromEngine = async (): Promise<{ rows: AIBashGuardRuleRow[]; error?: string }> => {
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
