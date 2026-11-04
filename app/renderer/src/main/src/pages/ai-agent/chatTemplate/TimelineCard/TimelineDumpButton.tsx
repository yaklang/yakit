import React, { useState } from 'react'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useTimelineDump } from '@/pages/ai-re-act/hooks/useTimelineDump'
import { setClipboardText } from '@/utils/clipboard'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
const DumpContent = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { dump, loading, ready, error, refreshDump } = useTimelineDump()
  const [copyError, setCopyError] = useState(false)
  return (
    <div style={{ width: 500, maxWidth: '80vw' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <YakitButton loading={loading} disabled={!ready} onClick={refreshDump}>
          {t('BatchDump.refresh')}
        </YakitButton>
        <YakitButton
          disabled={!dump || loading}
          onClick={() => {
            setCopyError(false)
            setClipboardText(dump, { failedCallback: () => setCopyError(true) })
          }}
        >
          {t('BatchDump.copy')}
        </YakitButton>
      </div>
      {error && <div role="alert">{t('BatchDump.failed')}</div>}
      {copyError && <div role="alert">{t('BatchDump.copyFailed')}</div>}
      <pre style={{ maxHeight: '60vh', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
        {dump || (loading ? t('BatchDump.loading') : t('BatchDump.empty'))}
      </pre>
    </div>
  )
}
export const TimelineDumpButton = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [open, setOpen] = useState(false)
  return (
    <YakitPopover visible={open} onVisibleChange={setOpen} trigger="click" content={open ? <DumpContent /> : null}>
      <YakitButton type="text2">{t('BatchDump.title')}</YakitButton>
    </YakitPopover>
  )
}
