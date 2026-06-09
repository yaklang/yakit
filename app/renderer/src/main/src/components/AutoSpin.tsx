import React from 'react'
import { SpinProps } from 'antd'
import { YakitSpin } from './yakitUI/YakitSpin/YakitSpin'

import './AutoSpin.css'

export interface AutoSpinProps extends SpinProps {
  children?: React.ReactNode
}

export const AutoSpin: React.FC<AutoSpinProps> = (props) => {
  const { children, wrapperClassName, ...rest } = props

  return (
    <YakitSpin {...rest} wrapperClassName={`auto-antd-spin ${wrapperClassName || ''}`}>
      {children}
    </YakitSpin>
  )
}
