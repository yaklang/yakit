import { afterEach, describe, expect, it } from 'vitest'
import {
  clampTopBesideAnchor,
  MENU_PANEL_EDGE,
  MENU_PANEL_GAP,
  pickVerticalHeightBudget,
  readEditorHostBox,
  menuBarClippedByHost,
  verticalRoomsBesideAnchor,
} from '../fuzzerEditorMenuLayout'

describe('fuzzerEditorMenuLayout vertical helpers', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('pickVerticalHeightBudget', () => {
    it('两侧可用空间均为 0 时 heightBudget 为 0', () => {
      const result = pickVerticalHeightBudget(0, 0, false, 120)
      expect(result.heightBudget).toBe(0)
      expect(result.sideRoom).toBe(0)
      expect(result.otherRoom).toBe(0)
    })

    it('首选侧放不下且另一侧更空时翻转到另一侧', () => {
      // prefer grow down，下方只有 40，上方有 200，panelHeight 100 → 应翻到上方
      const result = pickVerticalHeightBudget(200, 40, false, 100)
      expect(result.growUp).toBe(true)
      expect(result.heightBudget).toBe(200)
    })

    it('首选侧够用时不翻转', () => {
      const result = pickVerticalHeightBudget(50, 180, false, 100)
      expect(result.growUp).toBe(false)
      expect(result.heightBudget).toBe(180)
    })
  })

  describe('verticalRoomsBesideAnchor', () => {
    it('按 EDGE+GAP 扣减上下可用空间', () => {
      const hostTop = 100
      const hostBottom = 500
      const anchorTop = 250
      const anchorBottom = 280
      const { spaceAbove, spaceBelow } = verticalRoomsBesideAnchor(hostTop, hostBottom, anchorTop, anchorBottom)
      expect(spaceAbove).toBe(anchorTop - (hostTop + MENU_PANEL_EDGE) - MENU_PANEL_GAP)
      expect(spaceBelow).toBe(hostBottom - MENU_PANEL_EDGE - anchorBottom - MENU_PANEL_GAP)
    })

    it('锚点贴边时两侧为 0', () => {
      const { spaceAbove, spaceBelow } = verticalRoomsBesideAnchor(0, 100, 0, 100)
      expect(spaceAbove).toBe(0)
      expect(spaceBelow).toBe(0)
    })
  })

  describe('clampTopBesideAnchor', () => {
    it('向下展开时 top 不低于锚点底边+GAP，不压工具条', () => {
      const hostTop = 0
      const hostBottom = 400
      const anchorTop = 100
      const anchorBottom = 130
      const panelHeight = 80
      // preferred 故意压进工具条上方
      const preferredTop = 50
      const top = clampTopBesideAnchor(preferredTop, panelHeight, false, hostTop, hostBottom, anchorTop, anchorBottom)
      const minAllowed = Math.max(hostTop + MENU_PANEL_EDGE, anchorBottom + MENU_PANEL_GAP)
      expect(top).toBeGreaterThanOrEqual(minAllowed)
      expect(top + panelHeight).toBeLessThanOrEqual(hostBottom - MENU_PANEL_EDGE)
    })

    it('向上展开时 bottom 不越过锚点顶边-GAP', () => {
      const hostTop = 0
      const hostBottom = 400
      const anchorTop = 200
      const anchorBottom = 230
      const panelHeight = 80
      // preferred 故意太低，会压住工具条
      const preferredTop = 180
      const top = clampTopBesideAnchor(preferredTop, panelHeight, true, hostTop, hostBottom, anchorTop, anchorBottom)
      const maxEdge = Math.min(hostBottom - MENU_PANEL_EDGE, anchorTop - MENU_PANEL_GAP)
      expect(top).toBeGreaterThanOrEqual(hostTop + MENU_PANEL_EDGE)
      expect(top + panelHeight).toBeLessThanOrEqual(maxEdge)
    })
  })

  describe('readEditorHostBox', () => {
    const stubRect = (el: HTMLElement, rect: Partial<DOMRect>) => {
      el.getBoundingClientRect = () =>
        ({
          x: rect.left ?? 0,
          y: rect.top ?? 0,
          left: rect.left ?? 0,
          top: rect.top ?? 0,
          right: rect.right ?? 0,
          bottom: rect.bottom ?? 0,
          width: (rect.right ?? 0) - (rect.left ?? 0),
          height: (rect.bottom ?? 0) - (rect.top ?? 0),
          toJSON: () => ({}),
        }) as DOMRect
    }

    it('node 为祖先 wrapper 时走 querySelector 回退找到 monaco 区域', () => {
      const wrapper = document.createElement('div')
      wrapper.className = 'yakit-editor-wrapper'
      const guard = document.createElement('div')
      guard.className = 'overflow-guard'
      const scrollable = document.createElement('div')
      scrollable.className = 'monaco-scrollable-element'
      guard.appendChild(scrollable)
      wrapper.appendChild(guard)
      document.body.appendChild(wrapper)

      stubRect(scrollable, { left: 10, top: 20, right: 310, bottom: 420 })
      stubRect(guard, { left: 10, top: 20, right: 310, bottom: 420 })

      const box = readEditorHostBox(wrapper)
      expect(box.hostLeft).toBe(10)
      expect(box.clipLeft).toBe(10)
      expect(box.hostTop).toBe(20)
      expect(box.hostRight).toBe(310)
      expect(box.hostBottom).toBe(420)
    })

    it('行号槽在 scrollable 左侧时，hostLeft 取 overflow-guard，clipLeft 取 scrollable（下拉不伸进行号槽）', () => {
      const wrapper = document.createElement('div')
      const guard = document.createElement('div')
      guard.className = 'overflow-guard'
      const scrollable = document.createElement('div')
      scrollable.className = 'monaco-scrollable-element'
      guard.appendChild(scrollable)
      wrapper.appendChild(guard)
      document.body.appendChild(wrapper)

      // scrollable 从行号槽右侧开始；guard 含整块编辑器
      stubRect(guard, { left: 40, top: 20, right: 540, bottom: 420 })
      stubRect(scrollable, { left: 100, top: 20, right: 500, bottom: 420 })

      const box = readEditorHostBox(wrapper)
      expect(box.hostLeft).toBe(40)
      expect(box.clipLeft).toBe(100)
      expect(box.hostTop).toBe(20)
      expect(box.hostRight).toBe(500)
      expect(box.hostBottom).toBe(420)
    })

    it('minimap 存在时收窄 hostRight', () => {
      const wrapper = document.createElement('div')
      const guard = document.createElement('div')
      guard.className = 'overflow-guard'
      const scrollable = document.createElement('div')
      scrollable.className = 'monaco-scrollable-element'
      const minimap = document.createElement('div')
      minimap.className = 'minimap'
      guard.appendChild(scrollable)
      guard.appendChild(minimap)
      wrapper.appendChild(guard)
      document.body.appendChild(wrapper)

      stubRect(scrollable, { left: 0, top: 0, right: 500, bottom: 400 })
      stubRect(guard, { left: 0, top: 0, right: 500, bottom: 400 })
      stubRect(minimap, { left: 420, top: 0, right: 500, bottom: 400 })

      const box = readEditorHostBox(wrapper)
      expect(box.hostRight).toBe(420)
      expect(box.hostLeft).toBe(0)
    })
  })
})

describe('menuBarClippedByHost', () => {
  const host = { hostLeft: 100, clipLeft: 100, hostTop: 50, hostRight: 500, hostBottom: 400 }

  it('完全在宿主内时不算剪切', () => {
    expect(menuBarClippedByHost({ left: 120, top: 80, right: 300, bottom: 110 }, host)).toBe(false)
  })

  it('左边越出宿主时算剪切', () => {
    expect(menuBarClippedByHost({ left: 90, top: 80, right: 300, bottom: 110 }, host)).toBe(true)
  })

  it('顶边越出宿主时算剪切', () => {
    expect(menuBarClippedByHost({ left: 120, top: 40, right: 300, bottom: 70 }, host)).toBe(true)
  })
})
