import { renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useInViewport: () => [true],
  }
})

import useSwitchSelectByKeyboard from '../useSwitchSelectByKeyboard'

type Item = { id: string }

const makeData = (n: number): Item[] => Array.from({ length: n }, (_, i) => ({ id: `${i}` }))

const KEY_UP = 38
const KEY_DOWN = 40
const KEY_ENTER = 13

/** jsdom 无布局：ahooks 按 keyCode 匹配别名且要求 event.key 非空，keyCode 需挂到事件实例上 */
const fireKey = (target: HTMLElement, keyCode: number, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  Object.defineProperty(event, 'keyCode', { get: () => keyCode })
  target.dispatchEvent(event)
  return event
}

interface SetupOptions {
  data: Item[]
  selected?: Item
  enabled?: boolean
  /** 模拟滚动容器；false 时 ref.current 为 null（容器未挂载） */
  withContainer?: boolean
  clientHeight?: number
  containerRect?: { top: number; bottom: number }
  itemRect?: { top: number; bottom: number; height: number }
  mountedRowIds?: string[]
  onEnter?: () => void
}

const setup = (options: SetupOptions) => {
  const onSelectNumber = vi.fn()
  const onEnter = options.onEnter || vi.fn()
  const keyboardTarget = document.body.appendChild(document.createElement('div'))

  let ref: RefObject<HTMLDivElement | null> = { current: null }
  if (options.withContainer) {
    const container = document.body.appendChild(document.createElement('div'))
    if (options.clientHeight != null) {
      Object.defineProperty(container, 'clientHeight', { value: options.clientHeight, configurable: true })
    }
    if (options.containerRect) {
      container.getBoundingClientRect = () => options.containerRect as DOMRect
    }
    ;(options.mountedRowIds || []).forEach((id) => {
      const row = container.appendChild(document.createElement('div'))
      row.id = `row-${id}`
      if (options.itemRect) row.getBoundingClientRect = () => options.itemRect as DOMRect
    })
    ref = { current: container }
  }

  const utils = renderHook(() =>
    useSwitchSelectByKeyboard<Item>(ref, {
      data: options.data,
      selected: options.selected,
      rowKey: (item) => `row-${item.id}`,
      onSelectNumber,
      onEnter,
      getContainer: () => keyboardTarget,
      enabled: options.enabled,
    }),
  )

  return { onSelectNumber, onEnter, keyboardTarget, container: ref.current, unmount: utils.unmount }
}

describe('useSwitchSelectByKeyboard', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无选中按向下键 → 选中首项并允许回调兜底滚动', () => {
    const data = makeData(3)
    const { onSelectNumber, keyboardTarget } = setup({ data, selected: undefined })
    fireKey(keyboardTarget, KEY_DOWN, 'ArrowDown')
    expect(onSelectNumber).toHaveBeenCalledWith(0, true)
  })

  it('选中项不在数据中 → 落回首项', () => {
    const data = makeData(3)
    const { onSelectNumber, keyboardTarget } = setup({ data, selected: { id: 'ghost' }, withContainer: true })
    fireKey(keyboardTarget, KEY_DOWN, 'ArrowDown')
    expect(onSelectNumber).toHaveBeenCalledWith(0, false)
  })

  it('目标行已挂载且未越底部缓冲线 → 只切换不滚动', () => {
    const data = makeData(3)
    const { onSelectNumber, container, keyboardTarget } = setup({
      data,
      selected: data[0],
      withContainer: true,
      mountedRowIds: ['1'],
      containerRect: { top: 0, bottom: 256 },
      itemRect: { top: 32, bottom: 64, height: 32 },
    })
    fireKey(keyboardTarget, KEY_DOWN, 'ArrowDown')
    expect(onSelectNumber).toHaveBeenCalledWith(1, false)
    expect(container?.scrollTop).toBe(0)
  })

  it('目标行已挂载且越过底部缓冲线 → 容器滚动 delta', () => {
    const data = makeData(3)
    const { onSelectNumber, container, keyboardTarget } = setup({
      data,
      selected: data[0],
      withContainer: true,
      mountedRowIds: ['1'],
      containerRect: { top: 0, bottom: 256 },
      itemRect: { top: 256, bottom: 288, height: 32 },
    })
    fireKey(keyboardTarget, KEY_DOWN, 'ArrowDown')
    // delta = 288 - (256 - 32) = 64
    expect(container?.scrollTop).toBe(64)
    expect(onSelectNumber).toHaveBeenCalledWith(1, false)
  })

  it('虚拟列表目标行未挂载（向下）→ 按固定行高估算 scrollTop', () => {
    const data = makeData(30)
    const { onSelectNumber, container, keyboardTarget } = setup({
      data,
      selected: data[9],
      withContainer: true,
      clientHeight: 256,
    })
    fireKey(keyboardTarget, KEY_DOWN, 'ArrowDown')
    // visibleCount=8，targetFirst = 10-(8-2) = 4 → 4*32
    expect(container?.scrollTop).toBe(128)
    expect(onSelectNumber).toHaveBeenCalledWith(10, false)
  })

  it('虚拟列表目标行未挂载（向上）→ 选中落在正数第二', () => {
    const data = makeData(30)
    const { onSelectNumber, container, keyboardTarget } = setup({
      data,
      selected: data[5],
      withContainer: true,
      clientHeight: 256,
    })
    fireKey(keyboardTarget, KEY_UP, 'ArrowUp')
    // (4-1)*32
    expect(container?.scrollTop).toBe(96)
    expect(onSelectNumber).toHaveBeenCalledWith(4, false)
  })

  it('容器未挂载 → 交由回调兜底滚动（isScroll=true）', () => {
    const data = makeData(3)
    const { onSelectNumber, keyboardTarget } = setup({ data, selected: data[0] })
    fireKey(keyboardTarget, KEY_DOWN, 'ArrowDown')
    expect(onSelectNumber).toHaveBeenCalledWith(1, true)
  })

  it('首行向上 / 尾行向下 → 不切换', () => {
    const data = makeData(3)
    const topEdge = setup({ data, selected: data[0], withContainer: true })
    fireKey(topEdge.keyboardTarget, KEY_UP, 'ArrowUp')
    expect(topEdge.onSelectNumber).not.toHaveBeenCalled()

    const bottomEdge = setup({ data, selected: data[2], withContainer: true })
    fireKey(bottomEdge.keyboardTarget, KEY_DOWN, 'ArrowDown')
    expect(bottomEdge.onSelectNumber).not.toHaveBeenCalled()
  })

  it('Enter：有数据有选中 → 拦截默认行为并触发 onEnter', () => {
    const data = makeData(1)
    const { onEnter, keyboardTarget } = setup({ data, selected: data[0] })
    const event = fireKey(keyboardTarget, KEY_ENTER, 'Enter')
    expect(event.defaultPrevented).toBe(true)
    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('enabled=false → 方向键不响应', () => {
    const data = makeData(3)
    const { onSelectNumber, keyboardTarget } = setup({ data, selected: data[0], enabled: false })
    fireKey(keyboardTarget, KEY_DOWN, 'ArrowDown')
    expect(onSelectNumber).not.toHaveBeenCalled()
  })
})
