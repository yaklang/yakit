import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  ChevronDoubleDownOutlined: () => null,
}))

vi.mock('../YakitResizeBox.module.scss', () => ({
  default: {
    'resize-box': 'resize-box',
    'resize-split-line': 'resize-split-line',
    'resize-split-line-top': 'resize-split-line-top',
    'resize-split-line-bottom': 'resize-split-line-bottom',
    'resize-split-line-left': 'resize-split-line-left',
    'resize-split-line-right': 'resize-split-line-right',
    'resize-split-line-hit': 'resize-split-line-hit',
    'resize-split-line-hit-ver': 'resize-split-line-hit-ver',
    'resize-split-line-hit-hor': 'resize-split-line-hit-hor',
    'resize-split-line-in': 'resize-split-line-in',
    'resize-split-line-in-hide': 'resize-split-line-in-hide',
    'resize-split-line-in-ver': 'resize-split-line-in-ver',
    'resize-split-line-in-nover': 'resize-split-line-in-nover',
    'resize-split-handle': 'resize-split-handle',
    'resize-split-handle-top': 'resize-split-handle-top',
    'resize-split-handle-bottom': 'resize-split-handle-bottom',
    'resize-split-handle-text': 'resize-split-handle-text',
    'resize-line-style': 'resize-line-style',
    'resize-line-ver': 'resize-line-ver',
    'resize-line-hor': 'resize-line-hor',
    'mask-body': 'mask-body',
  },
}))

import { YakitResizeBox } from '../YakitResizeBox'

const nativeSetPointerCapture = HTMLElement.prototype.setPointerCapture
const nativeReleasePointerCapture = HTMLElement.prototype.releasePointerCapture

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  }) as DOMRect

const classOf = (el: Element) => String((el as HTMLElement).className)

const getBox = (container: HTMLElement) => container.firstElementChild as HTMLElement

const getSplit = (box: HTMLElement) =>
  Array.from(box.children).find((el) => classOf(el).includes('resize-split-line')) as HTMLElement

const getPreviewLine = (box: HTMLElement) =>
  Array.from(box.children).find((el) => classOf(el).includes('resize-line-style')) as HTMLElement

const getPanels = (box: HTMLElement) => {
  const split = getSplit(box)
  const first = split.previousElementSibling as HTMLElement
  const second = split.nextElementSibling as HTMLElement
  return { first, second, split, hit: split.firstElementChild as HTMLElement }
}

const stubLayout = (box: HTMLElement, firstWidth: number, secondWidth: number, bodyWidth = 800) => {
  const { first, second } = getPanels(box)
  Object.defineProperty(box, 'clientWidth', { configurable: true, value: bodyWidth })
  Object.defineProperty(box, 'clientHeight', { configurable: true, value: 400 })
  Object.defineProperty(box, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect(0, 0, bodyWidth, 400),
  })
  Object.defineProperty(first, 'clientWidth', { configurable: true, value: firstWidth })
  Object.defineProperty(first, 'clientHeight', { configurable: true, value: 400 })
  Object.defineProperty(second, 'clientWidth', { configurable: true, value: secondWidth })
  Object.defineProperty(second, 'clientHeight', { configurable: true, value: 400 })
}

const dispatchPointer = (el: EventTarget, type: string, clientX: number) => {
  // jsdom 无 PointerEvent，用 MouseEvent 补 pointerId 即可驱动原生 pointer* 监听
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
    clientX,
    clientY: 20,
  })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  Object.defineProperty(event, 'pointerType', { value: 'mouse' })
  el.dispatchEvent(event)
}

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('YakitResizeBox', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    HTMLElement.prototype.setPointerCapture = nativeSetPointerCapture
    HTMLElement.prototype.releasePointerCapture = nativeReleasePointerCapture
  })

  it('lineDirection 应用贴边类且不会写出 undefined', () => {
    const { container } = render(
      <div>
        <YakitResizeBox lineDirection="right" firstNode={<div>left</div>} secondNode={<div>right</div>} />
      </div>,
    )
    const split = getSplit(getBox(container.firstElementChild as HTMLElement))
    const tokens = classOf(split).split(/\s+/).filter(Boolean)
    expect(tokens).not.toContain('undefined')
    expect(classOf(split)).toMatch(/resize-split-line-right/)
  })

  it('lineHitSize 大于 lineSize 时热区宽度生效', () => {
    const { container } = render(
      <div>
        <YakitResizeBox lineSize={1} lineHitSize={12} firstNode={<div>left</div>} secondNode={<div>right</div>} />
      </div>,
    )
    const box = getBox(container.firstElementChild as HTMLElement)
    const { split, hit } = getPanels(box)
    expect(split.style.width).toBe('1px')
    expect(hit.style.width).toBe('12px')
  })

  it('非 dragResize 拖动后 onMouseUp 收到正确 delta', () => {
    const onMouseUp = vi.fn()
    const { container } = render(
      <div>
        <YakitResizeBox
          dragResize={false}
          firstMinSize={100}
          secondMinSize={100}
          firstNode={<div>left</div>}
          secondNode={<div>right</div>}
          onMouseUp={onMouseUp}
        />
      </div>,
    )
    const box = getBox(container.firstElementChild as HTMLElement)
    stubLayout(box, 300, 492)
    const { hit } = getPanels(box)

    dispatchPointer(hit, 'pointerdown', 308)
    dispatchPointer(box, 'pointermove', 408)
    dispatchPointer(box, 'pointerup', 408)

    expect(onMouseUp).toHaveBeenCalledTimes(1)
    expect(onMouseUp.mock.calls[0][0].firstSizeNum).toBe(400)
    expect(onMouseUp.mock.calls[0][0].secondSizeNum).toBe(392)
  })

  it('dragResize 下连续改宽、预览线不显示，松手上报最终尺寸', () => {
    const onMouseUp = vi.fn()
    const { container } = render(
      <div>
        <YakitResizeBox
          dragResize
          firstMinSize={100}
          secondMinSize={100}
          firstNode={<div>left</div>}
          secondNode={<div>right</div>}
          onMouseUp={onMouseUp}
        />
      </div>,
    )
    const box = getBox(container.firstElementChild as HTMLElement)
    stubLayout(box, 300, 492)
    const { first, second, hit } = getPanels(box)
    const preview = getPreviewLine(box)

    dispatchPointer(hit, 'pointerdown', 308)
    expect(preview.style.display === '' || preview.style.display === 'none').toBe(true)

    dispatchPointer(box, 'pointermove', 358)
    expect(preview.style.display).not.toBe('inline-block')
    expect(first.style.width).toBe('350px')
    expect(second.style.width).toBe('442px')

    dispatchPointer(box, 'pointermove', 408)
    expect(preview.style.display).not.toBe('inline-block')
    expect(first.style.width).toBe('400px')
    expect(second.style.width).toBe('392px')

    // jsdom 的 clientWidth 不会跟 style 走，结束上报前对齐到拖拽后的实际宽度
    Object.defineProperty(first, 'clientWidth', { configurable: true, value: 400 })
    Object.defineProperty(second, 'clientWidth', { configurable: true, value: 392 })
    dispatchPointer(box, 'pointerup', 408)
    expect(onMouseUp).toHaveBeenCalledTimes(1)
    expect(onMouseUp.mock.calls[0][0].firstSizeNum).toBe(400)
    expect(onMouseUp.mock.calls[0][0].secondSizeNum).toBe(392)
  })

  it('非 dragResize 拖动时显示预览线', () => {
    const { container } = render(
      <div>
        <YakitResizeBox
          dragResize={false}
          firstMinSize={100}
          secondMinSize={100}
          firstNode={<div>left</div>}
          secondNode={<div>right</div>}
        />
      </div>,
    )
    const box = getBox(container.firstElementChild as HTMLElement)
    stubLayout(box, 300, 492)
    const { hit } = getPanels(box)
    const preview = getPreviewLine(box)

    dispatchPointer(hit, 'pointerdown', 308)
    expect(preview.style.display).toBe('inline-block')
    dispatchPointer(box, 'pointermove', 408)
    expect(preview.style.display).toBe('inline-block')
    dispatchPointer(box, 'pointerup', 408)
    expect(preview.style.display).toBe('none')
  })
})
