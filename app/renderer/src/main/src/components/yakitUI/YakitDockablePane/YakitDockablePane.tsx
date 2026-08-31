import ReactDOM from 'react-dom'
import { memo, useLayoutEffect, useRef, useState } from 'react'
import { useControllableValue, useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { YakitButton } from '../YakitButton/YakitButton'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { FigmaIcon4936115787Solid, FigmaIcon4936115789Solid } from '@yakit-libs/yakit-ui-icons/solid'
import type { YakitDockablePaneProps } from './YakitDockablePaneType'
import styles from './YakitDockablePane.module.scss'

const OVERLAY_GAP = 8

/**
 * @name 可停靠侧栏：内联占位或 createPortal 挂到 getContainer / body
 * @description overlay 为 true 时不占用原 DOM 宽度。自定义容器用 absolute 相对容器定位；默认 body 用 fixed 相对视口
 */
export const yakitDockablePaneSegmentedLabel = styles['dockable-pane-segmented-label']

const resolveContainer = (getContainer?: YakitDockablePaneProps['getContainer']) => {
  if (!getContainer) return document.body
  return typeof getContainer === 'function' ? getContainer() : getContainer
}

export const YakitDockablePane: React.FC<YakitDockablePaneProps> = memo((props) => {
  const {
    open: visible = true,
    onClose,
    width = 320,
    header,
    extra,
    className,
    bodyClassName,
    style,
    overlayStyle,
    getContainer,
    dockDisabled,
    dockDisabledTip,
    children,
  } = props

  const [overlay, setOverlay] = useControllableValue<boolean>(props, {
    defaultValue: false,
    valuePropName: 'overlay',
    defaultValuePropName: 'defaultOverlay',
    trigger: 'onOverlayChange',
  })

  const slotRef = useRef<HTMLDivElement>(null)
  const [overlayRect, setOverlayRect] = useState({ top: 0, left: 0, height: 0 })
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(() => (getContainer ? null : document.body))

  const isCustomContainer = !!portalTarget && portalTarget !== document.body
  const disableDock = !!dockDisabled && overlay

  useLayoutEffect(() => {
    const next = resolveContainer(getContainer) || null
    setPortalTarget((prev) => (prev === next ? prev : next))
  })

  useLayoutEffect(() => {
    if (dockDisabled && !overlay) setOverlay(true)
  }, [dockDisabled, overlay, setOverlay])

  const syncOverlayRect = useMemoizedFn(() => {
    const slot = slotRef.current
    if (!slot) return
    const rect = slot.getBoundingClientRect()
    if (isCustomContainer && portalTarget) {
      const crect = portalTarget.getBoundingClientRect()
      setOverlayRect({
        top: rect.top - crect.top + OVERLAY_GAP,
        left: rect.right - crect.left - width - OVERLAY_GAP,
        height: Math.max(rect.height - OVERLAY_GAP * 2, 0),
      })
      return
    }
    setOverlayRect({
      top: rect.top + OVERLAY_GAP,
      left: rect.right - width - OVERLAY_GAP,
      height: Math.max(rect.height - OVERLAY_GAP * 2, 0),
    })
  })

  useLayoutEffect(() => {
    if (!visible || !overlay) return
    syncOverlayRect()
    const slot = slotRef.current
    const parent = slot?.parentElement
    const observer = new ResizeObserver(() => syncOverlayRect())
    if (slot) observer.observe(slot)
    if (parent) observer.observe(parent)
    if (isCustomContainer && portalTarget) observer.observe(portalTarget)
    window.addEventListener('resize', syncOverlayRect)
    window.addEventListener('scroll', syncOverlayRect, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncOverlayRect)
      window.removeEventListener('scroll', syncOverlayRect, true)
    }
  }, [visible, overlay, width, syncOverlayRect, isCustomContainer, portalTarget])

  const handleToggleOverlay = useMemoizedFn(() => {
    if (disableDock) return
    setOverlay(!overlay)
  })

  const styleRest = { ...(style || {}) }
  delete styleRest.height
  const overlayHasBoundedBox =
    overlayStyle?.height != null ||
    (overlayStyle?.top != null && overlayStyle.top !== 'auto' && overlayStyle?.bottom != null)

  const pane = (
    <div
      className={classNames(styles['dockable-pane'], { [styles['dockable-pane-overlay']]: overlay }, className)}
      style={
        overlay
          ? {
              width,
              position: isCustomContainer ? 'absolute' : 'fixed',
              top: overlayRect.top,
              left: overlayRect.left,
              ...(overlayHasBoundedBox ? undefined : { height: overlayRect.height }),
              ...styleRest,
              ...overlayStyle,
            }
          : {
              width,
              ...style,
            }
      }
    >
      <div className={styles['dockable-pane-header']}>
        <div className={styles['dockable-pane-header-main']}>{header}</div>
        <div className={styles['dockable-pane-header-actions']}>
          {extra}
          {disableDock && dockDisabledTip ? (
            <Tooltip title={dockDisabledTip}>
              <span className={styles['dockable-pane-header-action-wrap']}>
                <YakitButton type="text2" disabled icon={<FigmaIcon4936115789Solid />} />
              </span>
            </Tooltip>
          ) : (
            <YakitButton
              type="text2"
              icon={overlay ? <FigmaIcon4936115789Solid /> : <FigmaIcon4936115787Solid />}
              onClick={handleToggleOverlay}
            />
          )}
          <YakitButton type="text2" icon={<XOutlined color="currentColor" />} onClick={onClose} />
        </div>
      </div>
      <div className={classNames(styles['dockable-pane-body'], bodyClassName)}>{children}</div>
    </div>
  )

  const collapsed = !visible || overlay

  return (
    <>
      <div
        ref={slotRef}
        className={classNames(styles['dockable-pane-slot'], {
          [styles['dockable-pane-slot-collapsed']]: collapsed,
        })}
        style={{ width: collapsed ? 0 : width }}
      >
        {visible && !overlay ? pane : null}
      </div>
      {visible && overlay && portalTarget ? ReactDOM.createPortal(pane, portalTarget) : null}
    </>
  )
})
