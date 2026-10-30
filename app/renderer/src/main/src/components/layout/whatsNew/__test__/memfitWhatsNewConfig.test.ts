import { describe, expect, it } from 'vitest'
import { compareWhatsNewVersion, normalizeWhatsNewVersion, shouldShowMemfitWhatsNew } from '../memfitWhatsNewConfig'

const items = [{ title: 't', description: 'd' }]

describe('shouldShowMemfitWhatsNew', () => {
  it('非 memfit 不弹', () => {
    expect(
      shouldShowMemfitWhatsNew({
        isMemfit: false,
        enabled: true,
        targetVersion: '1.4.9-1023',
        currentVersion: '1.4.9-1023',
        items,
      }),
    ).toBe(false)
  })

  it('代码关闭时不弹', () => {
    expect(
      shouldShowMemfitWhatsNew({
        isMemfit: true,
        enabled: false,
        targetVersion: '1.4.9-1023',
        currentVersion: '1.4.9-1023',
        items,
      }),
    ).toBe(false)
  })

  it('本机版本低于说明版本不弹', () => {
    expect(
      shouldShowMemfitWhatsNew({
        isMemfit: true,
        enabled: true,
        targetVersion: '1.4.9-1023',
        currentVersion: '1.4.8-0901',
        items,
      }),
    ).toBe(false)
  })

  it('跳过说明版本直接装更新版且未确认则弹', () => {
    expect(
      shouldShowMemfitWhatsNew({
        isMemfit: true,
        enabled: true,
        targetVersion: '1.4.9-1023',
        currentVersion: '1.4.9-1024',
        items,
      }),
    ).toBe(true)
  })

  it('已确认说明版本后再升版本不弹', () => {
    expect(
      shouldShowMemfitWhatsNew({
        isMemfit: true,
        enabled: true,
        targetVersion: '1.4.9-1023',
        currentVersion: '1.4.9-1024',
        ackVersion: '1.4.9-1023',
        items,
      }),
    ).toBe(false)
  })

  it('无更新内容不弹', () => {
    expect(
      shouldShowMemfitWhatsNew({
        isMemfit: true,
        enabled: true,
        targetVersion: '1.4.9-1023',
        currentVersion: '1.4.9-1023',
        items: [],
      }),
    ).toBe(false)
  })

  it('已点过当前版本不弹', () => {
    expect(
      shouldShowMemfitWhatsNew({
        isMemfit: true,
        enabled: true,
        targetVersion: '1.4.9-1023',
        currentVersion: '1.4.9-1023',
        ackVersion: 'v1.4.9-1023',
        items,
      }),
    ).toBe(false)
  })

  it('版本匹配且未确认则弹', () => {
    expect(
      shouldShowMemfitWhatsNew({
        isMemfit: true,
        enabled: true,
        targetVersion: 'v1.4.9-1023',
        currentVersion: '1.4.9-1023',
        ackVersion: '1.4.8-0901',
        items,
      }),
    ).toBe(true)
  })
})

describe('normalizeWhatsNewVersion', () => {
  it('去掉 v 前缀和空白', () => {
    expect(normalizeWhatsNewVersion(' v1.4.9-1023 ')).toBe('1.4.9-1023')
  })
})

describe('compareWhatsNewVersion', () => {
  it('比较带日期后缀的版本', () => {
    expect(compareWhatsNewVersion('1.4.9-1024', '1.4.9-1023')).toBe(1)
    expect(compareWhatsNewVersion('1.4.9-1023', '1.4.9-1023')).toBe(0)
    expect(compareWhatsNewVersion('1.4.8-0901', '1.4.9-1023')).toBe(-1)
  })
})
