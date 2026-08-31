import type React from 'react'
import { Spin, type SpinProps } from 'antd'

import './AutoSpin.css'

export interface AutoSpinProps extends SpinProps {
  children?: React.ReactNode
}

export const AutoSpin: React.FC<AutoSpinProps> = (props) => {
  const { children, wrapperClassName, tip, ...rest } = props
  const nestedChildren = children ?? (tip != null ? <div /> : children)

  return (
    <Spin {...rest} tip={tip} wrapperClassName={`auto-antd-spin ${wrapperClassName || ''}`}>
      {nestedChildren}
    </Spin>
  )
}
