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
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
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
            return { device, connection, profiles: [], error: '当前插件构建不支持浏览器明文网关' }
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
      setError(snapshot.status?.running ? '' : snapshot.status?.lastError || '浏览器 Bridge 未运行')
    } catch (loadError) {
      setDevices([])
      setError(`${loadError}`)
    } finally {
      setLoading(false)
    }
  }, [])

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

  const content = (
    <div className={styles['gateway-popover']}>
      <header>
        <div>
          <ChromeOutlined />
          <span>
            <strong>浏览器明文网关</strong>
            <small>{devices.length} 个在线浏览器</small>
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
                        <i className={profile.request.enabled ? styles.enabled : ''}>请求</i>
                        <i className={profile.response.enabled ? styles.enabled : ''}>响应</i>
                      </span>
                      {active ? <CheckCircleOutlined /> : <RightOutlined />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className={styles['gateway-device-empty']}>当前共享文档没有可用转换配置</div>
            )}
          </section>
        ))}
        {!devices.length && (
          <div className={styles['gateway-empty']}>
            <DisconnectOutlined />
            <strong>没有在线浏览器</strong>
            <span>{error || '连接插件并共享包含转换配置的页面'}</span>
          </div>
        )}
      </div>
      <footer>
        <YakitButton
          type="text"
          onClick={() => {
            emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.BrowserExtension }))
            setOpen(false)
          }}
        >
          打开浏览器集成
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
          浏览器明文
        </YakitButton>
      )}
    </YakitPopover>
  )
})

BrowserTransformSelector.displayName = 'BrowserTransformSelector'
