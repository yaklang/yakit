import { afterEach, describe, expect, it } from 'vitest'
import {
  clampTopBesideAnchor,
  MENU_PANEL_EDGE,
  MENU_PANEL_GAP,
  pickVerticalHeightBudget,
  placeMenuPanel,
  readEditorHostBox,
  menuBarClippedByHost,
  menuBarLabeledFitsInHost,
  placeHorizontal,
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
      expect(box.hostTop).toBe(20)
      expect(box.hostRight).toBe(310)
      expect(box.hostBottom).toBe(420)
    })

    it('行号槽在 scrollable 左侧时，hostLeft 取 overflow-guard（横轴摆放用 hostLeft）', () => {
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
      expect(box.hostTop).toBe(20)
      // hostRight 取 overflow-guard（含右侧 minimap/chrome）
      expect(box.hostRight).toBe(540)
      expect(box.hostBottom).toBe(420)
    })

    it('竖向滚动条存在时不收窄 hostRight（允许工具条叠到滚动条 gutter）', () => {
      const wrapper = document.createElement('div')
      const guard = document.createElement('div')
      guard.className = 'overflow-guard'
      const scrollable = document.createElement('div')
      scrollable.className = 'monaco-scrollable-element'
      const vertical = document.createElement('div')
      vertical.className = 'scrollbar vertical'
      guard.appendChild(scrollable)
      scrollable.appendChild(vertical)
      wrapper.appendChild(guard)
      document.body.appendChild(wrapper)

      stubRect(scrollable, { left: 0, top: 0, right: 500, bottom: 400 })
      stubRect(guard, { left: 0, top: 0, right: 500, bottom: 400 })
      // 窄竖向滚动条：hostRight 仍取右缘（浮层可叠到 gutter）
      stubRect(vertical, { left: 490, top: 0, right: 500, bottom: 400 })

      const box = readEditorHostBox(wrapper)
      expect(box.hostRight).toBe(500)
      expect(box.hostLeft).toBe(0)
    })

    it('minimap 存在时不收窄 hostRight（浮层可叠到 minimap）', () => {
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
      expect(box.hostRight).toBe(500)
      expect(box.hostLeft).toBe(0)
    })

    it('横向滚动条存在时不收窄 hostBottom（允许工具条/面板叠到横向滚动条）', () => {
      const wrapper = document.createElement('div')
      const guard = document.createElement('div')
      guard.className = 'overflow-guard'
      const scrollable = document.createElement('div')
      scrollable.className = 'monaco-scrollable-element'
      const horizontal = document.createElement('div')
      horizontal.className = 'scrollbar horizontal'
      guard.appendChild(scrollable)
      scrollable.appendChild(horizontal)
      wrapper.appendChild(guard)
      document.body.appendChild(wrapper)

      stubRect(scrollable, { left: 0, top: 0, right: 500, bottom: 400 })
      stubRect(guard, { left: 0, top: 0, right: 500, bottom: 400 })
      // 窄横向滚动条：hostBottom 仍取底缘（浮层可叠到横向滚动条）
      stubRect(horizontal, { left: 0, top: 390, right: 500, bottom: 400 })

      const box = readEditorHostBox(wrapper)
      expect(box.hostBottom).toBe(400)
      expect(box.hostTop).toBe(0)
      expect(box.hostRight).toBe(500)
    })

    it('minimap 在 scrollable 右侧时 hostRight 取 overflow-guard（含整块 minimap）', () => {
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

      stubRect(scrollable, { left: 0, top: 0, right: 420, bottom: 400 })
      stubRect(guard, { left: 0, top: 0, right: 500, bottom: 400 })
      stubRect(minimap, { left: 420, top: 0, right: 500, bottom: 400 })

      const box = readEditorHostBox(wrapper)
      expect(box.hostRight).toBe(500)
      expect(box.hostLeft).toBe(0)
    })
  })
})

describe('menuBarClippedByHost', () => {
  const host = { hostLeft: 100, hostTop: 50, hostRight: 500, hostBottom: 400 }

  it('完全在宿主内时不算剪切', () => {
    expect(menuBarClippedByHost({ left: 120, top: 80, right: 300, bottom: 110 }, host)).toBe(false)
  })

  it('左边越出宿主时算剪切', () => {
    expect(menuBarClippedByHost({ left: 90, top: 80, right: 300, bottom: 110 }, host)).toBe(true)
  })

  it('右边越出宿主时算剪切', () => {
    expect(menuBarClippedByHost({ left: 120, top: 80, right: 510, bottom: 110 }, host)).toBe(true)
  })

  it('右缘贴齐宿主（含滚动条 gutter）时不算剪切', () => {
    expect(menuBarClippedByHost({ left: 400, top: 80, right: 500, bottom: 110 }, host)).toBe(false)
  })

  it('顶边越出宿主时算剪切', () => {
    expect(menuBarClippedByHost({ left: 120, top: 40, right: 300, bottom: 70 }, host)).toBe(true)
  })
})

describe('menuBarLabeledFitsInHost / placeHorizontal', () => {
  const host = { hostLeft: 0, hostTop: 0, hostRight: 800, hostBottom: 400 }

  it('选区靠右但宿主够宽 → 有文案可经左移放下', () => {
    const caretX = 750
    const labeledWidth = 400
    expect(menuBarLabeledFitsInHost(labeledWidth, caretX, host, false)).toBe(true)
    const { viewLeft } = placeHorizontal(caretX, caretX, labeledWidth, host.hostLeft, host.hostRight, false)
    expect(viewLeft).toBeLessThan(caretX)
    expect(viewLeft + labeledWidth).toBeLessThanOrEqual(host.hostRight + 0.5)
    expect(viewLeft).toBeGreaterThanOrEqual(host.hostLeft - 0.5)
  })

  it('选区靠右且 preferLeft 时同样左移保留文案', () => {
    const caretX = 720
    const labeledWidth = 360
    expect(menuBarLabeledFitsInHost(labeledWidth, caretX, host, true)).toBe(true)
    const { viewLeft } = placeHorizontal(caretX, caretX, labeledWidth, host.hostLeft, host.hostRight, true)
    expect(viewLeft + labeledWidth).toBeLessThanOrEqual(host.hostRight + 0.5)
  })

  it('偏好位置越出右缘但横移后仍完整在宿主内 → fits', () => {
    // 偏好从 caret 向右长会越界；placeHorizontal 应改向左并夹进宿主
    const caretX = 700
    const labeledWidth = 300
    const preferredRight = caretX + labeledWidth
    expect(preferredRight).toBeGreaterThan(host.hostRight)
    expect(menuBarLabeledFitsInHost(labeledWidth, caretX, host, false)).toBe(true)
  })

  it('有文案宽度超过整编辑器宿主 → 不能显示文案', () => {
    const narrow = { hostLeft: 0, hostTop: 0, hostRight: 200, hostBottom: 400 }
    expect(menuBarLabeledFitsInHost(400, 100, narrow, false)).toBe(false)
  })

  it('选区靠右时按 caret + 有文案宽度试摆应 fits', () => {
    // iconLeft 近似 caret：从该点向右探 labeledW 会越界，但 placeHorizontal 横移后应 fits
    const iconLeft = 700
    const labeledW = 400
    const naiveProbeClipped = menuBarClippedByHost(
      { left: iconLeft, top: 80, right: iconLeft + labeledW, bottom: 110 },
      host,
    )
    expect(naiveProbeClipped).toBe(true)
    expect(menuBarLabeledFitsInHost(labeledW, iconLeft, host, false)).toBe(true)
  })
})

describe('placeMenuPanel', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

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

  const stubSize = (el: HTMLElement, width: number, height: number) => {
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width })
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height })
  }

  /** monaco overflow-guard + 工具条父节点 + 锚点按钮 + 面板 */
  const mount = (opts?: {
    host?: { left: number; top: number; right: number; bottom: number }
    anchor?: { left: number; top: number; right: number; bottom: number }
    panelSize?: { width: number; height: number }
    parent?: { left: number; top: number; right: number; bottom: number }
  }) => {
    const host = opts?.host ?? { left: 0, top: 0, right: 800, bottom: 600 }
    const anchor = opts?.anchor ?? { left: 100, top: 120, right: 160, bottom: 148 }
    const panelSize = opts?.panelSize ?? { width: 280, height: 160 }
    const parentBox = opts?.parent ?? { left: 100, top: 120, right: 160, bottom: 148 }

    const wrapper = document.createElement('div')
    const guard = document.createElement('div')
    guard.className = 'overflow-guard'
    const scrollable = document.createElement('div')
    scrollable.className = 'monaco-scrollable-element'
    const bar = document.createElement('div')
    bar.setAttribute('data-menu-bar', '')
    const parent = document.createElement('div')
    const anchorEl = document.createElement('button')
    const panel = document.createElement('div')
    panel.setAttribute('data-menu-panel', '')

    parent.appendChild(anchorEl)
    parent.appendChild(panel)
    bar.appendChild(parent)
    scrollable.appendChild(bar)
    guard.appendChild(scrollable)
    wrapper.appendChild(guard)
    document.body.appendChild(wrapper)

    stubRect(guard, host)
    stubRect(scrollable, host)
    stubRect(bar, { left: anchor.left, top: anchor.top, right: anchor.right, bottom: anchor.bottom })
    stubRect(parent, parentBox)
    stubRect(anchorEl, anchor)
    stubSize(panel, panelSize.width, panelSize.height)
    Object.defineProperty(parent, 'clientTop', { configurable: true, value: 0 })

    return { parent, anchorEl, panel, host, anchor }
  }

  it('maxWidth 取 min(360, 宿主宽 - EDGE*2)', () => {
    const { parent, anchorEl } = mount({
      host: { left: 0, top: 0, right: 800, bottom: 600 },
      panelSize: { width: 280, height: 120 },
    })
    const style = placeMenuPanel(parent, anchorEl, { x: 'left', y: 'top' }, parent.querySelector('[data-menu-panel]'))
    expect(style.maxWidth).toBe(Math.min(360, 800 - MENU_PANEL_EDGE * 2))
    expect(style.width).toBe(280)
    expect(style.visibility).toBe('visible')
  })

  it('宿主较窄时 maxWidth 跟着收窄', () => {
    const { parent, anchorEl } = mount({
      host: { left: 0, top: 0, right: 200, bottom: 400 },
      panelSize: { width: 180, height: 100 },
      anchor: { left: 20, top: 80, right: 80, bottom: 108 },
      parent: { left: 20, top: 80, right: 80, bottom: 108 },
    })
    const style = placeMenuPanel(parent, anchorEl, { x: 'left', y: 'top' }, parent.querySelector('[data-menu-panel]'))
    expect(style.maxWidth).toBe(Math.max(0, 200 - MENU_PANEL_EDGE * 2))
    expect(style.maxWidth).toBeLessThan(360)
  })

  it('宿主宽不足 40 时提前返回，不做完整定位', () => {
    const { parent, anchorEl } = mount({
      host: { left: 0, top: 0, right: 30, bottom: 400 },
    })
    const style = placeMenuPanel(parent, anchorEl, { x: 'left', y: 'top' }, parent.querySelector('[data-menu-panel]'))
    expect(style).toEqual({ visibility: 'visible', marginTop: 0 })
  })

  it('下方空间不足且上方更空时，maxHeight 受上方 heightBudget 限制', () => {
    // 宿主 0~400；锚点贴底 → 下方几乎没有空间，应向上展开并用 spaceAbove 作预算
    const { parent, anchorEl } = mount({
      host: { left: 0, top: 0, right: 800, bottom: 400 },
      anchor: { left: 100, top: 340, right: 180, bottom: 368 },
      parent: { left: 100, top: 340, right: 180, bottom: 368 },
      panelSize: { width: 240, height: 200 },
    })
    const style = placeMenuPanel(parent, anchorEl, { x: 'left', y: 'top' }, parent.querySelector('[data-menu-panel]'))
    const { spaceAbove, spaceBelow } = verticalRoomsBesideAnchor(0, 400, 340, 368)
    expect(spaceAbove).toBeGreaterThan(spaceBelow)
    const { heightBudget } = pickVerticalHeightBudget(spaceAbove, spaceBelow, false, 200)
    const hostMaxHeight = Math.min(320, Math.max(0, 400 - MENU_PANEL_EDGE * 2))
    expect(style.maxHeight).toBe(Math.min(hostMaxHeight, heightBudget > 0 ? heightBudget : 0))
    expect(style.maxHeight).toBeLessThanOrEqual(spaceAbove)
  })

  it('面板 left/top 保证整块落在宿主内（贴右边锚点时左移）', () => {
    const host = { left: 0, top: 0, right: 500, bottom: 400 }
    const parentLeft = 420
    const parentRight = 480
    const parentTop = 80
    const { parent, anchorEl } = mount({
      host,
      anchor: { left: 420, top: 80, right: 480, bottom: 108 },
      parent: { left: parentLeft, top: parentTop, right: parentRight, bottom: 108 },
      panelSize: { width: 300, height: 120 },
    })
    const style = placeMenuPanel(parent, anchorEl, { x: 'right', y: 'top' }, parent.querySelector('[data-menu-panel]'))
    const top = typeof style.top === 'number' ? style.top : Number(style.top)
    expect(Number.isFinite(top)).toBe(true)
    // stuckToAnchor+growLeft 时用 right 定位；否则用 left
    let viewLeft: number
    if (style.left === 'auto' || style.left === undefined) {
      const right = typeof style.right === 'number' ? style.right : Number(style.right)
      expect(Number.isFinite(right)).toBe(true)
      viewLeft = parentRight - right - 300
    } else {
      const left = typeof style.left === 'number' ? style.left : Number(style.left)
      expect(Number.isFinite(left)).toBe(true)
      viewLeft = parentLeft + left
    }
    const viewTop = parentTop + top
    expect(viewLeft).toBeGreaterThanOrEqual(host.left - 0.5)
    expect(viewLeft + 300).toBeLessThanOrEqual(host.right + 0.5)
    expect(viewTop).toBeGreaterThanOrEqual(host.top - 0.5)
    expect(viewTop + 120).toBeLessThanOrEqual(host.bottom + 0.5)
  })
})
