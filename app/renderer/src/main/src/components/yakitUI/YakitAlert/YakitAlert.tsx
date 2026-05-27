import React from 'react'
import { YakitAlertProps } from './type'
import { OutlineXIcon } from '@/assets/icon/outline'
import { Alert } from 'antd'
import { YakitButton } from '../YakitButton/YakitButton'

export const YakitAlert: React.FC<YakitAlertProps> = React.memo((props) => {
  return <Alert {...props} closeIcon={<YakitButton type="text2" icon={<OutlineXIcon />} />} />
})
