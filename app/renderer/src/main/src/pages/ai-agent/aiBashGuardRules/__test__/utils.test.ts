import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  AI_BASH_GUARD_REGEX_RULES_KEY,
  createRuleRow,
  normalizeAction,
  parseStoredRules,
  readRulesFromEngine,
  rowsToStoredRules,
  validateRuleRows,
  writeRulesToEngine,
} from '../utils'

const row = (patch: Parameters<typeof createRuleRow>[0]) => createRuleRow(patch)

describe('parseStoredRules', () => {
  it('空值表示尚未配置', () => {
    expect(parseStoredRules('')).toEqual({ rules: [] })
    expect(parseStoredRules('   ')).toEqual({ rules: [] })
  })

  it('解析引擎中的规则并过滤空正则', () => {
    const { rules, error } = parseStoredRules(
      JSON.stringify([
        { name: 'deny-rm', pattern: 'rm\\s+-rf\\s+/', action: 'deny', description: '禁止删根' },
        { pattern: 'curl\\s+http://', action: 'ask' },
        { pattern: 'chmod\\s+777', action: 'warn', disabled: true },
        { pattern: '   ', action: 'deny' },
      ]),
    )
    expect(error).toBeUndefined()
    expect(rules).toEqual([
      { name: 'deny-rm', pattern: 'rm\\s+-rf\\s+/', action: 'deny', description: '禁止删根' },
      { pattern: 'curl\\s+http://', action: 'ask' },
      { pattern: 'chmod\\s+777', action: 'warn', disabled: true },
    ])
  })

  it('未知动作按拦截处理，与引擎保持一致', () => {
    const { rules } = parseStoredRules(JSON.stringify([{ pattern: 'x', action: 'typo' }]))
    expect(rules).toEqual([{ pattern: 'x', action: 'deny' }])
  })

  it('非法 JSON 与非数组返回错误', () => {
    expect(parseStoredRules('[{').error).toBeTruthy()
    expect(parseStoredRules('{"a":1}').error).toBe('rootMustBeArray')
  })
})

describe('normalizeAction', () => {
  it('归一化动作别名', () => {
    expect(normalizeAction('deny')).toBe('deny')
    expect(normalizeAction('block')).toBe('deny')
    expect(normalizeAction('ASK')).toBe('ask')
    expect(normalizeAction('confirm')).toBe('ask')
    expect(normalizeAction('warning')).toBe('warn')
    expect(normalizeAction(undefined)).toBe('deny')
  })
})

describe('rowsToStoredRules', () => {
  it('裁剪空白并省略空的可选字段', () => {
    const stored = rowsToStoredRules([
      row({ name: '  ', pattern: '  rm -rf /  ', action: 'deny', description: '' }),
      row({ name: ' ask-curl ', pattern: 'curl http://', action: 'ask', description: '外发数据', disabled: true }),
    ])
    expect(stored).toEqual([
      { pattern: 'rm -rf /', action: 'deny' },
      {
        name: 'ask-curl',
        pattern: 'curl http://',
        action: 'ask',
        description: '外发数据',
        disabled: true,
      },
    ])
  })
})

describe('validateRuleRows', () => {
  it('校验通过时无错误', () => {
    expect(
      validateRuleRows([row({ pattern: 'rm\\s+-rf\\s+/' }), row({ pattern: 'curl\\s+http://', action: 'ask' })]),
    ).toEqual([])
  })

  it('空正则、语法错误、重复分别报错', () => {
    const rows = [
      row({ pattern: '   ' }),
      row({ pattern: '(unclosed' }),
      row({ pattern: 'rm -rf /' }),
      row({ pattern: 'rm -rf /', action: 'ask' }),
    ]
    const errors = validateRuleRows(rows)
    expect(errors.map((error) => error.code)).toEqual(['patternRequired', 'patternSyntax', 'patternDuplicate'])
    expect(errors[0].index).toBe(0)
    expect(errors[1].uid).toBe(rows[1].uid)
    expect(errors[2].uid).toBe(rows[3].uid)
  })

  it('拦下 RE2 不支持的零宽断言与反向引用', () => {
    const errors = validateRuleRows([
      row({ pattern: 'foo(?=bar)' }),
      row({ pattern: '(?<!foo)bar' }),
      row({ pattern: '(a)\\1' }),
    ])
    expect(errors.map((error) => error.code)).toEqual([
      'patternLookaround',
      'patternLookaround',
      'patternBackreference',
    ])
  })
})

describe('引擎读写', () => {
  const originalRequire = (window as any).require

  afterEach(() => {
    ;(window as any).require = originalRequire
  })

  it('readRulesFromEngine 通过 GetKey 读取并还原为行', async () => {
    const invoke = vi.fn(async () => JSON.stringify([{ pattern: 'rm -rf /', action: 'deny', name: 'demo' }]))
    ;(window as any).require = () => ({ ipcRenderer: { invoke } })
    const { rows, error } = await readRulesFromEngine()
    expect(error).toBeUndefined()
    expect(invoke).toHaveBeenCalledWith('GetKey', { Key: AI_BASH_GUARD_REGEX_RULES_KEY })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ pattern: 'rm -rf /', action: 'deny', name: 'demo', disabled: false })
    expect(rows[0].uid).toBeTruthy()
  })

  it('readRulesFromEngine 在缺失 IPC 时返回错误而不是抛异常', async () => {
    ;(window as any).require = () => undefined
    const { rows, error } = await readRulesFromEngine()
    expect(rows).toEqual([])
    expect(error).toBe('ipcUnavailable')
  })

  it('writeRulesToEngine 将落库结构写入 SetKey', async () => {
    const invoke = vi.fn(async () => ({}))
    ;(window as any).require = () => ({ ipcRenderer: { invoke } })
    await writeRulesToEngine([row({ pattern: ' chmod 777 ', action: 'warn' })])
    expect(invoke).toHaveBeenCalledWith('SetKey', {
      Key: AI_BASH_GUARD_REGEX_RULES_KEY,
      Value: JSON.stringify([{ pattern: 'chmod 777', action: 'warn' }]),
    })
  })

  it('缺失 IPC 时 writeRulesToEngine 抛出异常', async () => {
    ;(window as any).require = () => undefined
    await expect(writeRulesToEngine([row({ pattern: 'x' })])).rejects.toThrow()
  })
})
