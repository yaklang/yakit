import type React from 'react'

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
  ...restProps
}) => (
  <div {...restProps} style={style}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
        {backIcon && typeof backIcon !== 'boolean' ? backIcon : null}
        {title ? <span style={{ fontSize: 18, fontWeight: 600 }}>{title}</span> : null}
        {subTitle ? <span style={{ color: 'var(--Colors-Use-Neutral-Text-3-Secondary)' }}>{subTitle}</span> : null}
      </div>
      {extra ? <div>{extra}</div> : null}
    </div>
    {children}
  </div>
)
