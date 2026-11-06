import React, { useEffect, useRef, useState } from 'react'
import { Popover } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { readBrowserThumbnail, type AIBrowserInstance, type AIBrowserThumbnail } from './browserInstanceStore'

export const validThumbnail = (value?: AIBrowserThumbnail) =>
  value &&
  typeof value.dataUrl === 'string' &&
  value.dataUrl.length <= 8 * 1024 * 1024 &&
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value.dataUrl)
    ? value
    : undefined

export function BrowserThumbnail({ instance }: { instance: AIBrowserInstance }) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [thumbnail, setThumbnail] = useState<AIBrowserThumbnail>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const epoch = useRef(0)
  const supported = !!(
    instance.online &&
    instance.tab?.active &&
    instance.connection?.capabilities.includes('browser.thumbnail')
  )
  useEffect(() => {
    const request = ++epoch.current
    setThumbnail(undefined)
    setError('')
    setLoading(false)
    if (supported) {
      setLoading(true)
      readBrowserThumbnail(instance)
        .then((value) => {
          if (epoch.current !== request) return
          const image = validThumbnail(value)
          if (image) setThumbnail(image)
          else setError(t('Parity.thumbnailFailed'))
        })
        .catch((reason) => {
          if (epoch.current === request) setError(String(reason))
        })
        .finally(() => {
          if (epoch.current === request) setLoading(false)
        })
    }
    return () => {
      epoch.current++
    }
  }, [instance.id, instance.tab?.id, instance.tab?.url, supported, refresh])
  if (!supported) return null
  return (
    <div>
      {thumbnail && (
        <Popover
          content={
            <img alt={thumbnail.title} src={thumbnail.dataUrl} style={{ maxWidth: '60vw', maxHeight: '65vh' }} />
          }
        >
          <img
            src={thumbnail.dataUrl}
            alt={thumbnail.title || instance.name}
            style={{ width: 220, maxWidth: '100%', borderRadius: 6 }}
          />
        </Popover>
      )}
      <button disabled={loading} onClick={() => setRefresh((v) => v + 1)}>
        {t(loading ? 'SessionSkills.loading' : 'Parity.refreshThumbnail')}
      </button>
      {error && <p role="status">{error}</p>}
    </div>
  )
}
