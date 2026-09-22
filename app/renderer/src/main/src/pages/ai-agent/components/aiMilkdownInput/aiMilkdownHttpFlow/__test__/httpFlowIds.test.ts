import { describe, expect, it } from 'vitest'
import { parseHttpFlowIds } from '../httpFlowIds'

describe('parseHttpFlowIds', () => {
  it('未传参数或传入 undefined 时返回空数组', () => {
    expect(parseHttpFlowIds()).toEqual([])
    expect(parseHttpFlowIds(undefined)).toEqual([])
  })

  it.each<{ name: string; input: string | string[] }>([
    { name: '空字符串', input: '' },
    { name: '仅包含分隔符和空白的字符串', input: ', ,\t,\n,' },
    { name: '空数组', input: [] },
    { name: '仅包含空白项的数组', input: ['', ' ', '\t\n'] },
  ])('$name 返回空数组', ({ input }) => {
    expect(parseHttpFlowIds(input)).toEqual([])
  })

  it('字符串按逗号分隔，trim 后去空去重并保留首次出现的顺序', () => {
    expect(parseHttpFlowIds(' 3,1, 3 , ,\t2\n,1,')).toEqual(['3', '1', '2'])
  })

  it('数组逐项 trim 后去空去重，不修改输入数组', () => {
    const input = [' 3 ', '1', '\t3\n', '', ' ', '2', '1']
    const original = [...input]

    expect(parseHttpFlowIds(input)).toEqual(['3', '1', '2'])
    expect(input).toEqual(original)
  })

  it('保留 ID 的字符串形式，不将零或前导零当作空值或重复项', () => {
    expect(parseHttpFlowIds('0,01,1, 0 ,01')).toEqual(['0', '01', '1'])
    expect(parseHttpFlowIds(['0', '01', '1', ' 0 ', '01'])).toEqual(['0', '01', '1'])
  })
})
