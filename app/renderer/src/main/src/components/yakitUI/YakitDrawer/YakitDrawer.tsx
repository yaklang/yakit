import { Drawer } from 'antd'
import type React from 'react'
import { useEffect, useState } from 'react'
import type { YakitDrawerProps } from './YakitDrawerType'
import styles from './YakitDrawer.module.scss'
import classNames from 'classnames'
import { RemoveIcon } from '@/assets/newIcon'
import type { ShowDrawerProps } from '@/utils/showModal'
import { ErrorBoundary } from 'react-error-boundary'
import { createRoot } from 'react-dom/client'
import emiter from '@/utils/eventBus/eventBus'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import i18n from '@/i18n/i18n'
import { YakitAntdProvider } from '@/theme/antdTheme'
const tOriginal = i18n.getFixedT(null, 'yakitUi')

/** 对齐 YakitModalConfirm 的 YAKIT_IMPERATIVE_MODAL_Z_INDEX_OFFSET：
 * 命令式 Modal zIndex = zIndexPopupBase(1000) + 1000 = 2000，
 * Drawer 走 antd5 useZIndex 默认只有 1100，同屏会被命令式 Modal 盖住，需对齐抬高。
 */
const YAKIT_IMPERATIVE_DRAWER_Z_INDEX = 2000

/**
 * @description:YakitDrawer  抽屉 placement === "bottom" heard有背景色
 * @augments DrawerProps 继承antd的 DrawerProps 默认属性
 */
export const YakitDrawer: React.FC<YakitDrawerProps> = (props) => {
  const {
    visible,
    open,
    style,
    height,
    placement,
    bodyStyle,
    headerStyle,
    styles: stylesProp,
    className,
    rootClassName,
    ...restProps
  } = props
  const mergeOpen = open ?? visible
  const isVertical = placement === 'bottom' || placement === 'top'
  const { height: styleHeight, ...restStyle } = style || {}
  const mergedHeight = height ?? (isVertical ? styleHeight : undefined)
  // antd 5 已废弃 bodyStyle/headerStyle，归一化为 styles.body/styles.header，对齐 YakitModal/AutoCard 兼容策略
  const baseStyles = stylesProp ?? {}
  const mergedStyles = {
    ...baseStyles,
    ...(headerStyle ? { header: { ...baseStyles.header, ...headerStyle } } : {}),
    ...(bodyStyle ? { body: { ...baseStyles.body, ...bodyStyle } } : {}),
  }

  useEffect(() => {
    // 底部橱窗不影响拖拽
    if (placement === 'bottom') return
    emiter.emit('setYakitHeaderDraggable', !mergeOpen)
    return () => emiter.emit('setYakitHeaderDraggable', true)
  }, [mergeOpen, placement])

  return (
    <Drawer
      open={mergeOpen}
      placement={placement}
      height={mergedHeight}
      style={isVertical ? restStyle : style}
      styles={mergedStyles}
      {...restProps}
      zIndex={props.zIndex ?? YAKIT_IMPERATIVE_DRAWER_Z_INDEX}
      closeIcon={
        <div className={styles['yakit-drawer-icon']}>
          {props.closeIcon || <RemoveIcon className={styles['yakit-drawer-remove-icon']} />}
        </div>
      }
      rootClassName={classNames(
        styles['yakit-drawer'],
        { [styles['yakit-drawer-bottom']]: placement === 'bottom' },
        rootClassName,
      )}
      className={className}
    >
      {props.children}
    </Drawer>
  )
}

const YakitBaseDrawer: React.FC<ShowDrawerProps> = (props) => {
  const { onVisibleSetter, ...resProps } = props
  const [visible, setVisible] = useState<boolean>(true)

  useEffect(() => {
    if (visible && onVisibleSetter) {
      onVisibleSetter(setVisible)
    }
  }, [visible])

  return (
    <YakitDrawer
      onClose={(e) => {
        if (props.onCancel) props.onCancel(e)
        setVisible(false)
      }}
      open={visible}
      closable={true}
      destroyOnHidden={true}
      {...resProps}
    />
  )
}

export const showYakitDrawer = (props: ShowDrawerProps) => {
  const div = document.createElement('div')
  document.body.appendChild(div)

  let setter: (r: boolean) => any = () => {}
  let yakitDrawerRootDiv
  const render = (targetConfig: ShowDrawerProps) => {
    setTimeout(() => {
      if (!yakitDrawerRootDiv) {
        yakitDrawerRootDiv = createRoot(div)
      }
      yakitDrawerRootDiv.render(
        <YakitAntdProvider>
          <DndProvider backend={HTML5Backend}>
            <YakitBaseDrawer
              {...(targetConfig as YakitDrawerProps)}
              onVisibleSetter={(r) => {
                setter = r
              }}
            >
              <ErrorBoundary
                FallbackComponent={({ error, resetErrorBoundary }) => {
                  if (!error) {
                    return <div>{tOriginal('YakitNotification.unknown_error')}</div>
                  }
                  return (
                    <div>
                      <p>{tOriginal('YakitNotification.modalCrashRetry')}</p>
                      <pre>{error?.message}</pre>
                    </div>
                  )
                }}
              >
                {targetConfig.content}
              </ErrorBoundary>
            </YakitBaseDrawer>
          </DndProvider>
        </YakitAntdProvider>,
      )
    })
  }
  render(props)
  return {
    destroy: () => {
      if (setter) {
        setter(false)
      }
      setTimeout(() => {
        if (yakitDrawerRootDiv) {
          yakitDrawerRootDiv.unmount()
        }
      }, 400)
    },
  }
}
