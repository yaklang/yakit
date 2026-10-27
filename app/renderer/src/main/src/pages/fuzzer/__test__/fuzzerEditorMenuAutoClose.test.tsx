import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFuzzerEditorMenuAutoClose } from '../fuzzerEditorMenuBar'

/** jsdom 不实现 elementsFromPoint，vi.spyOn 会直接抛；用 defineProperty 挂上再测 */
const stubElementsFromPoint = (impl: (x: number, y: number) => Element[]) => {
  const fn = vi.fn(impl)
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    writable: true,
    value: fn,
  })
  return fn
}

const clearElementsFromPointStub = () => {
  Reflect.deleteProperty(document, 'elementsFromPoint')
}

const firePointer = (type: string, clientX: number, clientY: number) => {
  // jsdom 无 PointerEvent；监听方只读 clientX/clientY
  const event = new Event(type, { bubbles: true }) as Event & { clientX: number; clientY: number }
  Object.defineProperty(event, 'clientX', { value: clientX })
  Object.defineProperty(event, 'clientY', { value: clientY })
  window.dispatchEvent(event)
}

describe('useFuzzerEditorMenuAutoClose', () => {
  let timeoutIdRef: { current?: ReturnType<typeof setTimeout> }
  let close: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    vi.useFakeTimers()
    timeoutIdRef = { current: undefined }
    close = vi.fn<() => void>()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    clearElementsFromPointStub()
    document.body.innerHTML = ''
  })

  const mount = () => renderHook(() => useFuzzerEditorMenuAutoClose(close, timeoutIdRef, true))

  it('setPanelDragging(true) 清除超时；拖拽中 mouseLeave 不关闭', () => {
    const { result } = mount()
    // mount 已启动 5s 关闭计时
    expect(timeoutIdRef.current).toBeDefined()

    act(() => {
      result.current.setPanelDragging(true)
    })
    expect(timeoutIdRef.current).toBeUndefined()

    act(() => {
      result.current.onMouseLeave()
    })
    // 拖拽中不应重启关闭计时
    expect(timeoutIdRef.current).toBeUndefined()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(close).not.toHaveBeenCalled()
  })

  it('pointermove 采样后松手且落在 [data-menu-panel] 上：5s 内不关闭', () => {
    const panel = document.createElement('div')
    panel.setAttribute('data-menu-panel', '')
    document.body.appendChild(panel)

    const elementsFromPoint = stubElementsFromPoint(() => [panel])

    const { result } = mount()

    act(() => {
      result.current.setPanelDragging(true)
    })

    act(() => {
      firePointer('pointermove', 120, 80)
    })

    act(() => {
      result.current.setPanelDragging(false)
    })

    expect(elementsFromPoint).toHaveBeenCalled()
    expect(timeoutIdRef.current).toBeUndefined()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(close).not.toHaveBeenCalled()
  })

  it('采样点在菜单外：启动超时并在 5s 后 close', () => {
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    stubElementsFromPoint(() => [outside])

    const { result } = mount()

    act(() => {
      result.current.setPanelDragging(true)
    })
    act(() => {
      firePointer('pointermove', 10, 10)
    })
    act(() => {
      result.current.setPanelDragging(false)
    })

    expect(timeoutIdRef.current).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(4999)
    })
    expect(close).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('无 pointer 采样时 setPanelDragging(false) 不 startCloseTimeout', () => {
    // 未采样应提前 return；挂 stub 仅用于确认不会 hit-test
    const elementsFromPoint = stubElementsFromPoint(() => [])

    const { result } = mount()

    act(() => {
      result.current.setPanelDragging(true)
    })
    // 故意不派发 pointermove / pointerup
    act(() => {
      result.current.setPanelDragging(false)
    })

    expect(elementsFromPoint).not.toHaveBeenCalled()
    expect(timeoutIdRef.current).toBeUndefined()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(close).not.toHaveBeenCalled()
  })

  it('卸载时移除 pointer 监听', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { result, unmount } = mount()

    act(() => {
      result.current.setPanelDragging(true)
    })

    const moveAdds = addSpy.mock.calls.filter(([type]) => type === 'pointermove')
    const upAdds = addSpy.mock.calls.filter(([type]) => type === 'pointerup')
    const cancelAdds = addSpy.mock.calls.filter(([type]) => type === 'pointercancel')
    expect(moveAdds.length).toBeGreaterThanOrEqual(1)
    expect(upAdds.length).toBeGreaterThanOrEqual(1)
    expect(cancelAdds.length).toBeGreaterThanOrEqual(1)

    unmount()

    const moveRemoves = removeSpy.mock.calls.filter(([type]) => type === 'pointermove')
    const upRemoves = removeSpy.mock.calls.filter(([type]) => type === 'pointerup')
    const cancelRemoves = removeSpy.mock.calls.filter(([type]) => type === 'pointercancel')
    expect(moveRemoves.length).toBeGreaterThanOrEqual(1)
    expect(upRemoves.length).toBeGreaterThanOrEqual(1)
    expect(cancelRemoves.length).toBeGreaterThanOrEqual(1)
  })
})
