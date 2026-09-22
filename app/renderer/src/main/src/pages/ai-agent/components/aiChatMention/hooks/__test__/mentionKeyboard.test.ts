import { describe, expect, it } from 'vitest'
import { shouldInterceptMentionEnter } from '../mentionKeyboard'

describe('shouldInterceptMentionEnter', () => {
  it('启用且有数据有选中 → 拦截', () => {
    expect(
      shouldInterceptMentionEnter({
        enabled: true,
        inViewport: true,
        dataLength: 3,
        hasSelected: true,
      }),
    ).toBe(true)
  })

  it.each([
    ['enabled=false', { enabled: false, inViewport: true, dataLength: 3, hasSelected: true }],
    ['不在视口', { enabled: true, inViewport: false, dataLength: 3, hasSelected: true }],
    ['空结果', { enabled: true, inViewport: true, dataLength: 0, hasSelected: false }],
    ['有数据但无选中', { enabled: true, inViewport: true, dataLength: 2, hasSelected: false }],
  ])('%s → 放行 Enter', (_label, params) => {
    expect(shouldInterceptMentionEnter(params)).toBe(false)
  })

  it('默认 enabled/inViewport 为 true', () => {
    expect(shouldInterceptMentionEnter({ dataLength: 1, hasSelected: true })).toBe(true)
    expect(shouldInterceptMentionEnter({ dataLength: 0, hasSelected: false })).toBe(false)
  })
})
