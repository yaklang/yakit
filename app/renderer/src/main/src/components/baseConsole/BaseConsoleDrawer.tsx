import type React from 'react'
import { memo, useLayoutEffect, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { Resizable, type Enable, type Size } from 're-resizable'
import { EngineConsole } from './BaseConsole'
import { useEngineConsoleStore } from '../../store/baseConsole'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { WindowPositionOP } from '../yakitUI/YakitWindow/YakitWindow'
import type { WindowPositionType } from '../yakitUI/YakitWindow/YakitWindowType'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import styles from './baseConsoleDrawer.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

/** 引擎Console停靠抽屉支持的方向 */
export type ConsoleDrawerDirection = 'left' | 'right' | 'bottom'

export interface BaseConsoleDrawerProps {
  /** 当前停靠方向 */
  direction: ConsoleDrawerDirection
  /** 关闭抽屉 */
  onClose: () => void
  /** 切换停靠方向（返回新方向）；收到 shrink 表示收起为浮窗 */
  onDirectionChange: (direction: ConsoleDrawerDirection) => void
  /** 收起为浮窗 */
  onShrinkToFloat: () => void
}

interface DrawerLayout {
  style: React.CSSProperties
  defaultSize: Size
  minWidth?: string | number
  minHeight?: string | number
  maxWidth?: string | number
  maxHeight?: string | number
  enable: Enable
}

// 各方向的布局属性：定位、默认尺寸、可拉伸边。
const layoutByDirection: Record<ConsoleDrawerDirection, DrawerLayout> = {
  bottom: {
    style: { position: 'absolute', bottom: 0, left: 0, zIndex: 1001 },
    defaultSize: { width: '100%', height: 400 },
    minWidth: '100%',
    minHeight: 176,
    maxHeight: '66vh',
    enable: {
      top: true,
      right: false,
      bottom: false,
      left: false,
      topRight: false,
      bottomRight: false,
      bottomLeft: false,
      topLeft: false,
    },
  },
  right: {
    style: { position: 'absolute', right: 0, top: -1, zIndex: 1001 },
    defaultSize: { width: 400, height: '100%' },
    minWidth: 280,
    minHeight: '100%',
    maxWidth: '95vw',
    enable: {
      top: false,
      right: false,
      bottom: false,
      left: true,
      topRight: false,
      bottomRight: false,
      bottomLeft: false,
      topLeft: false,
    },
  },
  left: {
    style: { position: 'absolute', left: 0, top: -1, zIndex: 1001 },
    defaultSize: { width: 400, height: '100%' },
    minWidth: 280,
    minHeight: '100%',
    maxWidth: '95vw',
    enable: {
      top: false,
      right: true,
      bottom: false,
      left: false,
      topRight: false,
      bottomRight: false,
      bottomLeft: false,
      topLeft: false,
    },
  },
}

const BaseConsoleDrawer: React.FC<BaseConsoleDrawerProps> = memo((props) => {
  const { direction, onClose, onDirectionChange, onShrinkToFloat } = props
  const { t } = useI18nNamespaces(['layout'])
  const { setConsoleInfo } = useEngineConsoleStore()

  const handleClose = useMemoizedFn(() => {
    setConsoleInfo('')
    onClose()
  })

  const handleDockSide = useMemoizedFn((v: WindowPositionType) => {
    if (v === 'shrink') {
      onShrinkToFloat()
      return
    }
    if (v === 'left' || v === 'right' || v === 'bottom') {
      onDirectionChange(v)
    }
  })

  // 终端子树保持稳定（不随方向切换卸载/重建），仅随方向更新布局属性，
  // 避免切换停靠方向时销毁 xterm 实例导致已显示历史丢失。
  const body = (
    <div className={styles['base-console-box']}>
      <div className={styles['base-console-title']}>
        <div className={styles['title']}>{t('FuncDomain.engineConsole')}</div>
        <div className={styles['operation']}>
          <WindowPositionOP activeDockSide={direction} onDockSide={handleDockSide} />
          <YakitButton type="text2" icon={<XOutlined />} onClick={handleClose} />
        </div>
      </div>
      <div className={styles['console-content']}>
        <EngineConsole isMini={false} />
      </div>
    </div>
  )

  const layout = layoutByDirection[direction]
  const [size, setSize] = useState<Size>(layout.defaultSize)
  useLayoutEffect(() => {
    setSize(layout.defaultSize)
  }, [direction])

  return (
    <div>
      <Resizable
        style={layout.style}
        size={size}
        onResizeStop={(_e, _dir, _ref, d) => {
          setSize((prev) => ({
            width: typeof prev.width === 'number' ? prev.width + d.width : prev.width,
            height: typeof prev.height === 'number' ? prev.height + d.height : prev.height,
          }))
        }}
        minWidth={layout.minWidth}
        minHeight={layout.minHeight}
        maxWidth={layout.maxWidth}
        maxHeight={layout.maxHeight}
        enable={layout.enable}
      >
        {body}
      </Resizable>
    </div>
  )
})

export default BaseConsoleDrawer
