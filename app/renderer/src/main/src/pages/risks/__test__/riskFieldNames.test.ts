import { describe, expect, it } from 'vitest'
import { getRiskFieldLabel, mergeFieldNames } from '../riskFieldNames'

describe('风险分组显示名称', () => {
  it('优先展示名称，缺失或纯空白时回退原始名称', () => {
    expect(getRiskFieldLabel({ Name: 'sqli', Verbose: 'SQL注入' })).toBe('SQL注入')
    expect(getRiskFieldLabel({ Name: 'info', Verbose: '' })).toBe('info')
    expect(getRiskFieldLabel({ Name: 'custom', Verbose: '  ' })).toBe('custom')
  })

  it('不把不同原始类型合并为空选项，并保留正常分组的所有原始值', () => {
    const fields = [
      { Name: 'info', Verbose: '', Total: 3, Delta: 0 },
      { Name: 'custom', Verbose: ' ', Total: 1, Delta: 0 },
      { Name: 'sqli', Verbose: 'SQL注入', Total: 2, Delta: 0 },
      { Name: 'sql-injection', Verbose: 'SQL注入', Total: 4, Delta: 0 },
      { Name: '', Verbose: '', Total: 1, Delta: 0 },
    ]
    expect(mergeFieldNames({ Values: fields })).toEqual([
      { Names: ['info'], Verbose: 'info', Total: 3 },
      { Names: ['custom'], Verbose: 'custom', Total: 1 },
      { Names: ['sql-injection', 'sqli'], Verbose: 'SQL注入', Total: 6 },
    ])
    expect(fields[2].Total).toBe(2)
  })
})
