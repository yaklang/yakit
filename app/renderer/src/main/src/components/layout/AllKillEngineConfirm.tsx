import React from 'react'
import { failed } from '@/utils/notification'
import { useGetState, useMemoizedFn } from 'ahooks'
import { YakitHint } from '../yakitUI/YakitHint/YakitHint'
import { FigmaIcon5237120699Outlined } from '@yakit-libs/yakit-ui-icons/outline'
import { yakitEngine } from '@/services/electronBridge'

import styles from './AllKillEngineConfirm.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface AllKillEngineConfirmProps {
  title?: string
  content?: string
  visible: boolean
  setVisible: (flag: boolean) => any
  onSuccess: () => any
  onCancelFun: () => any
}
/** 更新引擎-确认二次弹窗和kill操作 */
export const AllKillEngineConfirm: React.FC<AllKillEngineConfirmProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['layout', 'yakitUi'])
  const {
    title = t('AllKillEngineConfirm.title'),
    content = t('AllKillEngineConfirm.content'),
    visible,
    setVisible,
    onSuccess,
    onCancelFun,
  } = props

  const [loading, setLoading, getLoading] = useGetState<boolean>(false)

  const onCancel = useMemoizedFn(() => {
    if (getLoading()) return
    setVisible(false)
    onCancelFun()
  })
  const onOK = useMemoizedFn(async () => {
    if (getLoading()) return
    setLoading(true)
    try {
      const result = await yakitEngine.stopAllLocalEngines()
      if (!result.ok || !result.stopped) {
        failed(t('EngineManagement.stopFailed'))
        return
      }
      onSuccess()
    } catch {
      failed(t('EngineManagement.stopFailed'))
    } finally {
      setLoading(false)
    }
  })

  return (
    <YakitHint
      visible={visible}
      heardIcon={
        loading ? (
          <FigmaIcon5237120699Outlined className={styles['icon-rotate-animation']} color="currentColor" />
        ) : undefined
      }
      title={loading ? t('AllKillEngineConfirm.closing') : title}
      content={content}
      okButtonText={t('YakitButton.closeNow')}
      okButtonProps={{ loading: loading }}
      onOk={onOK}
      cancelButtonText={t('YakitButton.remindMeLater')}
      cancelButtonProps={{ loading: loading }}
      onCancel={onCancel}
    />
  )
})
