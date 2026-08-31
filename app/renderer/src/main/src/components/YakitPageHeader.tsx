import type React from 'react'
import classNames from 'classnames'
import styles from './YakitPageHeader.module.scss'

export interface YakitPageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  subTitle?: React.ReactNode
  extra?: React.ReactNode
  backIcon?: React.ReactNode | boolean
}

export const YakitPageHeader: React.FC<YakitPageHeaderProps> = ({
  title,
  subTitle,
  extra,
  backIcon,
  children,
  style,
  className,
  ...restProps
}) => (
  <div {...restProps} className={classNames(styles['yakit-page-header'], className)} style={style}>
    <div className={styles['yakit-page-header-heading']}>
      <div className={styles['yakit-page-header-heading-left']}>
        {backIcon && typeof backIcon !== 'boolean' ? (
          <span className={styles['yakit-page-header-back']}>{backIcon}</span>
        ) : null}
        {title ? <span className={styles['yakit-page-header-title']}>{title}</span> : null}
        {subTitle ? <span className={styles['yakit-page-header-sub-title']}>{subTitle}</span> : null}
      </div>
      {extra ? <div className={styles['yakit-page-header-extra']}>{extra}</div> : null}
    </div>
    {children ? <div className={styles['yakit-page-header-content']}>{children}</div> : null}
  </div>
)
