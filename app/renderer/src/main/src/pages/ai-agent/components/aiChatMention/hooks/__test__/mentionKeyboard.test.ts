import { describe, expect, it } from 'vitest'
import {
  resolveMentionArrowScroll,
  resolveMentionArrowSelect,
  resolveMentionVirtualScrollTop,
  shouldInterceptMentionEnter,
} from '../mentionKeyboard'

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

describe('resolveMentionArrowSelect', () => {
  it('向下 / 向上切换索引', () => {
    expect(resolveMentionArrowSelect({ currentIndex: 7, dataLength: 21, direction: 'down' })).toBe(8)
    expect(resolveMentionArrowSelect({ currentIndex: 3, dataLength: 21, direction: 'up' })).toBe(2)
  })

  it('顶部向上 / 底部向下 → 不切换', () => {
    expect(resolveMentionArrowSelect({ currentIndex: 0, dataLength: 5, direction: 'up' })).toBeNull()
    expect(resolveMentionArrowSelect({ currentIndex: 4, dataLength: 5, direction: 'down' })).toBeNull()
  })

  it('无选中（index < 0）→ 落在首项', () => {
    expect(resolveMentionArrowSelect({ currentIndex: -1, dataLength: 5, direction: 'down' })).toBe(0)
  })

  it('空列表 → null', () => {
    expect(resolveMentionArrowSelect({ currentIndex: 0, dataLength: 0, direction: 'down' })).toBeNull()
  })
})

describe('resolveMentionArrowScroll', () => {
  const container = { top: 0, bottom: 256 } // 8 * 32
  const h = 32

  it('可视区中部 → 不滚动', () => {
    // 第 4 项（0-based index 3）：top=96, bottom=128
    expect(
      resolveMentionArrowScroll({
        direction: 'down',
        containerRect: container,
        itemRect: { top: 96, bottom: 128, height: h },
      }),
    ).toEqual({ shouldScroll: false, delta: 0 })
  })

  it('向下：落到倒数第二（底边 = bottom - h）→ 不滚动', () => {
    expect(
      resolveMentionArrowScroll({
        direction: 'down',
        containerRect: container,
        itemRect: { top: 192, bottom: 224, height: h }, // bottom - h = 224
      }),
    ).toEqual({ shouldScroll: false, delta: 0 })
  })

  it('向下：越过倒数第二（进入最后一行）→ 滚动一个高度', () => {
    expect(
      resolveMentionArrowScroll({
        direction: 'down',
        containerRect: container,
        itemRect: { top: 224, bottom: 256, height: h },
      }),
    ).toEqual({ shouldScroll: true, delta: 32 })
  })

  it('向上：正数第二（顶边 = top + h）→ 不滚动', () => {
    expect(
      resolveMentionArrowScroll({
        direction: 'up',
        containerRect: container,
        itemRect: { top: 32, bottom: 64, height: h },
      }),
    ).toEqual({ shouldScroll: false, delta: 0 })
  })

  it('向上：越过正数第二（进入首行）→ 向上滚一个高度', () => {
    expect(
      resolveMentionArrowScroll({
        direction: 'up',
        containerRect: container,
        itemRect: { top: 0, bottom: 32, height: h },
      }),
    ).toEqual({ shouldScroll: true, delta: -32 })
  })
})

describe('resolveMentionVirtualScrollTop', () => {
  it('向下：选中落在倒数第二', () => {
    // visibleCount = floor(256/32)=8，nextIndex=10 → first = 10-(8-2)=4
    expect(
      resolveMentionVirtualScrollTop({
        nextIndex: 10,
        clientHeight: 256,
        itemHeight: 32,
        direction: 'down',
      }),
    ).toBe(128)
  })

  it('向上：选中落在正数第二', () => {
    expect(
      resolveMentionVirtualScrollTop({
        nextIndex: 5,
        clientHeight: 256,
        itemHeight: 32,
        direction: 'up',
      }),
    ).toBe(128) // (5-1)*32
  })
})
