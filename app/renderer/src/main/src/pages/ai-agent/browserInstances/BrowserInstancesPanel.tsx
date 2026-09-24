import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckOutlined,
  ChevronDownOutlined,
  ChevronRightOutlined,
  CloseOutlined,
  DotsHorizontalOutlined,
  GlobeOutlined,
  PaperAirplaneOutlined,
  QuestionMarkCircleOutlined,
  RefreshOutlined,
  PositionOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { BrowserClientIcon } from './BrowserClientIcon'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { SideSettingButton } from '../aiChatWelcome/AIChatWelcomeSideSetting'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import emiter from '@/utils/eventBus/eventBus'
import { failed, success } from '@/utils/notification'
import {
  approveBrowserExtensionPairing,
  callBrowserExtensionCapability,
  rejectBrowserExtensionPairing,
  requestBrowserExtensionSnapshot,
  type BrowserAutoApprovalError,
  type BrowserPairingRequest,
} from '@/pages/browserExtension/browserExtensionClient'
import { useI18nNamespaces, type TFunction } from '@/i18n/useI18nNamespaces'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import {
  browserInstanceMentionName,
  formatLastSeen,
  readBrowserThumbnail,
  refreshBrowserInstances,
  restoreBrowserHistory,
  selectBrowserInstance,
  useBrowserInstances,
  type AIBrowserInstance,
  type AIBrowserThumbnail,
} from './browserInstanceStore'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import {
  BrowserInstancesGuideEmpty,
  BrowserInstancesGuideManual,
} from './BrowserInstancesGuideEmpty/BrowserInstancesGuideEmpty'
import styles from './BrowserInstancesPanel.module.scss'

export const browserProductLabel = (instance: { client?: string; clientVersion?: string }) => {
  const client = (instance.client || '').trim()
  const version = (instance.clientVersion || '').trim()
  if (!client || /extension|protocol/i.test(client)) return version || client
  if (version && !version.toLowerCase().includes(client.toLowerCase())) return `${client} ${version}`
  return version || client
}

export const pairingSubtitle = (request: BrowserPairingRequest) => {
  const parts = [browserProductLabel(request)].filter(Boolean)
  if (request.managedInstance?.manager === 'ytray') parts.push('YTray')
  else if (request.managedInstance?.manager === 'yakit') parts.push('Yakit')
  return parts.join(' · ')
}

export const openPairingWindow = async (t: TFunction) => {
  try {
    await requestBrowserExtensionSnapshot('POST', '/pairing-window', { ttlSeconds: 120 })
    await refreshBrowserInstances(true)
    success(t('BrowserInstances.pairingWindowOpened'))
  } catch (error) {
    failed(t('BrowserInstances.pairingWindowFailed', { error: `${error}` }))
  }
}

export const browserInstanceMention = (instance: AIBrowserInstance): AIMentionCommandParams => ({
  mentionId: instance.id,
  mentionType: 'browser',
  mentionName: browserInstanceMentionName(instance),
})

export const insertBrowserInstanceMention = (instance: AIBrowserInstance) => {
  selectBrowserInstance(instance.id)
  emiter.emit(
    'setAIInputByType',
    JSON.stringify({
      type: 'mention',
      params: browserInstanceMention(instance),
    }),
  )
}

interface BrowserStatusProps {
  instance: AIBrowserInstance
}

const BrowserStatus: React.FC<BrowserStatusProps> = ({ instance }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  return (
    <span className={classNames(styles['status'], { [styles['status-offline']]: !instance.online })}>
      {t(instance.online ? 'BrowserInstances.inUse' : 'BrowserInstances.offline')}
    </span>
  )
}

const BrowserFavicon: React.FC<{ src?: string; className?: string }> = ({ src, className }) => {
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    setBroken(false)
  }, [src])
  if (!src || broken) return <GlobeOutlined className={className} color="currentColor" />
  return <img className={className} src={src} alt="" onError={() => setBroken(true)} />
}

const thumbnailCache = new Map<string, AIBrowserThumbnail>()
const thumbnailRequests = new Map<string, Promise<AIBrowserThumbnail | undefined>>()
const THUMBNAIL_CACHE_TTL = 4_000
const THUMBNAIL_REFRESH_INTERVAL = 5_000

const thumbnailCacheKey = (instance: AIBrowserInstance) =>
  `${instance.id}:${instance.tab?.id || 0}:${instance.tab?.url || ''}`

const loadBrowserThumbnail = (instance: AIBrowserInstance) => {
  const key = thumbnailCacheKey(instance)
  const cached = thumbnailCache.get(key)
  if (cached && Date.now() - cached.capturedAt < THUMBNAIL_CACHE_TTL) return Promise.resolve(cached)
  const pending = thumbnailRequests.get(key)
  if (pending) return pending
  const request = readBrowserThumbnail(instance)
    .then((thumbnail) => {
      if (!thumbnail) return undefined
      thumbnailCache.set(key, thumbnail)
      if (thumbnailCache.size > 12) thumbnailCache.delete(thumbnailCache.keys().next().value!)
      return thumbnail
    })
    .finally(() => thumbnailRequests.delete(key))
  thumbnailRequests.set(key, request)
  return request
}

const BrowserPreviewPopover: React.FC<
  React.PropsWithChildren<{
    instance: AIBrowserInstance
    thumbnail?: AIBrowserThumbnail
    refreshThumbnail: () => Promise<AIBrowserThumbnail | undefined>
  }>
> = ({ instance, thumbnail, refreshThumbnail, children }) => {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)
  const canCapture = Boolean(
    instance.online && instance.tab?.active && (instance.connection?.capabilities || []).includes('browser.thumbnail'),
  )
  const canPreview = Boolean(thumbnail?.dataUrl || canCapture)

  const onVisibleChange = (next: boolean) => {
    setVisible(next)
    if (!next || !canCapture) return
    const currentRequest = ++requestId.current
    setLoading(true)
    void refreshThumbnail()
      .catch(() => undefined)
      .finally(() => {
        if (requestId.current === currentRequest) setLoading(false)
      })
  }

  if (!canPreview) return <>{children}</>
  return (
    <YakitPopover
      placement="rightTop"
      trigger="hover"
      visible={visible}
      mouseEnterDelay={0.18}
      mouseLeaveDelay={0.08}
      onVisibleChange={onVisibleChange}
      overlayClassName={styles['preview-popover-overlay']}
      destroyTooltipOnHide
      content={
        <div className={styles['preview-popover']}>
          <div className={styles['preview-canvas']}>
            {thumbnail?.dataUrl ? (
              <img src={thumbnail.dataUrl} alt={thumbnail.title} />
            ) : (
              <div className={styles['preview-loading']}>
                {loading ? <YakitSpin spinning /> : <GlobeOutlined color="currentColor" />}
              </div>
            )}
          </div>
          <div className={styles['preview-caption']} title={instance.tab?.title}>
            {instance.identity && <span>{instance.identity}</span>}
            <strong>{instance.tab?.title}</strong>
          </div>
        </div>
      }
    >
      <span className={styles['preview-trigger']}>{children}</span>
    </YakitPopover>
  )
}

const BrowserCardPreview: React.FC<{
  instance: AIBrowserInstance
  thumbnail?: AIBrowserThumbnail
}> = ({ instance, thumbnail }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  return (
    <div className={styles['page-preview']}>
      {thumbnail?.dataUrl ? (
        <img className={styles['page-preview-image']} src={thumbnail.dataUrl} alt={thumbnail.title} />
      ) : (
        <BrowserFavicon src={instance.tab?.favIconUrl} className={styles['page-preview-favicon']} />
      )}
      {!thumbnail?.dataUrl && (
        <span>
          {instance.tab?.title ||
            (instance.online ? t('BrowserInstances.waitingAuthorization') : t('BrowserInstances.instanceOffline'))}
        </span>
      )}
    </div>
  )
}

const BrowserInstanceCard: React.FC<{ instance: AIBrowserInstance }> = ({ instance }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [focusing, setFocusing] = useState(false)
  const thumbnailKey = thumbnailCacheKey(instance)
  const thumbnailRequestId = useRef(0)
  const [thumbnail, setThumbnail] = useState<AIBrowserThumbnail | undefined>(() => thumbnailCache.get(thumbnailKey))
  const canFocus = Boolean(
    instance.online && instance.tab && (instance.connection?.capabilities || []).includes('browser.takeover'),
  )
  const canClose = Boolean(
    instance.online && (instance.connection?.capabilities || []).includes('browser.instance.close'),
  )
  const canThumbnail = Boolean(
    instance.online && instance.tab?.active && (instance.connection?.capabilities || []).includes('browser.thumbnail'),
  )
  const focusBrowser = useMemoizedFn(async () => {
    if (!canFocus || !instance.tab) return
    setFocusing(true)
    try {
      await callBrowserExtensionCapability(
        instance.id,
        'browser.takeover',
        { tabId: instance.tab.id, frameId: 0 },
        15_000,
      )
    } catch (error) {
      failed(t('BrowserInstances.focusFailed', { error: `${error}` }))
    } finally {
      setFocusing(false)
    }
  })
  const refreshThumbnail = useMemoizedFn(async () => {
    const currentRequest = ++thumbnailRequestId.current
    const value = await loadBrowserThumbnail(instance)
    if (thumbnailRequestId.current === currentRequest && value) setThumbnail(value)
    return value
  })
  const confirmClose = useMemoizedFn(() => {
    const modal = YakitModalConfirm({
      width: 430,
      title: t('BrowserInstances.closeTitle'),
      content: t('BrowserInstances.closeConfirm'),
      onOkText: t('BrowserInstances.close'),
      showConfirmLoading: true,
      onOk: async () => {
        try {
          await callBrowserExtensionCapability(instance.id, 'browser.instance.close', {}, 8_000)
          modal.destroy()
        } catch (error) {
          failed(t('BrowserInstances.closeFailed', { error: `${error}` }))
        }
      },
    })
  })

  useEffect(() => {
    thumbnailRequestId.current += 1
    setThumbnail(thumbnailCache.get(thumbnailKey))
    if (!canThumbnail) return
    let timer: number | undefined
    let cancelled = false
    const refresh = async () => {
      try {
        await refreshThumbnail()
        if (!cancelled) timer = window.setTimeout(() => void refresh(), THUMBNAIL_REFRESH_INTERVAL)
      } catch {
        // A failed preview is terminal until the tab changes or the user retries by hovering.
      }
    }
    void refresh()
    return () => {
      cancelled = true
      thumbnailRequestId.current += 1
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [canThumbnail, thumbnailKey, refreshThumbnail])

  const productLabel = browserProductLabel(instance)
  const moreMenu = (
    <YakitDropdownMenu
      menu={{
        width: 136,
        data: [
          ...(canClose
            ? [
                {
                  key: 'close',
                  label: t('BrowserInstances.close'),
                  itemIcon: <CloseOutlined color="currentColor" />,
                  type: 'danger' as const,
                },
              ]
            : []),
        ],
        onClick: ({ key }) => {
          if (key === 'close') confirmClose()
        },
      }}
      dropdown={{ trigger: ['click'], placement: 'bottomRight' }}
    >
      <YakitButton
        type="text2"
        size="small"
        icon={<DotsHorizontalOutlined color="currentColor" />}
        aria-label={t('BrowserInstances.more')}
      />
    </YakitDropdownMenu>
  )

  return (
    <div className={styles['browser-card']} data-identity={instance.identity || undefined}>
      <BrowserPreviewPopover instance={instance} thumbnail={thumbnail} refreshThumbnail={refreshThumbnail}>
        <span className={styles['preview-shell']}>
          <BrowserCardPreview instance={instance} thumbnail={thumbnail} />
          {instance.identity && (
            <span className={styles['identity-mark']} data-identity={instance.identity}>
              {instance.identity}
            </span>
          )}
        </span>
      </BrowserPreviewPopover>
      <div className={styles['card-body']}>
        <div className={styles['card-header']}>
          <span className={styles['instance-title']} title={instance.tab?.title || instance.name}>
            {instance.tab?.title || instance.name}
          </span>
          <div className={styles['card-actions']}>
            <YakitButton
              type="text2"
              icon={<PaperAirplaneOutlined color="currentColor" />}
              aria-label={t('BrowserInstances.reference')}
              onClick={() => insertBrowserInstanceMention(instance)}
            />
            <YakitButton
              type="text2"
              icon={<PositionOutlined color="currentColor" />}
              disabled={!canFocus}
              loading={focusing}
              aria-label={t('BrowserInstances.focus')}
              onClick={focusBrowser}
            />
            {moreMenu}
          </div>
        </div>
        <div className={styles['instance-url-row']} title={instance.tab?.url || instance.origin}>
          <BrowserFavicon src={instance.tab?.favIconUrl} />
          <span className={styles['instance-url']}>
            {instance.tab?.url || (instance.online ? t('BrowserInstances.noAuthorizedPage') : instance.origin)}
          </span>
        </div>
        <div className={styles['instance-meta']}>
          <BrowserStatus instance={instance} />
          {!!productLabel && <span className={styles['browser-product']}>{productLabel}</span>}
        </div>
      </div>
    </div>
  )
}

const BrowserHistoryRow: React.FC<{ instance: YTrayBrowserHistoryInstance; disabled?: boolean }> = ({
  instance,
  disabled,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [restoring, setRestoring] = useState(false)
  const restore = useMemoizedFn(async () => {
    if (restoring || disabled) return
    setRestoring(true)
    try {
      await restoreBrowserHistory(instance.id)
      await refreshBrowserInstances(true)
      success(t('BrowserInstances.restoreStarted', { name: instance.name }))
    } catch (error) {
      failed(t('BrowserInstances.restoreFailed', { error: `${error}` }))
    } finally {
      setRestoring(false)
    }
  })
  const title = instance.pageTitle || instance.name
  const url = instance.pageUrl || instance.startUrl

  return (
    <div className={styles['offline-row']}>
      <div className={styles['browser-avatar']}>
        <BrowserClientIcon client={instance.runtime} size={18} />
        {instance.badge && (
          <span className={styles['identity-mark']} data-identity={instance.badge}>
            {instance.badge}
          </span>
        )}
      </div>
      <div className={styles['offline-copy']}>
        <div className={styles['offline-title-row']}>
          <span className={styles['instance-title']} title={title}>
            {title}
          </span>
          <div className={styles['offline-actions']}>
            <YakitButton
              type="outline2"
              size="small"
              icon={<RefreshOutlined color="currentColor" />}
              loading={restoring}
              disabled={disabled}
              aria-label={t('BrowserInstances.restore')}
              onClick={() => void restore()}
            >
              {t('BrowserInstances.restore')}
            </YakitButton>
          </div>
        </div>
        <div className={styles['instance-url']} title={url}>
          {url || instance.runtime}
        </div>
        <div className={styles['offline-last-seen']}>
          {t('BrowserInstances.lastStarted', { time: formatLastSeen(instance.startedAt) })}
        </div>
      </div>
    </div>
  )
}

const BrowserPairingCard: React.FC<{
  request: BrowserPairingRequest
  autoApprovalError?: BrowserAutoApprovalError
}> = ({ request, autoApprovalError }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [action, setAction] = useState<'approve' | 'reject' | ''>('')
  const [clock, setClock] = useState(request.createdAt)
  const identity = request.managedInstance?.badge
  const seconds = Math.max(0, Math.ceil((request.expiresAt - clock) / 1_000))
  useEffect(() => {
    const update = () => setClock(Date.now())
    const initialTimer = window.setTimeout(update, 0)
    const timer = window.setInterval(update, 1_000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
    }
  }, [])
  const decide = useMemoizedFn(async (approved: boolean) => {
    setAction(approved ? 'approve' : 'reject')
    try {
      if (approved) await approveBrowserExtensionPairing(request)
      else await rejectBrowserExtensionPairing(request)
      await refreshBrowserInstances(true)
      success(
        t(approved ? 'BrowserInstances.approved' : 'BrowserInstances.rejected', {
          identity: identity || '',
        }),
      )
    } catch (error) {
      failed(t('BrowserInstances.pairingFailed', { error: `${error}` }))
    } finally {
      setAction('')
    }
  })

  const subtitle = pairingSubtitle(request)
  const code = `${request.code.slice(0, 3)} ${request.code.slice(3)}`.trim()

  return (
    <article className={styles['pairing-card']}>
      <div className={styles['pairing-body']}>
        <div className={styles['pairing-avatar']}>
          <BrowserClientIcon client={request.client} size={22} />
          {identity && (
            <span className={styles['identity-mark']} data-identity={identity}>
              {identity}
            </span>
          )}
        </div>
        <div className={styles['pairing-copy']}>
          <div className={styles['pairing-title']}>
            {t(identity ? 'BrowserInstances.pairingTitleManaged' : 'BrowserInstances.pairingTitle', { identity })}
          </div>
          {!!subtitle && (
            <span className={styles['pairing-meta']} title={subtitle}>
              {subtitle}
            </span>
          )}
          <div className={styles['pairing-code-row']}>
            <YakitTag size="small" className={styles['pairing-code']}>
              {t('BrowserInstances.verificationCode')} {code}
            </YakitTag>
            <span className={styles['pairing-expire']}>{t('BrowserInstances.expiresIn', { count: seconds })}</span>
          </div>
        </div>
      </div>
      {autoApprovalError && (
        <div className={styles['pairing-auto-error']} role="status">
          {autoApprovalError.kind === 'ytray-unavailable'
            ? t('BrowserInstances.autoApprovalUnavailable', { error: autoApprovalError.message || '' })
            : autoApprovalError.kind === 'unverified'
              ? t('BrowserInstances.autoApprovalUnverified')
              : t('BrowserInstances.autoApprovalFailed', { error: autoApprovalError.message || '' })}
        </div>
      )}
      <div className={styles['pairing-actions']}>
        <YakitButton
          type="text2"
          className={styles['pairing-action-btn']}
          icon={<XOutlined color="currentColor" />}
          loading={action === 'reject'}
          disabled={Boolean(action)}
          onClick={() => void decide(false)}
        >
          {t('BrowserInstances.reject')}
        </YakitButton>
        <YakitButton
          type="text2"
          className={styles['pairing-action-btn']}
          icon={<CheckOutlined color="currentColor" />}
          loading={action === 'approve'}
          disabled={seconds <= 0 || action === 'reject'}
          onClick={() => void decide(true)}
        >
          {t('BrowserInstances.approve')}
        </YakitButton>
      </div>
    </article>
  )
}

export const BrowserInstancesPanel: React.FC = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { instances, history, historyError, pending, loading, error, autoApprovalErrors } = useBrowserInstances()
  const [onlineExpanded, setOnlineExpanded] = useState(true)
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [manualVisible, setManualVisible] = useState(false)
  const online = useMemo(() => instances.filter((instance) => instance.online), [instances])
  const hasContent = Boolean(online.length || pending.length || history.length || historyError)
  const handleOpenPairingWindow = useMemoizedFn(async () => {
    if (pairingLoading) return
    setPairingLoading(true)
    try {
      await openPairingWindow(t)
    } finally {
      setPairingLoading(false)
    }
  })
  return (
    <div className={styles['browser-instances-panel']}>
      <div className={styles['panel-header']}>
        <div>
          <div className={styles['panel-title']}>{t('BrowserInstances.title')}</div>
          <div className={styles['panel-subtitle']}>{t('BrowserInstances.subtitle')}</div>
        </div>
        <div className={styles['header-actions']}>
          <SideSettingButton type="text2" size="small" />
          <YakitButton
            type="text2"
            icon={<QuestionMarkCircleOutlined color="currentColor" />}
            size="small"
            onClick={() => setManualVisible(true)}
          >
            {t('BrowserInstances.connectionHelp')}
          </YakitButton>
          <YakitButton
            type="text2"
            icon={<RefreshOutlined color="currentColor" />}
            size="small"
            loading={loading}
            aria-label={t('BrowserInstances.refresh')}
            onClick={() => void refreshBrowserInstances()}
          />
        </div>
      </div>

      <YakitSpin spinning={loading && !hasContent}>
        <div className={styles['panel-body']}>
          {!!error && (
            <div className={styles['service-unavailable']} role="alert">
              <GlobeOutlined color="currentColor" />
              <div>
                <strong>{t('BrowserInstances.bridgeUnavailable')}</strong>
                <span title={error}>{error}</span>
              </div>
              <YakitButton type="text2" size="small" onClick={() => void refreshBrowserInstances()}>
                {t('BrowserInstances.retry')}
              </YakitButton>
            </div>
          )}
          {!hasContent ? (
            <BrowserInstancesGuideEmpty onOpenManual={() => setManualVisible(true)} />
          ) : (
            <>
              {!!historyError && (
                <div className={styles['service-unavailable']} role="status">
                  <GlobeOutlined color="currentColor" />
                  <div>
                    <strong>{t('BrowserInstances.ytrayUnavailable')}</strong>
                    <span>{t('BrowserInstances.ytrayUnavailableHint')}</span>
                  </div>
                  <YakitButton type="text2" size="small" onClick={() => void refreshBrowserInstances()}>
                    {t('BrowserInstances.retry')}
                  </YakitButton>
                </div>
              )}
              {!!pending.length && (
                <section className={styles['instance-section']}>
                  <button
                    type="button"
                    className={styles['section-toggle']}
                    onClick={() => setPendingExpanded((value) => !value)}
                    aria-expanded={pendingExpanded}
                  >
                    {pendingExpanded ? (
                      <ChevronDownOutlined color="currentColor" size={9} />
                    ) : (
                      <ChevronRightOutlined color="currentColor" size={9} />
                    )}
                    <span>{t('BrowserInstances.pendingApproval')}</span>
                    <YakitTag fullRadius size="small">
                      {pending.length}
                    </YakitTag>
                  </button>
                  {pendingExpanded && (
                    <div className={styles['browser-card-list']}>
                      {pending.map((request) => (
                        <BrowserPairingCard
                          key={request.id}
                          request={request}
                          autoApprovalError={autoApprovalErrors[request.id]}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
              {!!online.length && (
                <section className={styles['instance-section']}>
                  <button
                    type="button"
                    className={styles['section-toggle']}
                    onClick={() => setOnlineExpanded((value) => !value)}
                    aria-expanded={onlineExpanded}
                  >
                    {onlineExpanded ? (
                      <ChevronDownOutlined color="currentColor" size={9} />
                    ) : (
                      <ChevronRightOutlined color="currentColor" size={9} />
                    )}
                    <span>{t('BrowserInstances.current')}</span>
                    <YakitTag fullRadius size="small">
                      {online.length}
                    </YakitTag>
                  </button>
                  {onlineExpanded && (
                    <div className={styles['browser-card-list']}>
                      {online.map((instance) => (
                        <BrowserInstanceCard key={instance.id} instance={instance} />
                      ))}
                    </div>
                  )}
                </section>
              )}
              {!!history.length && (
                <section className={styles['instance-section']}>
                  <button
                    type="button"
                    className={styles['section-toggle']}
                    onClick={() => setHistoryExpanded((value) => !value)}
                    aria-expanded={historyExpanded}
                  >
                    {historyExpanded ? (
                      <ChevronDownOutlined color="currentColor" size={9} />
                    ) : (
                      <ChevronRightOutlined color="currentColor" size={9} />
                    )}
                    <span>{t('BrowserInstances.others')}</span>
                    <YakitTag fullRadius size="small">
                      {history.length}
                    </YakitTag>
                  </button>
                  {historyExpanded && (
                    <div className={styles['offline-list']}>
                      {history.map((instance) => (
                        <BrowserHistoryRow key={instance.id} instance={instance} disabled={Boolean(historyError)} />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </YakitSpin>
      <BrowserInstancesGuideManual open={manualVisible} onClose={() => setManualVisible(false)} />
    </div>
  )
}
