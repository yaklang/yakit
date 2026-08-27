import { YakitButton, type YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'
import styles from './AIReActChat.module.scss'
import { StopSolid } from '@yakit-libs/yakit-ui-icons/solid'
import React from 'react'
import { ChevronDownOutlined, ChevronLeftOutlined, PaperClipOutlined } from '@yakit-libs/yakit-ui-icons/outline'

export const RoundedStopButton: React.FC<YakitButtonProp> = React.memo((props) => {
  return (
    <YakitButton
      className={styles['rounded-icon-btn']}
      colors="danger"
      icon={<StopSolid className={styles['stop-icon']} color="currentColor" />}
      radius="50%"
      {...props}
    />
  )
})

export const ChevrondownButton: React.FC<YakitButtonProp> = React.memo((props) => {
  return (
    <YakitButton
      type="outline2"
      className={styles['side-header-btn']}
      icon={<ChevronDownOutlined color="currentColor" />}
      size="small"
      radius="50%"
      {...props}
    />
  )
})

export const ChevronleftButton: React.FC<YakitButtonProp> = React.memo((props) => {
  return <ChevrondownButton icon={<ChevronLeftOutlined color="currentColor" />} {...props} />
})

export const UploadFileButton: React.FC<YakitButtonProp> = React.memo((props) => {
  return (
    <YakitButton
      type="text2"
      className={styles['upload-file-icon']}
      icon={<PaperClipOutlined color="currentColor" />}
      radius="50%"
      {...props}
    />
  )
})
