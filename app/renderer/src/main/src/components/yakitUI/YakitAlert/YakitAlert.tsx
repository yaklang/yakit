import React from 'react'
import type { YakitAlertProps } from './type'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { Alert } from 'antd'
import { YakitButton } from '../YakitButton/YakitButton'

export const YakitAlert: React.FC<YakitAlertProps> = React.memo((props) => {
  const { closeIcon, ...rest } = props
  return (
    <Alert {...rest} closeIcon={closeIcon ?? <YakitButton type="text2" icon={<XOutlined color="currentColor" />} />} />
  )
})
