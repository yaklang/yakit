import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircleOutlined,
  ChromeOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { AIAgentTabListEnum, SwitchAIAgentTabEventEnum } from '@/pages/ai-agent/defaultConstant'
import {
  callBrowserExtensionCapability,
  getBrowserExtensionSnapshot,
  type BrowserBridgeConnection,
  type PairedBrowserDevice,
} from '@/pages/browserExtension/browserExtensionClient'
import {
  toBrowserTransformSelection,
  type BrowserTransformSelectionContract,
} from '@/pages/browserExtension/browserTransformContract'
import styles from './BrowserTransformSelector.module.scss'

export type BrowserTransformSelection = BrowserTransformSelectionContract

interface BrowserTransformProfile {
  id: string
  name: string
  enabled: boolean
  origin: string
  match: { methods: string[]; urlPattern: string }
  request: { enabled: boolean; nodes: unknown[] }
  response: { enabled: boolean; nodes: unknown[] }
  maxConcurrency: number
}

interface DeviceProfiles {
  device: PairedBrowserDevice
  connection: BrowserBridgeConnection
  profiles: BrowserTransformProfile[]
  error?: string
}

interface BrowserTransformSelectorProps {
  value?: BrowserTransformSelection
  onChange: (value?: BrowserTransformSelection) => void
}

export const BrowserTransformSelector: React.FC<BrowserTransformSelectorProps> = React.memo(({ value, onChange }) => {
  const { t } = useI18nNamespaces(['webFuzzer'])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [devices, setDevices] = useState<DeviceProfiles[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const snapshot = await getBrowserExtensionSnapshot()
      const connections = new Map(
        (snapshot.status?.connections || []).map((connection) => [connection.deviceId, connection]),
      )
      const online = snapshot.devices
        .map((device) => ({ device, connection: connections.get(device.id) }))
        .filter((item): item is { device: PairedBrowserDevice; connection: BrowserBridgeConnection } =>
          Boolean(item.connection),
        )
      const loaded = await Promise.all(
        online.map(async ({ device, connection }) => {
          if (!connection.capabilities.includes('browser.transform.profile.list')) {
            return {
              device,
              connection,
              profiles: [],
              error: t('BrowserTransformSelector.capabilityUnsupported'),
            }
          }
          try {
            const profiles = await callBrowserExtensionCapability<BrowserTransformProfile[]>(
              device.id,
              'browser.transform.profile.list',
              {},
              15_000,
            )
            return { device, connection, profiles: profiles.filter((profile) => profile.enabled) }
          } catch (loadError) {
            return { device, connection, profiles: [], error: `${loadError}` }
          }
        }),
      )
      setDevices(loaded)
      setError(
        snapshot.status?.running ? '' : snapshot.status?.lastError || t('BrowserTransformSelector.bridgeNotRunning'),
      )
    } catch (loadError) {
      setDevices([])
      setError(`${loadError}`)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
    const refresh = () => void load()
    emiter.on('onBrowserExtensionChanged', refresh)
    return () => emiter.off('onBrowserExtensionChanged', refresh)
  }, [load])

  useEffect(() => {
    if (open) void load()
  }, [load, open])

  const selected = useMemo(() => {
    if (!value) return undefined
    for (const item of devices) {
      const profile = item.profiles.find((candidate) => candidate.id === value.profileId)
      if (item.device.id === value.deviceId && profile) return { item, profile }
    }
    return undefined
  }, [devices, value])

  // 无在线浏览器且未选中配置时不展示入口
  if (!loading && !devices.length && !value) {
    return null
  }

  const content = (
    <div className={styles['gateway-popover']}>
      <header>
        <div>
          <ChromeOutlined />
          <span>
            <strong>{t('BrowserTransformSelector.title')}</strong>
            <small>{t('BrowserTransformSelector.onlineCount', { count: devices.length })}</small>
          </span>
        </div>
        <YakitButton type="text2" icon={<ReloadOutlined spin={loading} />} onClick={() => void load()} />
      </header>
      <div className={styles['gateway-device-list']}>
        {devices.map((item) => (
          <section key={item.device.id}>
            <div className={styles['gateway-device-head']}>
              <span>
                <i />
                <strong>{item.device.name}</strong>
              </span>
              <small>{item.device.clientVersion}</small>
            </div>
            {item.error ? (
              <div className={styles['gateway-device-error']}>
                <DisconnectOutlined />
                <span>{item.error}</span>
              </div>
            ) : item.profiles.length ? (
              <div className={styles['gateway-profile-list']}>
                {item.profiles.map((profile) => {
                  const active = value?.deviceId === item.device.id && value.profileId === profile.id
                  return (
                    <button
                      key={profile.id}
                      className={active ? styles.active : ''}
                      onClick={() => {
                        onChange(toBrowserTransformSelection(item.device, profile))
                        setOpen(false)
                      }}
                    >
                      <span>
                        <strong>{profile.name}</strong>
                        <small>
                          {profile.match.methods.join(' / ') || 'ANY'} · {profile.match.urlPattern}
                        </small>
                      </span>
                      <span className={styles['gateway-directions']}>
                        <i className={profile.request.enabled ? styles.enabled : ''}>
                          {t('BrowserTransformSelector.request')}
                        </i>
                        <i className={profile.response.enabled ? styles.enabled : ''}>
                          {t('BrowserTransformSelector.response')}
                        </i>
                      </span>
                      {active ? <CheckCircleOutlined /> : <RightOutlined />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className={styles['gateway-device-empty']}>{t('BrowserTransformSelector.noProfiles')}</div>
            )}
          </section>
        ))}
        {!devices.length && (
          <div className={styles['gateway-empty']}>
            <DisconnectOutlined />
            <strong>{t('BrowserTransformSelector.emptyTitle')}</strong>
            <span>{error || t('BrowserTransformSelector.emptyHint')}</span>
          </div>
        )}
      </div>
      <footer>
        <YakitButton
          type="text"
          onClick={() => {
            emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_Agent }))
            setTimeout(() => {
              emiter.emit(
                'switchAIAgentTab',
                JSON.stringify({
                  type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
                  params: { active: AIAgentTabListEnum.Browser, show: true },
                }),
              )
            }, 100)
            setOpen(false)
          }}
        >
          {t('BrowserTransformSelector.openInstances')}
        </YakitButton>
      </footer>
    </div>
  )

  return (
    <YakitPopover
      placement="bottomLeft"
      trigger="click"
      visible={open}
      onVisibleChange={setOpen}
      content={content}
      overlayClassName={styles['gateway-overlay']}
    >
      {value ? (
        <YakitTag
          color={selected ? 'success' : 'warning'}
          closable
          onClose={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onChange(undefined)
          }}
          className={styles['gateway-active-tag']}
        >
          <ChromeOutlined />
          <span>{selected?.profile.name || value.profileName}</span>
        </YakitTag>
      ) : (
        <YakitButton type="text2" icon={<ChromeOutlined />}>
          {t('BrowserTransformSelector.entry')}
        </YakitButton>
      )}
    </YakitPopover>
  )
})

BrowserTransformSelector.displayName = 'BrowserTransformSelector'
