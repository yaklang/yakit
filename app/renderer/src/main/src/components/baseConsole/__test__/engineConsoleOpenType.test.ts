import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ENGINE_CONSOLE_OPEN_TYPE,
  ENGINE_CONSOLE_OPEN_TYPES,
  resolveConsoleOpenEffects,
  resolveEngineConsoleOpenType,
} from '../engineConsoleOpenType'

describe('resolveEngineConsoleOpenType 偏好恢复与读取失败回退', () => {
  it.each(ENGINE_CONSOLE_OPEN_TYPES)('合法偏好值 %s 原样返回（用于菜单标记恢复）', (type) => {
    expect(resolveEngineConsoleOpenType(type)).toBe(type)
  })

  it('空字符串回退默认浮窗', () => {
    expect(resolveEngineConsoleOpenType('')).toBe('float')
  })

  it('undefined（KV 读取返回空值）回退默认浮窗', () => {
    expect(resolveEngineConsoleOpenType(undefined)).toBe('float')
  })

  it('null（读取失败返回 null）回退默认浮窗', () => {
    expect(resolveEngineConsoleOpenType(null)).toBe('float')
  })

  it('非法 / 脏值回退默认浮窗，避免脏数据撑开非法菜单项', () => {
    expect(resolveEngineConsoleOpenType('top')).toBe('float')
    expect(resolveEngineConsoleOpenType('FLOAT')).toBe('float')
    expect(resolveEngineConsoleOpenType('left right')).toBe('float')
  })

  it('支持自定义 fallback', () => {
    expect(resolveEngineConsoleOpenType(undefined, 'left')).toBe('left')
    expect(resolveEngineConsoleOpenType('garbage', 'bottom')).toBe('bottom')
  })

  it('DEFAULT_ENGINE_CONSOLE_OPEN_TYPE 为浮窗', () => {
    expect(DEFAULT_ENGINE_CONSOLE_OPEN_TYPE).toBe('float')
  })
})

describe('resolveConsoleOpenEffects 浮窗与抽屉互斥', () => {
  it('浮窗：收起抽屉且不关闭浮窗窗口本身', () => {
    expect(resolveConsoleOpenEffects('float')).toEqual({ closeFloatWindow: false, drawerDirection: null })
  })

  it.each(['left', 'right', 'bottom'] as const)('抽屉 %s：关闭浮窗独立窗口并展开对应方向', (type) => {
    expect(resolveConsoleOpenEffects(type)).toEqual({ closeFloatWindow: true, drawerDirection: type })
  })

  it('浮窗与抽屉方向互斥：浮窗 drawerDirection 为 null，任一抽屉非 null', () => {
    const float = resolveConsoleOpenEffects('float')
    expect(float.drawerDirection).toBeNull()
    for (const type of ['left', 'right', 'bottom'] as const) {
      expect(resolveConsoleOpenEffects(type).drawerDirection).not.toBeNull()
    }
  })
})
