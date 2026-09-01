import type React from 'react'
import { Card, type CardProps } from 'antd'

import styles from './AutoCard.module.scss'
import { normalizeCardProps } from '@/utils/antdCompat'

export interface AutoCardProps extends CardProps {
  style?: React.CSSProperties
  children?: React.ReactNode
}

export const AutoCard: React.FC<AutoCardProps> = (props) => {
  const { style, children, ...rest } = props
  const cardProps = normalizeCardProps(rest as Record<string, unknown>)

  return (
    <Card
      {...(cardProps as CardProps)}
      className={styles['yakit-autoCard-wrap']}
      style={{ width: '100%', height: '100%', display: 'flex', flexFlow: 'column', ...style }}
      styles={{
        ...cardProps.styles,
        body: { ...cardProps.styles?.body, flex: 1 },
      }}
    >
      {children}
    </Card>
  )
}
