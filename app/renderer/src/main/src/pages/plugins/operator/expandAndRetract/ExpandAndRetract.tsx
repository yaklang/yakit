import React, { type MouseEventHandler, type ReactNode } from 'react'
import styles from './ExpandAndRetract.module.scss'
import { ChevronDoubleDownOutlined, ChevronDoubleUpOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import classNames from 'classnames'

/** 根据状态显示过度动画 */
export type ExpandAndRetractExcessiveState = 'default' | 'process' | 'finished' | 'error' | 'paused'
interface ExpandAndRetractProps {
  onExpand: MouseEventHandler<HTMLDivElement>
  isExpand: boolean
  children?: ReactNode
  className?: string
  animationWrapperClassName?: string
  /**@description 默认/过程中/完成 根据状态显示过度动画 */
  status?: ExpandAndRetractExcessiveState
  /**展开文案 */
  expandText?: string
  /**收起文案 */
  retractText?: string
}
export const ExpandAndRetract: React.FC<ExpandAndRetractProps> = React.memo((props) => {
  const {
    isExpand,
    onExpand,
    children,
    className = '',
    animationWrapperClassName = '',
    status = 'default',
    expandText,
    retractText,
  } = props
  return (
    <div
      className={classNames(
        styles['expand-and-retract-header'],
        {
          [styles['expand-and-retract-header-process']]: status === 'process',
          [styles['expand-and-retract-header-finished']]: status === 'finished',
          [styles['expand-and-retract-header-error']]: status === 'error',
        },
        className,
      )}
      onClick={onExpand}
    >
      <div className={classNames(styles['expand-and-retract-header-icon-body'], animationWrapperClassName)}>
        {isExpand ? (
          <>
            <ChevronDoubleUpOutlined className={styles['expand-and-retract-icon']} color="currentColor" />
            <span className={styles['expand-and-retract-header-icon-text']}>{retractText || '收起参数'}</span>
          </>
        ) : (
          <>
            <ChevronDoubleDownOutlined className={styles['expand-and-retract-icon']} color="currentColor" />
            <span className={styles['expand-and-retract-header-icon-text']}>{expandText || '展开参数'}</span>
          </>
        )}
      </div>
      {children}
    </div>
  )
})
