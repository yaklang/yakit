import type React from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  OutlineCheckcircleIcon,
  OutlineExternallinkIcon,
  OutlineQrcodeIcon,
  OutlineRefreshIcon,
} from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { ChatBrowserHandoff } from '@/pages/ai-re-act/hooks/aiRender'
import { callBrowserExtensionCapability } from '@/pages/browserExtension/browserExtensionClient'
import { useBrowserInstances } from '../../browserInstances/browserInstanceStore'
import ChatCard from '../ChatCard'
import styles from './AIBrowserHandoffCard.module.scss'

const SAFE_QR_DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,/i
const REFRESH_DELAY = 3_000
const FALLBACK_AFTER_MISSES = 3

interface HandoffPresentation {
  handoffId: string
  state: 'waiting_for_user' | 'completed' | 'cancelled' | 'not_found' | 'page_changed'
  title: string
  url: string
  capturedAt: number
  source?: 'image' | 'canvas' | 'svg' | 'background' | 'screenshot'
  dataUrl?: string
}

interface AIBrowserHandoffCardProps {
  item: ChatBrowserHandoff
  renderNum: number
}

export const AIBrowserHandoffCard: React.FC<AIBrowserHandoffCardProps> = memo(({ item, renderNum }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { instances } = useBrowserInstances()
  const [state, setState] = useState(item.data.state)
  const [presentation, setPresentation] = useState<HandoffPresentation>()
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [usingBrowserFallback, setUsingBrowserFallback] = useState(false)
  const presentationMisses = useRef(0)
  const fallbackFocused = useRef(false)
  const isQrCodeHandoff = item.data.reason === 'qr_code'
  const instance = instances.find((candidate) => candidate.id === item.data.deviceId)
  const badge = instance?.identity || t('AIBrowserHandoffCard.browser')
  const title =
    presentation?.title ||
    item.data.title ||
    item.data.message ||
    t(isQrCodeHandoff ? 'AIBrowserHandoffCard.login' : 'AIBrowserHandoffCard.actionRequired')
  const host = useMemo(() => {
    try {
      return new URL(presentation?.url || item.data.url || item.data.origin || '').host
    } catch {
      return presentation?.url || item.data.origin || ''
    }
  }, [item.data.origin, item.data.url, presentation?.url])

  useEffect(() => setState(item.data.state), [item.data.state, renderNum])

  const focusBrowser = useCallback(
    async (quiet = false): Promise<boolean> => {
      if (!quiet) setActionLoading(true)
      try {
        await callBrowserExtensionCapability(
          item.data.deviceId,
          'browser.handoff.focus',
          { handoffId: item.data.handoffId },
          20_000,
        )
        setError('')
        return true
      } catch (reason) {
        setError(String(reason))
        return false
      } finally {
        if (!quiet) setActionLoading(false)
      }
    },
    [item.data.deviceId, item.data.handoffId],
  )

  const loadPresentation = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true)
      try {
        const next = await callBrowserExtensionCapability<HandoffPresentation>(
          item.data.deviceId,
          'browser.handoff.presentation.get',
          { handoffId: item.data.handoffId },
          20_000,
        )
        setError('')
        if (next.state === 'completed' || next.state === 'cancelled') {
          setState(next.state)
          setPresentation(undefined)
        } else {
          const dataUrl = next.dataUrl && SAFE_QR_DATA_URL.test(next.dataUrl) ? next.dataUrl : undefined
          setPresentation({
            ...next,
            dataUrl,
          })
          if (dataUrl) {
            presentationMisses.current = 0
            setUsingBrowserFallback(false)
          } else if (next.state === 'page_changed') {
            presentationMisses.current = 0
            setUsingBrowserFallback(false)
          } else if (next.state === 'not_found') {
            presentationMisses.current += 1
            if (presentationMisses.current >= FALLBACK_AFTER_MISSES && !fallbackFocused.current) {
              fallbackFocused.current = true
              if (await focusBrowser(true)) setUsingBrowserFallback(true)
            }
          }
        }
        return next.state
      } catch (reason) {
        setError(instance && !instance.online ? t('AIBrowserHandoffCard.offline') : String(reason))
        return 'error'
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    [focusBrowser, instance?.online, item.data.deviceId, item.data.handoffId, t],
  )

  useEffect(() => {
    if (state !== 'waiting_for_user' || !isQrCodeHandoff) return
    let active = true
    let first = true
    let timer: number | undefined
    const refresh = async () => {
      const next = await loadPresentation(!first)
      first = false
      if (active && next !== 'error' && next !== 'completed' && next !== 'cancelled' && next !== 'page_changed') {
        timer = window.setTimeout(refresh, REFRESH_DELAY)
      }
    }
    void refresh()
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [isQrCodeHandoff, item.data.handoffId, loadPresentation, state])

  const handleResolve = useCallback(async () => {
    setActionLoading(true)
    try {
      await callBrowserExtensionCapability(
        item.data.deviceId,
        'browser.handoff.resolve',
        { handoffId: item.data.handoffId, outcome: 'completed' },
        20_000,
      )
      setState('completed')
      setPresentation(undefined)
      setError('')
    } catch (reason) {
      setError(String(reason))
    } finally {
      setActionLoading(false)
    }
  }, [item.data.deviceId, item.data.handoffId])

  const handleFocus = useCallback(() => void focusBrowser(), [focusBrowser])

  if (state === 'completed' || state === 'cancelled') {
    return (
      <ChatCard
        className={styles['handoff-card-complete']}
        titleIcon={<OutlineCheckcircleIcon />}
        titleText={`${badge} · ${title}`}
        titleExtra={t(state === 'completed' ? 'AIBrowserHandoffCard.completed' : 'AIBrowserHandoffCard.cancelled')}
      />
    )
  }

  const hasQrCode = Boolean(presentation?.dataUrl)
  const pageChanged = presentation?.state === 'page_changed'
  return (
    <ChatCard
      className={styles['handoff-card']}
      titleIcon={<OutlineQrcodeIcon />}
      titleText={`${badge} · ${title}`}
      titleExtra={<span className={styles['local-only']}>{t('AIBrowserHandoffCard.localOnly')}</span>}
    >
      <div className={styles['handoff-content']}>
        {host && <div className={styles.host}>{host}</div>}
        {isQrCodeHandoff ? (
          <div className={styles['qr-stage']} aria-live="polite">
            {hasQrCode ? (
              <img src={presentation?.dataUrl} alt={t('AIBrowserHandoffCard.qrAlt', { browser: badge })} />
            ) : loading ? (
              <div className={styles.placeholder}>
                <YakitSpin spinning size="small" />
                <span>{t('AIBrowserHandoffCard.locating')}</span>
              </div>
            ) : (
              <div className={styles.placeholder}>
                {pageChanged ? (
                  <OutlineCheckcircleIcon />
                ) : usingBrowserFallback ? (
                  <OutlineExternallinkIcon />
                ) : (
                  <OutlineQrcodeIcon />
                )}
                <span>
                  {error ||
                    (pageChanged
                      ? t('AIBrowserHandoffCard.pageChanged', { browser: badge })
                      : usingBrowserFallback
                        ? t('AIBrowserHandoffCard.fallback', { browser: badge })
                        : t('AIBrowserHandoffCard.notFound'))}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className={styles['manual-instruction']}>
            {item.data.message || t('AIBrowserHandoffCard.finishInBrowser', { browser: badge })}
          </div>
        )}
        <div className={styles.status}>
          <span className={styles.dot} />
          <span>
            {isQrCodeHandoff
              ? pageChanged
                ? t('AIBrowserHandoffCard.pageChangedWaiting')
                : usingBrowserFallback
                  ? t('AIBrowserHandoffCard.fallbackWaiting', { browser: badge })
                  : hasQrCode
                    ? t('AIBrowserHandoffCard.waiting')
                    : t('AIBrowserHandoffCard.waitingPage')
              : t('AIBrowserHandoffCard.waitingForUser')}
          </span>
        </div>
        <div className={styles.actions}>
          <YakitButton size="small" type="primary" loading={actionLoading} onClick={handleResolve}>
            {t('AIBrowserHandoffCard.done')}
          </YakitButton>
          {isQrCodeHandoff && (
            <YakitButton
              size="small"
              type="outline2"
              icon={<OutlineRefreshIcon />}
              loading={loading}
              onClick={() => void loadPresentation()}
            >
              {t('AIBrowserHandoffCard.refresh')}
            </YakitButton>
          )}
          <YakitButton
            size="small"
            type="text2"
            icon={<OutlineExternallinkIcon />}
            disabled={actionLoading}
            onClick={handleFocus}
          >
            {t('AIBrowserHandoffCard.openBrowser', { browser: badge })}
          </YakitButton>
        </div>
        {error && hasQrCode && <div className={styles.error}>{error}</div>}
      </div>
    </ChatCard>
  )
})

AIBrowserHandoffCard.displayName = 'AIBrowserHandoffCard'
