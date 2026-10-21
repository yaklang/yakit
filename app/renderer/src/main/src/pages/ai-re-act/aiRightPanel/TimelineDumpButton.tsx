import { useMemoizedFn, useSafeState } from 'ahooks'
import { Tooltip } from 'antd'
import { useStore } from 'zustand'
import { RefreshOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitClipboard } from '@/services/electronBridge'
import { yakitNotify } from '@/utils/notification'
import { useCurrentStore } from '../hooks/useCurrentDataBySession'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'
import useCurrentSessionId from '../hooks/useCurrentSessionId'
import { useTimelineDump } from '../hooks/useTimelineDump'
import styles from './AIRightPanel.module.scss'

const SessionTimelineDumpButton = () => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const timelinesLoading = useStore(store, (state) => state.timelinesLoading)
  const { dump, loading, ready, refreshDump } = useTimelineDump()
  const [copyLoading, setCopyLoading] = useSafeState(false)

  const refreshTimeline = useMemoizedFn(() => {
    refreshDump()
    void globalSessionEngine.loadTimelineHistory(sessionId, true)
  })

  const copyDump = useMemoizedFn(async () => {
    setCopyLoading(true)
    try {
      if (typeof dump !== 'string') {
        yakitNotify('warning', t('AIRightPanel.dumpUnsupported'))
        return
      }
      if (!dump) {
        yakitNotify('info', t('AIRightPanel.dumpEmpty'))
        return
      }
      await yakitClipboard.setText(dump)
      yakitNotify('success', t('AIRightPanel.dumpCopied'))
    } catch {
      yakitNotify('error', t('AIRightPanel.dumpCopyFailed'))
    } finally {
      setTimeout(() => setCopyLoading(false), 500)
    }
  })

  return (
    <>
      <YakitButton loading={copyLoading} onClick={copyDump} type="text" className={styles['timeline-copy-button']}>
        {t('AIRightPanel.copyDump')}
      </YakitButton>
      <Tooltip title={t('YakitButton.refresh')}>
        <YakitButton
          type="text"
          icon={<RefreshOutlined />}
          aria-label={t('YakitButton.refresh')}
          loading={loading || timelinesLoading}
          disabled={!ready}
          onClick={refreshTimeline}
        />
      </Tooltip>
    </>
  )
}

export const TimelineDumpButton = () => {
  const sessionId = useCurrentSessionId()
  return <SessionTimelineDumpButton key={sessionId} />
}
