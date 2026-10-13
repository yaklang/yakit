import { describe, expect, it } from 'vitest'
import { parseIntranetYakitVersionFromPath } from '../parseIntranetYakitVersion'

describe('parseIntranetYakitVersionFromPath', () => {
  it('按当前发行版名解析版本号', () => {
    expect(
      parseIntranetYakitVersionFromPath('D:/release/EnpriTraceAgent-1.4.10-windows-amd64.exe', 'EnpriTraceAgent'),
    ).toBe('v1.4.10')
    expect(
      parseIntranetYakitVersionFromPath('D:/release/IRify-EnpriTrace-1.4.11-windows-amd64.exe', 'IRify-EnpriTrace'),
    ).toBe('v1.4.11')
    // 发行版名去空白后与包名对齐（Memfit AI → MemfitAI）
    expect(parseIntranetYakitVersionFromPath('D:/release/MemfitAI-2.0.1-darwin-arm64.dmg', 'Memfit AI')).toBe('v2.0.1')
  })

  it('当前发行版名未命中时回退 EnpriTrace- 旧包名', () => {
    expect(parseIntranetYakitVersionFromPath('D:/release/EnpriTrace-1.4.9-windows-amd64.exe', 'Yakit')).toBe('v1.4.9')
    expect(parseIntranetYakitVersionFromPath('D:/release/EnpriTrace-1.4.9-windows-amd64.exe', 'IRify-EnpriTrace')).toBe(
      'v1.4.9',
    )
  })

  it('去掉版本段末尾多余的 -', () => {
    expect(parseIntranetYakitVersionFromPath('D:/release/EnpriTrace-1.4.9-', 'EnpriTrace')).toBe('v1.4.9')
  })

  it('无匹配时返回空串而不是伪版本 v', () => {
    expect(parseIntranetYakitVersionFromPath('D:/release/unknown-package.exe', 'EnpriTrace')).toBe('')
    expect(parseIntranetYakitVersionFromPath('', 'EnpriTrace')).toBe('')
  })
})
