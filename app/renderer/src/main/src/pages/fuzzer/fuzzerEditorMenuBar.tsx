import { Fragment, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import classNames from 'classnames'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { ChevronUpIcon } from '@yakit-libs/yakit-ui-icons/oldicon/ChevronUpIcon'
import styles from './HTTPFuzzerEditorMenu.module.scss'
import { useAnchoredMenuPanel, useMenuBarLayout, type EditorDetailInfoProps } from './fuzzerEditorMenuLayout'

/** 面板渲染时能拿到的布局信息。内容本身由菜单项自己决定。 */
export interface FuzzerEditorMenuPanelApi {
  onReady: () => void
  maxWidth: number
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

interface FuzzerEditorMenuBarProps {
  groups: FuzzerEditorMenuGroup[]
  editorInfo?: EditorDetailInfoProps
  className?: string
  lang: string
  /** 传入后不再自己测量文案，避免嵌在别的工具条里重复位移 */
  showLabel?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/** 按菜单项数据渲染工具条和下拉面板，同一时间只展开一项 */
export const FuzzerEditorMenuBar = (props: FuzzerEditorMenuBarProps) => {
  const { groups, editorInfo, className, lang, showLabel, onMouseEnter, onMouseLeave } = props
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
                        <ChevronUpIcon className={styles['up']} />
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
          })}
        </div>
      )}
    </div>
  )
}
