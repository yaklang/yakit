import { Fragment, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { ChevronDownOutlined, ChevronUpOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import styles from './HTTPFuzzerEditorMenu.module.scss'
import { useAnchoredMenuPanel, useMenuBarLayout, type EditorDetailInfoProps } from './fuzzerEditorMenuLayout'

/** 面板渲染时能拿到的布局信息。内容本身由菜单项自己决定。 */
export interface FuzzerEditorMenuPanelApi {
  onReady: () => void
  maxWidth: number
  /** 面板内拖拽时通知工具条暂停/恢复自动关闭 */
  onDraggingChange?: (dragging: boolean) => void
}

/**
 * 工具条上的一项。
 * 有 renderPanel 就展开面板，没有就只执行 onClick（例如智能解码）。
 * 以后增删标签、替换面板，改这份数据即可。
 */
export interface FuzzerEditorMenuItem {
  id: string
  label: string
  icon: ReactNode
  className: string
  panelClassName?: string
  /** 面板内容异步变高时先不显示，避免先出现在下面再翻到上面 */
  waitReady?: boolean
  renderPanel?: (api: FuzzerEditorMenuPanelApi) => ReactNode
  onClick?: (event: MouseEvent<HTMLElement>) => void
}

export interface FuzzerEditorMenuGroup {
  id: string
  /** 包住这一组按钮的外层，用来维持点击区和选区区各自的圆角 */
  className?: string
  simpleClassName: string
  /** 这一组第一个按钮前面加分隔线 */
  leadingDivider?: boolean
  items: FuzzerEditorMenuItem[]
}

/**
 * 菜单条出现后的显隐与 5 秒无操作关闭。点击菜单 / 选中菜单 / 只读选中菜单三个入口共用。
 *
 * 行为概要：
 * - 挂载后先 `boxHidden=true` 约 300ms，再显示，减轻弹层闪一下。
 * - 同时启动 5 秒定时器；到期调用 `close`（关掉 Monaco content widget）。
 * - 鼠标进入菜单清定时器；离开再开 5 秒。拖拽中触发的 leave 不重启定时器。
 * - InsertTag 等面板拖拽：`setPanelDragging(true)` 暂停自动关闭，并采样指针；
 *   松手后用 `elementsFromPoint` 判断是否仍在 `[data-menu-bar]` / `[data-menu-panel]` 上，
 *   仍在则当悬停，不在则重新开 5 秒。未采到真实坐标时不用 (0,0) 做命中，避免误关。
 *
 * @param close 真正关掉菜单的回调（由外层 closeFizz*Widget 提供）
 * @param timeoutIdRef 外层持有的定时器 id，便于别处也能清/重启；不传则不启用定时关闭
 * @param enabled false 时不启定时器（例如某些只读场景）
 */
export const useFuzzerEditorMenuAutoClose = (
  close: () => void,
  timeoutIdRef?: { current?: ReturnType<typeof setTimeout> | undefined },
  enabled = true,
) => {
  /** 为 true 时菜单 CSS 隐藏；300ms 后翻成 false 再显示 */
  const [boxHidden, setBoxHidden] = useState(true)
  /** 面板内正在拖拽（如 InsertTag），为 true 时禁止启动关闭定时器 */
  const draggingRef = useRef(false)
  /** 指针是否在菜单/面板上；拖拽松手后会按 hit-test 校正 */
  const hoveredRef = useRef(false)
  /** 拖拽期间记录指针位置：hello-pangea 常在 drag 中触发 mouseLeave，松手时 hovered 不可靠 */
  const lastPointerRef = useRef({ x: 0, y: 0 })
  /** 是否在本轮拖拽中采到过真实 pointer 坐标（move/up/cancel）；未采样时松手不得用 (0,0) 误判 */
  const pointerSampledRef = useRef(false)
  const pointerMoveHandlerRef = useRef<((e: PointerEvent) => void) | null>(null)
  const pointerUpHandlerRef = useRef<((e: PointerEvent) => void) | null>(null)
  const pointerCancelHandlerRef = useRef<((e: PointerEvent) => void) | null>(null)

  /** 清掉 pending 的 5 秒关闭定时器 */
  const clearCloseTimeout = useMemoizedFn(() => {
    if (!enabled || !timeoutIdRef) return
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = undefined
    }
  })

  /** 重新开 5 秒关闭；拖拽中直接跳过 */
  const startCloseTimeout = useMemoizedFn(() => {
    if (!enabled || !timeoutIdRef) return
    if (draggingRef.current) return
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
    timeoutIdRef.current = setTimeout(() => {
      close()
    }, 5 * 1000)
  })

  /** 卸掉拖拽期间挂在 window 上的 pointer 监听 */
  const stopPointerTracking = useMemoizedFn(() => {
    if (pointerMoveHandlerRef.current) {
      window.removeEventListener('pointermove', pointerMoveHandlerRef.current)
      pointerMoveHandlerRef.current = null
    }
    if (pointerUpHandlerRef.current) {
      window.removeEventListener('pointerup', pointerUpHandlerRef.current, true)
      pointerUpHandlerRef.current = null
    }
    if (pointerCancelHandlerRef.current) {
      window.removeEventListener('pointercancel', pointerCancelHandlerRef.current, true)
      pointerCancelHandlerRef.current = null
    }
  })

  /**
   * InsertTag 等面板拖拽时由面板 `onDraggingChange` 调用。
   * true：暂停自动关闭，并开始采样指针坐标。
   * false：结束采样；若采到过坐标则 hit-test 菜单，决定保持悬停还是开 5 秒关闭。
   */
  const setPanelDragging = useMemoizedFn((dragging: boolean) => {
    draggingRef.current = dragging
    if (dragging) {
      clearCloseTimeout()
      stopPointerTracking()
      pointerSampledRef.current = false
      const samplePointer = (e: PointerEvent) => {
        lastPointerRef.current = { x: e.clientX, y: e.clientY }
        pointerSampledRef.current = true
      }
      const onMove = (e: PointerEvent) => samplePointer(e)
      const onUp = (e: PointerEvent) => samplePointer(e)
      const onCancel = (e: PointerEvent) => samplePointer(e)
      pointerMoveHandlerRef.current = onMove
      pointerUpHandlerRef.current = onUp
      pointerCancelHandlerRef.current = onCancel
      window.addEventListener('pointermove', onMove)
      // capture：在 drag 库可能 stopPropagation 之前采到松手坐标
      window.addEventListener('pointerup', onUp, true)
      window.addEventListener('pointercancel', onCancel, true)
      return
    }
    stopPointerTracking()
    clearCloseTimeout()
    // 未采到真实坐标时 lastPointer 可能仍是 (0,0)；勿 hit-test，保持关闭暂停（当悬停）
    if (!pointerSampledRef.current) {
      hoveredRef.current = true
      return
    }
    const { x, y } = lastPointerRef.current
    const nodes =
      typeof document !== 'undefined'
        ? typeof document.elementsFromPoint === 'function'
          ? document.elementsFromPoint(x, y)
          : (() => {
              const el = document.elementFromPoint(x, y)
              return el ? [el] : []
            })()
        : []
    // 指针下任一节点落在工具条或展开面板内 → 仍算悬停，不关
    const overMenu = nodes.some((n) => (n as Element).closest?.('[data-menu-bar],[data-menu-panel]'))
    if (overMenu) {
      hoveredRef.current = true
      return
    }
    hoveredRef.current = false
    startCloseTimeout()
  })

  /** 绑到菜单根节点：进入则取消自动关闭 */
  const onMouseEnter = useMemoizedFn(() => {
    hoveredRef.current = true
    clearCloseTimeout()
  })

  /** 绑到菜单根节点：离开则开 5 秒关闭；拖拽中的假 leave 忽略 */
  const onMouseLeave = useMemoizedFn(() => {
    hoveredRef.current = false
    if (!draggingRef.current) startCloseTimeout()
  })

  useEffect(() => {
    // 一挂载就计时；同时延迟显示，避免 content widget 定位前闪一下
    startCloseTimeout()
    const showId = setTimeout(() => {
      setBoxHidden(false)
    }, 300)
    return () => {
      clearTimeout(showId)
      clearCloseTimeout()
      stopPointerTracking()
    }
  }, [])

  return {
    /** true 时调用方应用隐藏样式 */
    boxHidden,
    onMouseEnter,
    onMouseLeave,
    clearCloseTimeout,
    startCloseTimeout,
    /** 交给面板 onDraggingChange */
    setPanelDragging,
  }
}

interface FuzzerEditorMenuBarProps {
  groups: FuzzerEditorMenuGroup[]
  editorInfo?: EditorDetailInfoProps
  className?: string
  lang: string
  /** 传入后不再自己测量文案，避免嵌在别的工具条里重复位移 */
  showLabel?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  /** InsertTag 等面板拖拽时暂停自动关闭 */
  onPanelDragging?: (dragging: boolean) => void
}

/** 按菜单项数据渲染工具条和下拉面板，同一时间只展开一项 */
export const FuzzerEditorMenuBar = (props: FuzzerEditorMenuBarProps) => {
  const { groups, editorInfo, className, lang, showLabel, onMouseEnter, onMouseLeave, onPanelDragging } = props
  const barRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
  const [openId, setOpenId] = useState<string>()
  const [panelReady, setPanelReady] = useState(false)
  const measuredLabel = useMenuBarLayout(barRef, lang, showLabel === undefined, editorInfo?.direction)
  const labelVisible = showLabel ?? measuredLabel
  const items = groups.flatMap((group) => group.items)
  const openItem = items.find((item) => item.id === openId && item.renderPanel)
  const panelStyle = useAnchoredMenuPanel(
    !!openItem,
    barRef,
    anchorRef,
    editorInfo?.direction,
    openId,
    !openItem?.waitReady || panelReady,
  )
  const maxWidth = Number(panelStyle.maxWidth) || 0

  const onItemClick = (item: FuzzerEditorMenuItem, event: MouseEvent<HTMLElement>) => {
    if (!item.renderPanel) {
      setOpenId(undefined)
      item.onClick?.(event)
      return
    }
    anchorRef.current = event.currentTarget
    setPanelReady(false)
    setOpenId((prev) => (prev === item.id ? undefined : item.id))
  }

  return (
    <div ref={barRef} data-menu-bar="" className={className} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {groups.map((group) => {
        if (!group.items.length) return null
        const buttons = (
          <div className={group.simpleClassName}>
            <div className={styles['show-box']}>
              {group.items.map((item, index) => (
                <Fragment key={item.id}>
                  {(group.leadingDivider || index > 0) && <div className={styles['line']}></div>}
                  <div
                    data-menu-item={item.id}
                    className={item.className}
                    onClick={(event) => onItemClick(item, event)}
                  >
                    {item.icon}
                    {labelVisible && <div className={styles['content']}>{item.label}</div>}
                    {item.renderPanel &&
                      (openId === item.id ? (
                        <ChevronUpOutlined className={styles['up']} />
                      ) : (
                        <ChevronDownOutlined size={16} className={styles['down']} />
                      ))}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        )
        if (!group.className) return <Fragment key={group.id}>{buttons}</Fragment>
        return (
          <div key={group.id} className={group.className}>
            {buttons}
          </div>
        )
      })}
      {openItem?.renderPanel && (
        <div data-menu-panel="" className={classNames(openItem.panelClassName)} style={panelStyle}>
          {openItem.renderPanel({
            onReady: () => setPanelReady(true),
            maxWidth,
            onDraggingChange: onPanelDragging,
          })}
        </div>
      )}
    </div>
  )
}
