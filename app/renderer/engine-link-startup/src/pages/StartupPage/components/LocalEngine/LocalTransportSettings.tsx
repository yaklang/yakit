import { useEffect, useState } from 'react'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { yakitCache } from '@/utils/electronBridge'
import { FetchSoftwareVersion } from '@/utils/envfile'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './LocalTransportSettings.module.scss'

export const LocalTransportSettings = () => {
  const { t } = useI18nNamespaces(['link'])
  const key = `LocalEngine.TransportPolicy.${FetchSoftwareVersion()}`
  const [policy, setPolicy] = useState('auto')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    let mounted = true
    void yakitCache
      .getLocalCache(key)
      .then((value) => {
        if (mounted && ['auto', 'ipc', 'tcp'].includes(value)) setPolicy(value)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [key])
  const selectPolicy = async (next: string) => {
    if (saving) return
    setSaving(true)
    setError(false)
    try {
      await yakitCache.setLocalCache(key, next)
      setPolicy(next)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }
  return (
    <YakitPopover
      trigger="click"
      placement="topLeft"
      open={open}
      onOpenChange={setOpen}
      content={
        <section className={styles.panel} aria-label={t('EngineManagement.policy')}>
          <header>
            <strong>{t('EngineManagement.policy')}</strong>
            <YakitButton type="text2" onClick={() => setOpen(false)}>
              {t('EngineManagement.close')}
            </YakitButton>
          </header>
          <div role="radiogroup" aria-label={t('EngineManagement.policy')} className={styles.options}>
            {(['auto', 'ipc', 'tcp'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                data-policy={value}
                aria-checked={policy === value}
                disabled={saving}
                className={styles.option}
                onClick={() => void selectPolicy(value)}
              >
                <span className={styles.radio} />
                <span>
                  <strong>{t(`EngineManagement.policy_${value}`)}</strong>
                  <small>{t(`EngineManagement.policy_${value}_hint`)}</small>
                </span>
              </button>
            ))}
          </div>
          <p role="status">{t(error ? 'EngineManagement.operationFailed' : 'EngineManagement.policyNextStart')}</p>
        </section>
      }
    >
      <button type="button" className={styles.trigger} data-testid="local-transport-settings">
        <span>{t('EngineManagement.settings')}</span>
        <span className={styles.value}>
          {t(`EngineManagement.policy_${policy}`)}
          <span aria-hidden="true"> ›</span>
        </span>
      </button>
    </YakitPopover>
  )
}
