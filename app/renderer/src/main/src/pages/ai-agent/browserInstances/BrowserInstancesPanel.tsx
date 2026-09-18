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
  PencilOutlined,
  QuestionMarkCircleOutlined,
  RefreshOutlined,
  TrashOutlined,
  PositionOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { BrowserClientIcon } from './BrowserClientIcon'
import { Tooltip, type InputRef } from 'antd'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
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
  type BrowserPairingRequest,
} from '@/pages/browserExtension/browserExtensionClient'
import { useI18nNamespaces, type TFunction } from '@/i18n/useI18nNamespaces'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import {
  browserInstanceMentionName,
  formatLastSeen,
  readBrowserThumbnail,
  refreshBrowserInstances,
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

export const renameBrowserDevice = async (id: string, nextName: string, t: TFunction) => {
  const name = nextName.trim()
  if (!name) return false
  await requestBrowserExtensionSnapshot('POST', `/devices/${id}`, { name })
  await refreshBrowserInstances(true)
  success(t('BrowserInstances.renameSuccess'))
  return true
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
    <div className={styles['browser-card']}>
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

const OfflineBrowserInstanceRow: React.FC<{ instance: AIBrowserInstance }> = ({ instance }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [editing, setEditing] = useState(false)
  const [editingName, setEditingName] = useState(instance.name)
  const [mutating, setMutating] = useState(false)
  const nameInputRef = useRef<InputRef>(null)
  useEffect(() => {
    if (!editing) return
    const timer = window.setTimeout(() => nameInputRef.current?.focus({ cursor: 'all' }), 50)
    return () => window.clearTimeout(timer)
  }, [editing])

  const saveName = useMemoizedFn(async () => {
    if (!editingName.trim() || editingName.trim() === instance.name) {
      setEditing(false)
      setEditingName(instance.name)
      return
    }
    setMutating(true)
    try {
      await renameBrowserDevice(instance.id, editingName, t)
      setEditing(false)
    } catch (error) {
      failed(t('BrowserInstances.renameFailed', { error: `${error}` }))
    } finally {
      setMutating(false)
    }
  })

  const removeDevice = useMemoizedFn(() => {
    const modal = YakitModalConfirm({
      width: 420,
      title: t('BrowserInstances.removeOfflineTitle'),
      content: t('BrowserInstances.removeOfflineConfirm', { name: instance.name }),
      onOkText: t('BrowserInstances.removeOfflineOk'),
      showConfirmLoading: true,
      onOk: async () => {
        try {
          await requestBrowserExtensionSnapshot('DELETE', `/devices/${instance.id}`)
          await refreshBrowserInstances(true)
          success(t('BrowserInstances.removeOfflineSuccess'))
          modal.destroy()
        } catch (error) {
          failed(t('BrowserInstances.removeFailed', { error: `${error}` }))
        }
      },
    })
  })

  return (
    <div className={styles['offline-row']}>
      <div className={styles['browser-avatar']}>
        <BrowserClientIcon client={instance.client} size={18} />
        {instance.identity && (
          <span className={styles['identity-mark']} data-identity={instance.identity}>
            {instance.identity}
          </span>
        )}
      </div>
      <div className={styles['offline-copy']}>
        <div className={styles['offline-title-row']}>
          {editing ? (
            <YakitInput
              ref={nameInputRef}
              size="small"
              wrapperClassName={styles['name-input']}
              value={editingName}
              maxLength={80}
              autoFocus
              onChange={(event) => setEditingName(event.target.value)}
              onPressEnter={() => void saveName()}
            />
          ) : (
            <span className={styles['instance-title']} title={instance.name}>
              {instance.name}
            </span>
          )}
          <div className={styles['offline-actions']}>
            {editing ? (
              <>
                <YakitButton
                  type="text2"
                  icon={<XOutlined color="currentColor" />}
                  disabled={mutating}
                  onClick={() => {
                    setEditingName(instance.name)
                    setEditing(false)
                  }}
                />
                <YakitButton
                  type="text2"
                  icon={<CheckOutlined color="currentColor" />}
                  loading={mutating}
                  onClick={() => void saveName()}
                />
              </>
            ) : (
              <>
                <div className={styles['offline-hover-actions']}>
                  <YakitButton
                    type="text2"
                    icon={<PencilOutlined color="currentColor" />}
                    aria-label={t('BrowserInstances.rename')}
                    onClick={() => {
                      setEditingName(instance.name)
                      setEditing(true)
                    }}
                  />
                  <YakitButton
                    type="text2"
                    danger
                    icon={<TrashOutlined color="currentColor" />}
                    aria-label={t('BrowserInstances.remove')}
                    onClick={removeDevice}
                  />
                </div>
                <BrowserStatus instance={instance} />
              </>
            )}
          </div>
        </div>
        <div className={styles['instance-url']} title={instance.origin}>
          {instance.origin}
        </div>
        <div className={styles['offline-last-seen']}>
          {t('BrowserInstances.lastSeen', { time: formatLastSeen(instance.lastSeenAt) })}
        </div>
      </div>
    </div>
  )
}

const BrowserPairingCard: React.FC<{ request: BrowserPairingRequest }> = ({ request }) => {
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
  const { instances, pending, loading, error } = useBrowserInstances()
  const [onlineExpanded, setOnlineExpanded] = useState(true)
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [offlineExpanded, setOfflineExpanded] = useState(false)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [manualVisible, setManualVisible] = useState(false)
  const online = useMemo(() => instances.filter((instance) => instance.online), [instances])
  const offline = useMemo(() => instances.filter((instance) => !instance.online), [instances])
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
          <div className={styles['panel-title-row']}>
            <div className={styles['panel-title']}>{t('BrowserInstances.title')}</div>
            <Tooltip title={t('BrowserInstances.guideOpenHint')}>
              <YakitButton
                type="text2"
                size="small"
                icon={<QuestionMarkCircleOutlined color="currentColor" />}
                className={styles['panel-guide-icon']}
                aria-label={t('BrowserInstances.guideOpenHint')}
                onClick={() => setManualVisible(true)}
              />
            </Tooltip>
          </div>
          <div className={styles['panel-subtitle']}>{t('BrowserInstances.subtitle')}</div>
        </div>
        <div className={styles['header-actions']}>
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

      <YakitSpin spinning={loading && !instances.length && !pending.length}>
        <div className={styles['panel-body']}>
          {error && !instances.length && !pending.length ? (
            <div className={styles['empty-state']}>
              <GlobeOutlined color="currentColor" size={30} />
              <span>{t('BrowserInstances.readFailed')}</span>
              <YakitButton type="text" loading={pairingLoading} onClick={() => void handleOpenPairingWindow()}>
                {t('BrowserInstances.goConnect')}
              </YakitButton>
            </div>
          ) : !instances.length && !pending.length ? (
            <BrowserInstancesGuideEmpty onOpenManual={() => setManualVisible(true)} />
          ) : (
            <>
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
                        <BrowserPairingCard key={request.id} request={request} />
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
              {!!offline.length && (
                <section className={styles['instance-section']}>
                  <button
                    type="button"
                    className={styles['section-toggle']}
                    onClick={() => setOfflineExpanded((value) => !value)}
                    aria-expanded={offlineExpanded}
                  >
                    {offlineExpanded ? (
                      <ChevronDownOutlined color="currentColor" size={9} />
                    ) : (
                      <ChevronRightOutlined color="currentColor" size={9} />
                    )}
                    <span>{t('BrowserInstances.others')}</span>
                    <YakitTag fullRadius size="small">
                      {offline.length}
                    </YakitTag>
                  </button>
                  {offlineExpanded && (
                    <div className={styles['offline-list']}>
                      {offline.map((instance) => (
                        <OfflineBrowserInstanceRow key={instance.id} instance={instance} />
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
