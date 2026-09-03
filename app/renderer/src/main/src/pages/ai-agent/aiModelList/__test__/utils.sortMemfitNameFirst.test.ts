import { describe, expect, it } from 'vitest'
// 先于被测模块注册 window.require('electron') stub（utils 顶层会解构 ipcRenderer）
import '../../../ai-re-act/hooks/__test__/setupElectron'
import { sortMemfitNameFirst } from '../utils'

describe('sortMemfitNameFirst', () => {
  it('memfit- 开头的名称前置，其余在后', () => {
    expect(sortMemfitNameFirst(['gpt-4o', 'memfit-writer', 'claude', 'memfit-rag'])).toEqual([
      'memfit-writer',
      'memfit-rag',
      'gpt-4o',
      'claude',
    ])
  })

  it('稳定排序：两组内部保持原相对顺序', () => {
    expect(sortMemfitNameFirst(['a', 'memfit-b', 'c', 'memfit-a', 'b', 'memfit-c'])).toEqual([
      'memfit-b',
      'memfit-a',
      'memfit-c',
      'a',
      'c',
      'b',
    ])
  })

  it('全为 memfit 或全非 memfit 时原样返回', () => {
    expect(sortMemfitNameFirst(['memfit-a', 'memfit-b'])).toEqual(['memfit-a', 'memfit-b'])
    expect(sortMemfitNameFirst(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('空数组返回空数组', () => {
    expect(sortMemfitNameFirst([])).toEqual([])
  })

  it('仅前缀 memfit- 计入前组（大小写敏感，与 isMemfitStart 口径一致）', () => {
    expect(sortMemfitNameFirst(['Memfit-x', 'memfit-y', 'x'])).toEqual(['memfit-y', 'Memfit-x', 'x'])
    expect(sortMemfitNameFirst(['memfit', 'memfit-x'])).toEqual(['memfit-x', 'memfit'])
  })
})
