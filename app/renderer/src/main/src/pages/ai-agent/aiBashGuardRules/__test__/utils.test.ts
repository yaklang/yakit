import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  AI_BASH_GUARD_REGEX_RULES_KEY,
  createRuleRow,
  normalizeAction,
  normalizeMatch,
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
      { name: 'deny-rm', pattern: 'rm\\s+-rf\\s+/', action: 'deny', match: 'regex', description: '禁止删根' },
      { pattern: 'curl\\s+http://', action: 'ask', match: 'regex' },
      { pattern: 'chmod\\s+777', action: 'warn', match: 'regex', disabled: true },
    ])
  })

  it('旧数据没有 match 时，纯命令名拦截按精确命令处理', () => {
    const { rules } = parseStoredRules(
      JSON.stringify([
        { pattern: 'ls', action: 'deny' },
        { pattern: 'curl', action: 'ask' },
      ]),
    )
    expect(rules).toEqual([
      { pattern: 'ls', action: 'deny', match: 'exact' },
      { pattern: 'curl', action: 'ask', match: 'regex' },
    ])
  })

  it('未知动作按拦截处理，与引擎保持一致', () => {
    const { rules } = parseStoredRules(JSON.stringify([{ pattern: 'x', action: 'typo' }]))
    expect(rules).toEqual([{ pattern: 'x', action: 'deny', match: 'exact' }])
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

describe('normalizeMatch', () => {
  it('优先使用显式匹配方式', () => {
    expect(normalizeMatch('exact', 'ls', 'deny')).toBe('exact')
    expect(normalizeMatch('prefix', 'ls', 'deny')).toBe('prefix')
    expect(normalizeMatch('regex', 'ls', 'deny')).toBe('regex')
    expect(normalizeMatch('command', 'ls', 'deny')).toBe('exact')
  })

  it('旧数据按动作和模式推断', () => {
    expect(normalizeMatch(undefined, 'ls', 'deny')).toBe('exact')
    expect(normalizeMatch(undefined, 'ls -la', 'deny')).toBe('regex')
    expect(normalizeMatch(undefined, 'ls', 'ask')).toBe('regex')
  })
})

describe('rowsToStoredRules', () => {
  it('裁剪空白并省略空的可选字段', () => {
    const stored = rowsToStoredRules([
      row({ name: '  ', pattern: '  rm -rf /  ', action: 'deny', description: '' }),
      row({ name: ' ask-curl ', pattern: 'curl http://', action: 'ask', description: '外发数据', disabled: true }),
    ])
    expect(stored).toEqual([
      { pattern: 'rm -rf /', action: 'deny', match: 'exact' },
      {
        name: 'ask-curl',
        pattern: 'curl http://',
        action: 'ask',
        match: 'exact',
        description: '外发数据',
        disabled: true,
      },
    ])
  })
})

describe('validateRuleRows', () => {
  it('校验通过时无错误', () => {
    expect(
      validateRuleRows([
        row({ pattern: 'rm\\s+-rf\\s+/', match: 'regex' }),
        row({ pattern: 'curl\\s+http://', action: 'ask', match: 'regex' }),
        row({ pattern: 'ls', match: 'exact' }),
        row({ pattern: 'git', match: 'prefix' }),
      ]),
    ).toEqual([])
  })

  it('空模式、正则语法错误、同匹配方式重复分别报错', () => {
    const rows = [
      row({ pattern: '   ' }),
      row({ pattern: '(unclosed', match: 'regex' }),
      row({ pattern: 'rm -rf /', match: 'exact' }),
      row({ pattern: 'rm -rf /', action: 'ask', match: 'exact' }),
    ]
    const errors = validateRuleRows(rows)
    expect(errors.map((error) => error.code)).toEqual(['patternRequired', 'patternSyntax', 'patternDuplicate'])
    expect(errors[0].index).toBe(0)
    expect(errors[1].uid).toBe(rows[1].uid)
    expect(errors[2].uid).toBe(rows[3].uid)
  })

  it('精确命令和前缀不按正则校验', () => {
    expect(
      validateRuleRows([
        row({ pattern: '(unclosed', match: 'exact' }),
        row({ pattern: 'foo(?=bar)', match: 'prefix' }),
      ]),
    ).toEqual([])
  })

  it('拦下正则模式下 RE2 不支持的零宽断言与反向引用', () => {
    const errors = validateRuleRows([
      row({ pattern: 'foo(?=bar)', match: 'regex' }),
      row({ pattern: '(?<!foo)bar', match: 'regex' }),
      row({ pattern: '(a)\\1', match: 'regex' }),
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
    expect(rows[0]).toMatchObject({
      pattern: 'rm -rf /',
      action: 'deny',
      match: 'regex',
      name: 'demo',
      disabled: false,
    })
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
      Value: JSON.stringify([{ pattern: 'chmod 777', action: 'warn', match: 'exact' }]),
    })
  })

  it('缺失 IPC 时 writeRulesToEngine 抛出异常', async () => {
    ;(window as any).require = () => undefined
    await expect(writeRulesToEngine([row({ pattern: 'x' })])).rejects.toThrow()
  })
})
