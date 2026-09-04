import { useEffect, useMemo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { info, yakitFailed } from '@/utils/notification'
import { apiGetSystemProxy } from '@/utils/ConfigSystemProxy'
import emiter from '@/utils/eventBus/eventBus'
import { yakitHost } from '@/services/electronBridge'
import { defHost, defPort } from '@/pages/mitm/mitmDefaults'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './SystemProxySettings.module.scss'

export const SystemProxySettings: React.FC = () => {
  const { t } = useI18nNamespaces(['setting', 'utils', 'yakitUi'])
  const [proxy, setProxy] = useState(`${defHost}:${defPort}`)
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState<{ Enable: boolean; CurrentProxy: string }>({
    Enable: false,
    CurrentProxy: '',
  })

  const enable = useMemo(() => {
    if (!current.Enable) return false
    if (current.CurrentProxy === proxy) return true
    return false
  }, [proxy, current])

  const update = useMemoizedFn(() => {
    setLoading(true)
    apiGetSystemProxy()
      .then((req: { CurrentProxy: string; Enable: boolean }) => {
        setCurrent(req)
        setProxy(req.CurrentProxy ? req.CurrentProxy : `${defHost}:${defPort}`)
      })
      .catch(() => {})
      .finally(() => setTimeout(() => setLoading(false), 300))
  })

  useEffect(() => {
    update()
    emiter.on('onRefConfigSystemProxy', update)
    return () => {
      emiter.off('onRefConfigSystemProxy', update)
    }
  }, [])

  const onSetSystemProxy = useMemoizedFn(() => {
    yakitHost
      .setSystemProxy({
        HttpProxy: proxy,
        Enable: !enable,
      })
      .then(() => {
        info(t('ConfigSystemProxy.setSystemProxySuccess'))
        emiter.emit('onRefConfigSystemProxy', '')
      })
      .catch((err) => {
        yakitFailed(t('ConfigSystemProxy.setSystemProxyFailed', { error: String(err) }))
      })
  })

  return (
    <YakitSpin spinning={loading}>
      <div className={styles['system-proxy']}>
        <div className={styles['page-head']}>
          <div className={styles['page-title']}>{t('SettingsPage.item.system-proxy')}</div>
          <div className={styles['page-status']}>
            <span>{enable ? t('YakitButton.enabled') : t('YakitButton.notEnabled')}</span>
            <YakitSwitch size="large" checked={enable} onChange={onSetSystemProxy} />
          </div>
        </div>
        <div className={styles['section']}>
          <div className={styles['section-title']}>{t('ConfigSystemProxy.systemProxy')}</div>
          <div className={styles['section-desc']}>{t('ConfigSystemProxy.proxyHint')}</div>
          <YakitInput
            addonBefore={proxy.includes('://') ? undefined : 'http(s)://'}
            value={proxy}
            onChange={(e) => setProxy(e.target.value)}
            placeholder={`${defHost}:${defPort}`}
          />
        </div>
      </div>
    </YakitSpin>
  )
}
