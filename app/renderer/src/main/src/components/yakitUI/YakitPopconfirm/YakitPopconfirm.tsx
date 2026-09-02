import React, { useState } from 'react'
import { Popconfirm } from 'antd'
import classNames from 'classnames'
import styles from './YakitPopconfirm.module.scss'
import type { YakitPopconfirmProp } from './YakitPopconfirmTypr'
import { YakitButton } from '../YakitButton/YakitButton'
import { useMemoizedFn } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export const YakitPopconfirm: React.FC<YakitPopconfirmProp> = React.memo((props) => {
  const {
    children,
    okText,
    cancelText,
    title,
    onConfirm,
    onOpenChange,
    onCancel,
    placement = 'left',
    classNames: popconfirmClassNames,
    okButtonProps,
    cancelButtonProps,
    overlayClassName,
    visible: visibleProp,
    open: openProp,
    onVisibleChange,
    ...resePopover
  } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi'])
  const [visible, setVisible] = useState<boolean>(false)
  const onOk = useMemoizedFn((e) => {
    setVisible(false)
    if (onConfirm) onConfirm(e)
  })

  const onCancelClick = useMemoizedFn((e) => {
    setVisible(false)
    if (onCancel) onCancel(e)
  })
  return (
    <Popconfirm
      {...resePopover}
      open={openProp ?? visibleProp ?? visible}
      placement={placement}
      classNames={{
        ...popconfirmClassNames,
        root: classNames(styles['yakit-popconfirm-wrapper'], overlayClassName, popconfirmClassNames?.root),
      }}
      title={
        <div className={styles['yakit-popconfirm-title']}>
          {title}
          <div className={styles['yakit-popconfirm-buttons']}>
            <YakitButton {...(cancelButtonProps || {})} type="outline2" onClick={onCancelClick}>
              {cancelText || t('YakitButton.cancel')}
            </YakitButton>
            <YakitButton {...(okButtonProps || {})} type="primary" onClick={onOk}>
              {okText || t('YakitButton.ok')}
            </YakitButton>
          </div>
        </div>
      }
      onOpenChange={(v) => {
        setVisible(v)
        onOpenChange?.(v)
        onVisibleChange?.(v)
      }}
    >
      {children}
    </Popconfirm>
  )
})
