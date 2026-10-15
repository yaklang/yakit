import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type React from 'react'
import { useEffect, useState } from 'react'
import emiter from '@/utils/eventBus/eventBus'
import { useContextMenuBoot } from '../useContextMenuBoot'
import type { RunContextMenuActionOptions } from '@/pages/manageRightClickPlugins/types'

const makeOptions = (id: string) => ({ action: { Id: id }, executionID: id }) as unknown as RunContextMenuActionOptions

let replayFn: (() => void) | null = null
const received: RunContextMenuActionOptions[] = []

/**
 * 模拟 UILayout + ContextMenuExecutionHost 的真实协作：
 * hostOn 翻转后挂载「宿主」，宿主按真实契约先注册监听、再调 onReady（replay）。
 */
const Harness: React.FC = () => {
  const { hostOn, replay } = useContextMenuBoot()
  replayFn = replay
  useEffect(() => {
    if (!hostOn) return
    const handler = (options: RunContextMenuActionOptions) => received.push(options)
    emiter.on('runContextMenuAction', handler)
    // 与 ContextMenuExecutionHost 一致：监听已挂上才宣告就绪
    replay()
    return () => {
      emiter.off('runContextMenuAction', handler)
    }
  }, [hostOn])
  return <div data-testid="host-on">{String(hostOn)}</div>
}

/**
 * 模拟 Suspense：hostOn 后延迟再挂监听，拉长「已唤醒、监听未就绪」窗口。
 */
const DelayedHarness: React.FC = () => {
  const { hostOn, replay } = useContextMenuBoot()
  replayFn = replay
  const [listenerOn, setListenerOn] = useState(false)
  useEffect(() => {
    if (!hostOn) return
    const t = window.setTimeout(() => setListenerOn(true), 30)
    return () => window.clearTimeout(t)
  }, [hostOn])
  useEffect(() => {
    if (!listenerOn) return
    const handler = (options: RunContextMenuActionOptions) => received.push(options)
    emiter.on('runContextMenuAction', handler)
    replay()
    return () => {
      emiter.off('runContextMenuAction', handler)
    }
  }, [listenerOn])
  return (
    <div>
      <div data-testid="host-on">{String(hostOn)}</div>
      <div data-testid="listener-on">{String(listenerOn)}</div>
    </div>
  )
}

describe('useContextMenuBoot 右键宿主首发事件回放', () => {
  beforeEach(() => {
    received.length = 0
    replayFn = null
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('首发事件被暂存并唤醒宿主，onReady 回放恰好一次', async () => {
    render(<Harness />)
    expect(screen.getByTestId('host-on').textContent).toBe('false')

    const first = makeOptions('first')
    act(() => {
      emiter.emit('runContextMenuAction', first)
    })
    await waitFor(() => {
      expect(screen.getByTestId('host-on').textContent).toBe('true')
    })
    // 宿主就绪后经 replay 收到首发事件，且只收到一次
    expect(received).toEqual([first])

    // 暂存已清空：再次 onReady 不重复投递
    act(() => {
      replayFn?.()
    })
    expect(received).toEqual([first])
  })

  it('宿主已挂载后，后续事件直达宿主监听、不再走唤醒分支', async () => {
    render(<Harness />)
    const first = makeOptions('first')
    act(() => {
      emiter.emit('runContextMenuAction', first)
    })
    await waitFor(() => {
      expect(received).toEqual([first])
    })

    const second = makeOptions('second')
    act(() => {
      emiter.emit('runContextMenuAction', second)
    })
    expect(received).toEqual([first, second])
    // hostOn 不来回翻转（无重复挂载）
    expect(screen.getByTestId('host-on').textContent).toBe('true')
  })

  it('onReady 在暂存为空时是幂等空操作', async () => {
    render(<Harness />)
    // 从未有过事件，宿主不会挂载；replay 直接调用也不抛错、不 emit
    act(() => {
      replayFn?.()
    })
    expect(screen.getByTestId('host-on').textContent).toBe('false')
    expect(received).toEqual([])
  })

  it('宿主加载窗口内二次 emit 全部入队，就绪后一次性 flush', async () => {
    render(<DelayedHarness />)
    const first = makeOptions('first')
    const second = makeOptions('second')

    act(() => {
      emiter.emit('runContextMenuAction', first)
    })
    await waitFor(() => {
      expect(screen.getByTestId('host-on').textContent).toBe('true')
    })
    // Suspense 窗口：宿主已唤醒但监听未挂上
    expect(screen.getByTestId('listener-on').textContent).toBe('false')
    expect(received).toEqual([])

    act(() => {
      emiter.emit('runContextMenuAction', second)
    })
    // 仍未就绪前不应投递
    expect(received).toEqual([])

    await waitFor(() => {
      expect(screen.getByTestId('listener-on').textContent).toBe('true')
    })
    await waitFor(() => {
      expect(received).toEqual([first, second])
    })
  })
})
