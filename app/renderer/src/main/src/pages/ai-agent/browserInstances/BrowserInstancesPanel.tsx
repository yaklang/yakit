import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  EllipsisOutlined,
  GlobalOutlined,
  LinkOutlined,
  PlusOutlined,
  RightOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { failed, success } from '@/utils/notification'
import {
  approveBrowserExtensionPairing,
  callBrowserExtensionCapability,
  rejectBrowserExtensionPairing,
  type BrowserPairingRequest,
} from '@/pages/browserExtension/browserExtensionClient'
import i18n from '@/i18n/i18n'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import {
  browserInstanceDisplayName,
  browserInstanceMentionName,
  readBrowserThumbnail,
  refreshBrowserInstances,
  selectBrowserInstance,
  useBrowserInstances,
  type AIBrowserInstance,
  type AIBrowserThumbnail,
} from './browserInstanceStore'
import styles from './BrowserInstancesPanel.module.scss'

const openBrowserManagement = () => {
  emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.BrowserExtension }))
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

const formatRelativeTime = (timestamp: number) => {
  const diff = Math.max(0, Date.now() - timestamp)
  if (diff < 60_000) return i18n.t('aiAgent:BrowserInstances.justNow')
  if (diff < 3_600_000) return i18n.t('aiAgent:BrowserInstances.minutesAgo', { count: Math.floor(diff / 60_000) })
  if (diff < 86_400_000) return i18n.t('aiAgent:BrowserInstances.hoursAgo', { count: Math.floor(diff / 3_600_000) })
  return i18n.t('aiAgent:BrowserInstances.daysAgo', { count: Math.floor(diff / 86_400_000) })
}

interface BrowserStatusProps {
  instance: AIBrowserInstance
}

const BrowserStatus: React.FC<BrowserStatusProps> = ({ instance }) => {
  return (
    <span className={classNames(styles['status'], { [styles['status-offline']]: !instance.online })}>
      {i18n.t(instance.online ? 'aiAgent:BrowserInstances.inUse' : 'aiAgent:BrowserInstances.offline')}
    </span>
  )
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
              <div className={styles['preview-loading']}>{loading ? <YakitSpin spinning /> : <GlobalOutlined />}</div>
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
  return (
    <div className={styles['page-preview']}>
      {thumbnail?.dataUrl ? (
        <img className={styles['page-preview-image']} src={thumbnail.dataUrl} alt={thumbnail.title} />
      ) : instance.tab?.favIconUrl ? (
        <img className={styles['page-preview-favicon']} src={instance.tab.favIconUrl} alt="" />
      ) : (
        <GlobalOutlined />
      )}
      {!thumbnail?.dataUrl && (
        <span>
          {instance.tab?.title ||
            (instance.online
              ? i18n.t('aiAgent:BrowserInstances.waitingAuthorization')
              : i18n.t('aiAgent:BrowserInstances.instanceOffline'))}
        </span>
      )}
    </div>
  )
}

const BrowserInstanceCard: React.FC<{ instance: AIBrowserInstance }> = ({ instance }) => {
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
      failed(i18n.t('aiAgent:BrowserInstances.focusFailed', { error: `${error}` }))
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
      title: i18n.t('aiAgent:BrowserInstances.closeTitle'),
      content: i18n.t('aiAgent:BrowserInstances.closeConfirm'),
      onOkText: i18n.t('aiAgent:BrowserInstances.close'),
      showConfirmLoading: true,
      onOk: async () => {
        try {
          await callBrowserExtensionCapability(instance.id, 'browser.instance.close', {}, 8_000)
          modal.destroy()
        } catch (error) {
          failed(i18n.t('aiAgent:BrowserInstances.closeFailed', { error: `${error}` }))
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

  return (
    <div className={styles['browser-card']}>
      <div className={styles['current-main']}>
        <div className={styles['browser-avatar']}>
          {instance.tab?.favIconUrl ? <img src={instance.tab.favIconUrl} alt="" /> : <GlobalOutlined />}
          {instance.identity && (
            <span className={styles['identity-mark']} data-identity={instance.identity}>
              {instance.identity}
            </span>
          )}
        </div>
        <div className={styles['instance-copy']}>
          <div className={styles['instance-title-row']} title={browserInstanceDisplayName(instance)}>
            <span className={styles['instance-title']}>{instance.tab?.title || instance.name}</span>
          </div>
          <div className={styles['instance-url']} title={instance.tab?.url || instance.origin}>
            {instance.tab?.url ||
              (instance.online ? i18n.t('aiAgent:BrowserInstances.noAuthorizedPage') : instance.origin)}
          </div>
          <div className={styles['instance-meta']}>
            <span className={classNames(styles['online-dot'], { [styles['offline-dot']]: !instance.online })} />
            <span>
              {instance.online ? i18n.t('aiAgent:BrowserInstances.online') : formatRelativeTime(instance.lastSeenAt)}
            </span>
            <BrowserStatus instance={instance} />
          </div>
        </div>
        <BrowserPreviewPopover instance={instance} thumbnail={thumbnail} refreshThumbnail={refreshThumbnail}>
          <BrowserCardPreview instance={instance} thumbnail={thumbnail} />
        </BrowserPreviewPopover>
      </div>
      <div className={styles['current-actions']}>
        <YakitButton type="text2" icon={<LinkOutlined />} onClick={() => insertBrowserInstanceMention(instance)}>
          {i18n.t('aiAgent:BrowserInstances.reference')}
        </YakitButton>
        <YakitButton
          type="text2"
          icon={<GlobalOutlined />}
          disabled={!canFocus}
          loading={focusing}
          onClick={focusBrowser}
        >
          {i18n.t('aiAgent:BrowserInstances.focus')}
        </YakitButton>
        <YakitDropdownMenu
          menu={{
            width: 136,
            data: [
              {
                key: 'manage',
                label: i18n.t('aiAgent:BrowserInstances.manage'),
                itemIcon: <SettingOutlined />,
              },
              ...(canClose
                ? [
                    { type: 'divider' as const },
                    {
                      key: 'close',
                      label: i18n.t('aiAgent:BrowserInstances.close'),
                      itemIcon: <CloseOutlined />,
                      type: 'danger' as const,
                    },
                  ]
                : []),
            ],
            onClick: ({ key }) => {
              if (key === 'close') confirmClose()
              else openBrowserManagement()
            },
          }}
          dropdown={{ trigger: ['click'], placement: 'bottomRight' }}
        >
          <YakitButton type="text2" icon={<EllipsisOutlined />} aria-label={i18n.t('aiAgent:BrowserInstances.more')} />
        </YakitDropdownMenu>
      </div>
    </div>
  )
}

const OfflineBrowserInstanceRow: React.FC<{ instance: AIBrowserInstance }> = ({ instance }) => (
  <div className={styles['offline-row']}>
    <div className={styles['browser-avatar']}>
      {instance.tab?.favIconUrl ? <img src={instance.tab.favIconUrl} alt="" /> : <GlobalOutlined />}
      {instance.identity && (
        <span className={styles['identity-mark']} data-identity={instance.identity}>
          {instance.identity}
        </span>
      )}
    </div>
    <div className={styles['instance-copy']}>
      <div className={styles['instance-title']} title={browserInstanceDisplayName(instance)}>
        {instance.tab?.title || instance.name}
      </div>
      <div className={styles['instance-url']} title={instance.tab?.url || instance.origin}>
        {instance.tab?.url || instance.origin}
      </div>
    </div>
    <BrowserStatus instance={instance} />
  </div>
)

const BrowserPairingCard: React.FC<{ request: BrowserPairingRequest }> = ({ request }) => {
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
        i18n.t(approved ? 'aiAgent:BrowserInstances.approved' : 'aiAgent:BrowserInstances.rejected', {
          identity: identity || '',
        }),
      )
    } catch (error) {
      failed(i18n.t('aiAgent:BrowserInstances.pairingFailed', { error: `${error}` }))
    } finally {
      setAction('')
    }
  })

  return (
    <article className={styles['pairing-card']}>
      <div className={styles['pairing-main']}>
        <div className={styles['browser-avatar']}>
          <GlobalOutlined />
          {identity && (
            <span className={styles['identity-mark']} data-identity={identity}>
              {identity}
            </span>
          )}
        </div>
        <div className={styles['pairing-copy']}>
          <strong>
            {i18n.t(
              identity ? 'aiAgent:BrowserInstances.pairingTitleManaged' : 'aiAgent:BrowserInstances.pairingTitle',
              { identity },
            )}
          </strong>
          <span>
            {i18n.t('aiAgent:BrowserInstances.verificationCode')} {request.code.slice(0, 3)} {request.code.slice(3)}
            {' · '}
            {i18n.t('aiAgent:BrowserInstances.expiresIn', { count: seconds })}
          </span>
        </div>
      </div>
      <div className={styles['pairing-actions']}>
        <YakitButton type="outline2" danger disabled={Boolean(action)} onClick={() => void decide(false)}>
          {i18n.t('aiAgent:BrowserInstances.reject')}
        </YakitButton>
        <YakitButton
          type="primary"
          icon={<CheckOutlined />}
          loading={action === 'approve'}
          disabled={seconds <= 0 || action === 'reject'}
          onClick={() => void decide(true)}
        >
          {i18n.t('aiAgent:BrowserInstances.approve')}
        </YakitButton>
      </div>
    </article>
  )
}

export const BrowserInstancesPanel: React.FC = () => {
  const { instances, pending, loading, error } = useBrowserInstances()
  const [offlineExpanded, setOfflineExpanded] = useState(false)
  const online = useMemo(() => instances.filter((instance) => instance.online), [instances])
  const offline = useMemo(() => instances.filter((instance) => !instance.online), [instances])

  return (
    <div className={styles['browser-instances-panel']}>
      <div className={styles['panel-header']}>
        <div>
          <div className={styles['panel-title']}>{i18n.t('aiAgent:BrowserInstances.title')}</div>
          <div className={styles['panel-subtitle']}>{i18n.t('aiAgent:BrowserInstances.subtitle')}</div>
        </div>
        <YakitButton type="outline2" icon={<PlusOutlined />} onClick={openBrowserManagement}>
          {i18n.t('aiAgent:BrowserInstances.add')}
        </YakitButton>
      </div>

      <YakitSpin spinning={loading && !instances.length && !pending.length}>
        <div className={styles['panel-body']}>
          {error && !instances.length && !pending.length ? (
            <div className={styles['empty-state']}>
              <GlobalOutlined />
              <span>{i18n.t('aiAgent:BrowserInstances.readFailed')}</span>
              <YakitButton type="text" onClick={openBrowserManagement}>
                {i18n.t('aiAgent:BrowserInstances.goConnect')}
              </YakitButton>
            </div>
          ) : !instances.length && !pending.length ? (
            <div className={styles['empty-state']}>
              <GlobalOutlined />
              <span>{i18n.t('aiAgent:BrowserInstances.noInstances')}</span>
              <span className={styles['empty-hint']}>{i18n.t('aiAgent:BrowserInstances.emptyHint')}</span>
              <YakitButton type="primary" onClick={openBrowserManagement}>
                {i18n.t('aiAgent:BrowserInstances.connect')}
              </YakitButton>
            </div>
          ) : (
            <>
              {!!online.length && (
                <section className={styles['instance-section']}>
                  <div className={styles['section-title']}>
                    <DownOutlined /> {i18n.t('aiAgent:BrowserInstances.current')}
                  </div>
                  <div className={styles['browser-card-list']}>
                    {online.map((instance) => (
                      <BrowserInstanceCard key={instance.id} instance={instance} />
                    ))}
                  </div>
                </section>
              )}
              {!!pending.length && (
                <section className={styles['instance-section']}>
                  <div className={styles['section-title']}>
                    <RightOutlined /> {i18n.t('aiAgent:BrowserInstances.pendingApproval')}
                  </div>
                  <div className={styles['browser-card-list']}>
                    {pending.map((request) => (
                      <BrowserPairingCard key={request.id} request={request} />
                    ))}
                  </div>
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
                    {offlineExpanded ? <DownOutlined /> : <RightOutlined />}
                    <span>{i18n.t('aiAgent:BrowserInstances.others')}</span>
                    <small>{offline.length}</small>
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

      <button className={styles['manage-all']} type="button" onClick={openBrowserManagement}>
        <span>{i18n.t('aiAgent:BrowserInstances.manageAll')}</span>
        <RightOutlined />
      </button>
    </div>
  )
}
