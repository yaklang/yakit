import React, { CSSProperties, ReactNode } from 'react'
import classNames from 'classnames'
import { YakitSpin } from '../YakitSpin/YakitSpin'
import { YakitSpinProps } from '../YakitSpin/YakitSpinType'
import styles from './YakitSuspense.module.scss'

export interface YakitSuspenseFallbackProps {
  className?: string
  style?: CSSProperties
  /**
   * 展示形态
   * - content：内容区内居中加载（适合弹窗 body 内）
   * - overlay：全屏遮罩居中加载（适合懒加载的整页/整弹窗组件）
   */
  mode?: 'content' | 'overlay'
  /** content 模式下的最小高度，默认 120 */
  height?: number | string
  /** 加载文案 */
  tip?: ReactNode
  /** Spin 尺寸，默认 default */
  size?: YakitSpinProps['size']
}

/**
 * React.Suspense 默认 fallback 展示
 */
export const YakitSuspenseFallback: React.FC<YakitSuspenseFallbackProps> = React.memo((props) => {
  const { className, style, mode = 'content', height = 120, tip, size } = props

  return (
    <div
      className={classNames(
        styles['yakit-suspense-fallback'],
        {
          [styles['yakit-suspense-fallback-content']]: mode === 'content',
          [styles['yakit-suspense-fallback-overlay']]: mode === 'overlay',
        },
        className,
      )}
      style={{
        ...(mode === 'content' ? { minHeight: height } : undefined),
        ...style,
      }}
      role="status"
      aria-live="polite"
    >
      <YakitSpin style={{ alignItems: 'center', justifyContent: 'center' }} spinning={true} tip={tip} size={size} />
    </div>
  )
})

YakitSuspenseFallback.displayName = 'YakitSuspenseFallback'

export interface YakitSuspenseProps extends YakitSuspenseFallbackProps {
  children?: ReactNode
  /** 自定义 fallback；不传则使用 YakitSuspenseFallback */
  fallback?: ReactNode
}

/**
 * 带默认 loading fallback 的 Suspense 封装
 */
export const YakitSuspense: React.FC<YakitSuspenseProps> = React.memo((props) => {
  const { children, fallback, className, style, mode, height, tip, size } = props

  return (
    <React.Suspense
      fallback={
        fallback ?? (
          <YakitSuspenseFallback
            className={className}
            style={style}
            mode={mode}
            height={height}
            tip={tip}
            size={size}
          />
        )
      }
    >
      {children}
    </React.Suspense>
  )
})

YakitSuspense.displayName = 'YakitSuspense'
