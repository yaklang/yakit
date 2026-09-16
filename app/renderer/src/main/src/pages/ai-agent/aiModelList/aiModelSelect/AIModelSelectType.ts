import type { ReactNode } from 'react'
import type { ModalProps } from 'antd'

export interface AIModelSelectProps {
  isOpen?: boolean
  className?: string
  mountContainer?: ModalProps['getContainer']
}

export interface ModelNameOptionLabelProps {
  name: string
}

export interface AIModelEditContentItemProps {
  options: {
    label: ReactNode
    value: string
  }[]
  value: string
  onChange: (v: string) => void
  listClassName?: string
  emptyTips?: ReactNode
}
