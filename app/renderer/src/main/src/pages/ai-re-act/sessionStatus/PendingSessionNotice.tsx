import React from 'react'
import type { PendingAIChat } from '../hooks/ChatMultiSessionController'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export function PendingSessionNotice({ pending, onCancel }: { pending: PendingAIChat; onCancel: () => void }) {
  const { t } = useI18nNamespaces(['aiAgent'])
  return (
    <div role="status" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span>
        {pending.status === 'connecting'
          ? t('SessionStatus.connecting')
          : t('SessionStatus.failed', { error: pending.error })}
      </span>
      {pending.status === 'failed' && <YakitButton onClick={pending.retry}>{t('SessionStatus.retry')}</YakitButton>}
      <YakitButton type="outline1" onClick={onCancel}>
        {t('SessionStatus.cancel')}
      </YakitButton>
    </div>
  )
}
