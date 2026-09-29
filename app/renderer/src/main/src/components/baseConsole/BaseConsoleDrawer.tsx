import type React from 'react'
import { useMemoizedFn } from 'ahooks'
import { Resizable } from 're-resizable'
import { EngineConsole } from './BaseConsole'
import { useEngineConsoleStore } from '../../store/baseConsole'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { WindowPositionOP } from '../yakitUI/YakitWindow/YakitWindow'
import type { WindowPositionType } from '../yakitUI/YakitWindow/YakitWindowType'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import styles from './baseConsoleDrawer.module.scss'

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

const BaseConsoleDrawer: React.FC<BaseConsoleDrawerProps> = (props) => {
  const { direction, onClose, onDirectionChange, onShrinkToFloat } = props
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

  const header = (
    <div className={styles['base-console-title']}>
      <div className={styles['title']}>引擎 Console</div>
      <div className={styles['operation']}>
        <WindowPositionOP activeDockSide={direction} onDockSide={handleDockSide} />
        <YakitButton type="text2" icon={<XOutlined />} onClick={handleClose} />
      </div>
    </div>
  )

  const body = (
    <div className={styles['base-console-box']}>
      {header}
      <div className={styles['console-content']}>
        <EngineConsole isMini={false} />
      </div>
    </div>
  )

  return (
    <div>
      {direction === 'bottom' && (
        <Resizable
          style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 1001 }}
          defaultSize={{ width: '100%', height: 400 }}
          minWidth={'100%'}
          minHeight={176}
          maxHeight={'66vh'}
          enable={{
            top: true,
            right: false,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
        >
          {body}
        </Resizable>
      )}
      {direction === 'right' && (
        <Resizable
          style={{ position: 'absolute', right: 0, top: -1, zIndex: 1001 }}
          defaultSize={{ width: 400, height: '100%' }}
          minWidth={280}
          minHeight={'100%'}
          maxWidth={'95vw'}
          enable={{
            top: false,
            right: false,
            bottom: false,
            left: true,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
        >
          {body}
        </Resizable>
      )}
      {direction === 'left' && (
        <Resizable
          style={{ position: 'absolute', left: 0, top: -1, zIndex: 1001 }}
          defaultSize={{ width: 400, height: '100%' }}
          minWidth={280}
          minHeight={'100%'}
          maxWidth={'95vw'}
          enable={{
            top: false,
            right: true,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
        >
          {body}
        </Resizable>
      )}
    </div>
  )
}

export default BaseConsoleDrawer
