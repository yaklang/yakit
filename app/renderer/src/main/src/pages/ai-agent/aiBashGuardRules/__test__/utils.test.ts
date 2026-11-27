import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_BASH_GUARD_REGEX_RULES_KEY,
  createRuleRow,
  parseStoredRules,
  readRulesFromEngine,
  rowsToStoredRules,
  validateRuleRows,
  writeRulesToEngine,
} from '../utils'

describe('规则行转换', () => {
  it('新建规则默认为正则 + 拦截 + 关闭', () => {
    const row = createRuleRow()
    expect(row).toMatchObject({ pattern: '', action: 'deny', match: 'regex', disabled: true })
    expect(row.uid).not.toBe(createRuleRow().uid)
  })

  it('解析引擎数据：补默认值、归一化动作、丢掉空正则', () => {
    const invalid = parseStoredRules('{')
    expect(invalid.rules).toEqual([])
    expect(invalid.error).toBeTruthy()
    expect(parseStoredRules('{}').error).toBe('rootMustBeArray')

    const { rules } = parseStoredRules(
      JSON.stringify([
        {
          name: 'deny-rm',
          pattern: 'rm\\s+-rf\\s+/',
          action: 'deny',
          match: 'exact',
          description: '禁止删根',
          disabled: false,
        },
        { pattern: 'curl\\s+http', action: 'confirm' },
        { pattern: '   ', action: 'deny' },
      ]),
    )
    expect(rules).toEqual([
      {
        name: 'deny-rm',
        pattern: 'rm\\s+-rf\\s+/',
        action: 'deny',
        match: 'exact',
        description: '禁止删根',
        disabled: false,
      },
      { pattern: 'curl\\s+http', action: 'ask', match: 'regex', disabled: true },
    ])
  })

  it('序列化时去掉空白与空可选字段', () => {
    const rows = [createRuleRow({ pattern: ' rm ', action: 'warn', name: ' ', description: ' ', disabled: false })]
    expect(rowsToStoredRules(rows)).toEqual([{ pattern: 'rm', action: 'warn', match: 'regex', disabled: false }])
  })
})

describe('保存前校验', () => {
  it('空内容、重复项、RE2 不支持的断言与语法错误分别报错', () => {
    const rows = [
      createRuleRow({ pattern: '' }),
      createRuleRow({ pattern: 'rm' }),
      createRuleRow({ pattern: 'rm' }),
      createRuleRow({ pattern: '(?=x)' }),
      createRuleRow({ pattern: 'a\\1' }),
      createRuleRow({ pattern: '(' }),
    ]
    expect(validateRuleRows(rows).map((error) => error.code)).toEqual([
      'patternRequired',
      'patternDuplicate',
      'patternLookaround',
      'patternBackreference',
      'patternSyntax',
    ])
  })

  it('同内容不同匹配方式允许共存', () => {
    expect(
      validateRuleRows([
        createRuleRow({ pattern: 'ls', match: 'exact' }),
        createRuleRow({ pattern: 'ls', match: 'prefix' }),
      ]),
    ).toEqual([])
  })
})

describe('引擎读写', () => {
  const originalRequire = (window as any).require

  afterEach(() => {
    ;(window as any).require = originalRequire
  })

  it('GetKey 读取并还原为行', async () => {
    const invoke = vi.fn(async () => JSON.stringify([{ pattern: 'rm', action: 'deny', disabled: false }]))
    ;(window as any).require = () => ({ ipcRenderer: { invoke } })
    const { rows, error } = await readRulesFromEngine()
    expect(error).toBeUndefined()
    expect(invoke).toHaveBeenCalledWith('GetKey', { Key: AI_BASH_GUARD_REGEX_RULES_KEY })
    expect(rows[0]).toMatchObject({ pattern: 'rm', action: 'deny', disabled: false })
  })

  it('SetKey 写入序列化后的规则', async () => {
    const invoke = vi.fn(async () => undefined)
    ;(window as any).require = () => ({ ipcRenderer: { invoke } })
    await writeRulesToEngine([createRuleRow({ pattern: 'rm', disabled: false })])
    expect(invoke).toHaveBeenCalledWith('SetKey', {
      Key: AI_BASH_GUARD_REGEX_RULES_KEY,
      Value: JSON.stringify([{ pattern: 'rm', action: 'deny', match: 'regex', disabled: false }]),
    })
  })

  it('缺少 ipcRenderer 时读取报错', async () => {
    ;(window as any).require = undefined
    const { rows, error } = await readRulesFromEngine()
    expect(rows).toEqual([])
    expect(error).toBe('ipcUnavailable')
  })
})
