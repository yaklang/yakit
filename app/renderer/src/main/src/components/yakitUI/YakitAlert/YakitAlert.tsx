import React from 'react'
import type { YakitAlertProps } from './type'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { Alert } from 'antd'
import styles from './YakitAlert.module.scss'

export const YakitAlert: React.FC<YakitAlertProps> = React.memo((props) => {
  const { closeIcon, ...rest } = props
  return (
    <Alert
      {...rest}
      closeIcon={closeIcon ?? <XOutlined className={styles['yakit-alert-close-icon']} color="currentColor" />}
    />
  )
})
