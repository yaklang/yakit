import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useCompactSummaryLabels } from '../useCompactSummaryLabels'

const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
  else Reflect.deleteProperty(document, 'fonts')
})

const setupRow = () => {
  let width = 204
  let direction = 'row'
  let fontScale = 1
  let resize = () => {}
  const fonts = new EventTarget()
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback
      }
      observe() {}
      disconnect() {}
    },
  )
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () =>
      ({
        paddingLeft: '12px',
        paddingRight: '12px',
        columnGap: '4px',
        flexDirection: direction,
      }) as CSSStyleDeclaration,
  )
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width)
  const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return { width: (this.hasAttribute('data-ai-compact') ? 30 : Number(this.dataset.width)) * fontScale } as DOMRect
  })
  const Row = () => {
    const ref = useCompactSummaryLabels()
    return (
      <div ref={ref}>
        <span data-ai-summary-tag data-width="100">
          First
        </span>
        <span data-ai-summary-tag data-width="100">
          Second
        </span>
      </div>
    )
  }
  const { container } = render(<Row />)
  const tags = container.querySelectorAll('[data-ai-summary-tag]')
  return {
    container,
    tags,
    measure,
    resize: (nextWidth: number, nextDirection = 'row') => {
      act(() => {
        width = nextWidth
        direction = nextDirection
        resize()
      })
    },
    loadFont: (nextScale: number) => {
      act(() => {
        fontScale = nextScale
        fonts.dispatchEvent(new Event('loadingdone'))
      })
    },
  }
}

it('宽度连续变化时复用标签尺寸，保持从右向左收起和恢复', () => {
  const { tags, measure, resize } = setupRow()
  const initialMeasurements = measure.mock.calls.length
  expect(initialMeasurements).toBeGreaterThan(0)
  for (const width of [200, 190, 180, 170]) resize(width)
  expect(tags[0].hasAttribute('data-ai-compact')).toBe(false)
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(true)
  resize(100)
  expect(tags[0].hasAttribute('data-ai-compact')).toBe(true)
  resize(228)
  expect(tags[0].hasAttribute('data-ai-compact')).toBe(false)
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(false)
  expect(measure).toHaveBeenCalledTimes(initialMeasurements)
})

it('宽度变化但收起边界相同时不重复写入标签属性', () => {
  const { tags, resize } = setupRow()
  const writes = Array.from(tags).flatMap((tag) =>
    (['setAttribute', 'removeAttribute', 'toggleAttribute'] as const).map((method) => vi.spyOn(tag, method)),
  )
  resize(200)
  resize(180)
  resize(170)
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(true)
  for (const write of writes) expect(write).not.toHaveBeenCalled()
})

it('updates the same tag elements across resizing, content changes and side layout', async () => {
  const { container, tags, resize } = setupRow()
  expect(tags[0].hasAttribute('data-ai-compact')).toBe(false)
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(true)
  resize(228)
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(false)
  await act(async () => {
    tags[1].setAttribute('data-width', '120')
    tags[1].textContent = 'Second 10'
  })
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(true)
  resize(228, 'column-reverse')
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(false)
  resize(228)
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(true)
  expect(container.querySelectorAll('[data-ai-summary-tag]')[1]).toBe(tags[1])
})

it('增加和移除标签时重新测量，并按当前标签顺序计算', async () => {
  const { container, tags, measure, resize } = setupRow()
  resize(228)
  const previousMeasurements = measure.mock.calls.length
  const added = document.createElement('span')
  added.setAttribute('data-ai-summary-tag', '')
  added.setAttribute('data-width', '100')
  added.textContent = 'Third'
  await act(async () => {
    container.firstElementChild!.append(added)
  })
  expect(measure.mock.calls.length).toBeGreaterThan(previousMeasurements)
  expect(tags[0].hasAttribute('data-ai-compact')).toBe(false)
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(true)
  expect(added.hasAttribute('data-ai-compact')).toBe(true)
  await act(async () => added.remove())
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(false)
})

it('字体加载改变文字宽度时重新测量', () => {
  const { tags, measure, resize, loadFont } = setupRow()
  resize(228)
  const previousMeasurements = measure.mock.calls.length
  loadFont(1.2)
  expect(measure.mock.calls.length).toBeGreaterThan(previousMeasurements)
  expect(tags[0].hasAttribute('data-ai-compact')).toBe(false)
  expect(tags[1].hasAttribute('data-ai-compact')).toBe(true)
})
