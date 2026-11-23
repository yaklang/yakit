import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useSideTagsOverflow } from '../useSideTagsOverflow'

const observers: { resize: () => void; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = []
let available = 96
let visible = true

beforeEach(() => {
  available = 96
  visible = true
  observers.length = 0
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
      constructor(readonly resize: () => void) {
        observers.push(this)
      }
    },
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (!visible) return new DOMRect()
    if (this.hasAttribute('data-ai-summary-tag')) return new DOMRect(0, 0, 120, 20)
    if (this.hasAttribute('data-ai-side-material-add')) return new DOMRect(0, 0, 24, 24)
    if (this.hasAttribute('data-ai-input-footer')) return new DOMRect(0, available + 14, 800, 28)
    return new DOMRect(0, 10, 800, 120)
  })
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({ rowGap: '4px', paddingTop: '4px' } as CSSStyleDeclaration)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const Input = ({
  count,
  wide = true,
  capabilities = false,
}: {
  count: number
  wide?: boolean
  capabilities?: boolean
}) => {
  const { inputLayoutRef, sideTagsOverflow } = useSideTagsOverflow(wide, count, capabilities)
  return (
    <div ref={inputLayoutRef} key={String(capabilities)}>
      <div data-ai-summary-row>
        {count > 0 && <span data-ai-summary-tag />}
        <button data-ai-side-material-add />
      </div>
      <div>
        <div data-ai-input-footer />
      </div>
      <output data-testid="overflow">{String(sideTagsOverflow)}</output>
    </div>
  )
}

it('标签从零增加到四个时同步重算并复用观察器，尺寸变化读取最新数量', () => {
  const { rerender } = render(<Input count={0} />)
  expect(observers).toHaveLength(1)
  expect(screen.getByTestId('overflow')).toHaveTextContent('false')
  rerender(<Input count={3} />)
  expect(screen.getByTestId('overflow')).toHaveTextContent('false')
  rerender(<Input count={4} />)
  expect(screen.getByTestId('overflow')).toHaveTextContent('true')
  expect(observers).toHaveLength(1)
  expect(observers[0].disconnect).not.toHaveBeenCalled()
  act(() => {
    available = 120
    observers[0].resize()
  })
  expect(screen.getByTestId('overflow')).toHaveTextContent('false')
})

it('隐藏时保留上次结果，重新显示后按实际高度更新', () => {
  render(<Input count={4} />)
  expect(screen.getByTestId('overflow')).toHaveTextContent('true')
  act(() => {
    visible = false
    observers[0].resize()
  })
  expect(screen.getByTestId('overflow')).toHaveTextContent('true')
  act(() => {
    visible = true
    available = 120
    observers[0].resize()
  })
  expect(screen.getByTestId('overflow')).toHaveTextContent('false')
})

it('能力开关替换子树时重绑目标，退出宽屏和卸载时清理观察器', () => {
  const { container, rerender, unmount } = render(<Input count={4} />)
  const previousRow = container.querySelector('[data-ai-summary-row]')
  rerender(<Input count={4} capabilities />)
  expect(observers).toHaveLength(2)
  expect(observers[0].disconnect).toHaveBeenCalledOnce()
  const currentRow = container.querySelector('[data-ai-summary-row]')
  expect(currentRow).not.toBe(previousRow)
  expect(observers[1].observe).toHaveBeenCalledWith(currentRow)
  rerender(<Input count={4} capabilities wide={false} />)
  expect(observers[1].disconnect).toHaveBeenCalledOnce()
  rerender(<Input count={4} capabilities />)
  expect(observers).toHaveLength(3)
  unmount()
  expect(observers[2].disconnect).toHaveBeenCalledOnce()
})
