import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckOutlined,
  ChromeOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Spin } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { success, yakitFailed } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import {
  requestBrowserExtensionSnapshot,
  type BrowserExtensionSnapshot,
  type BrowserPairingRequest,
  type PairedBrowserDevice,
} from './browserExtensionClient'
import styles from './BrowserExtension.module.scss'

const ADD_NEW_BROWSER_IDENTITY = '__add_new_browser_identity__'

function formatTime(value?: number): string {
  return value ? new Date(value).toLocaleString() : '-'
}

export const BrowserExtension: React.FC = () => {
  const [snapshot, setSnapshot] = useState<BrowserExtensionSnapshot>({ pending: [], devices: [] })
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState('')
  const [loadError, setLoadError] = useState('')
  const [editingID, setEditingID] = useState('')
  const [editingName, setEditingName] = useState('')
  const [pairingReplacementByRequest, setPairingReplacementByRequest] = useState<Record<string, string>>({})
  const [clock, setClock] = useState(0)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      setSnapshot(await requestBrowserExtensionSnapshot('GET', '/snapshot'))
      setLoadError('')
    } catch (error) {
      setLoadError(`${error}`)
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void load(), 0)
    const refresh = () => void load(true)
    emiter.on('onBrowserExtensionChanged', refresh)
    return () => {
      window.clearTimeout(initialTimer)
      emiter.off('onBrowserExtensionChanged', refresh)
    }
  }, [load])

  useEffect(() => {
    if (!snapshot.pending.length && (snapshot.status?.pairingOpenUntil || 0) <= Date.now()) return
    const initialTimer = window.setTimeout(() => setClock(Date.now()), 0)
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
    }
  }, [snapshot.pending.length, snapshot.status?.pairingOpenUntil])

  const mutate = useCallback(async (key: string, method: string, path: string, body?: unknown, message?: string) => {
    setMutating(key)
    try {
      setSnapshot(await requestBrowserExtensionSnapshot(method, path, body))
      if (message) success(message)
    } catch (error) {
      yakitFailed(`${error}`)
    } finally {
      setMutating('')
    }
  }, [])

  const connectionsByDevice = useMemo(
    () => new Map((snapshot.status?.connections || []).map((connection) => [connection.deviceId, connection])),
    [snapshot.status?.connections],
  )
  const openPairing = () =>
    mutate('pairing-window', 'POST', '/pairing-window', { ttlSeconds: 120 }, '已开启 2 分钟配对窗口')
  const statusTone = !snapshot.status?.running ? 'danger' : snapshot.status.connected ? 'success' : 'warning'
  const statusLabel = !snapshot.status?.running
    ? 'Bridge 未运行'
    : snapshot.status.connected
      ? `${snapshot.status.connections.length} 个浏览器在线`
      : '等待浏览器'
  const pairingWindowRemaining = Math.max(0, Math.ceil(((snapshot.status?.pairingOpenUntil || 0) - clock) / 1000))

  const rejectPairing = (request: BrowserPairingRequest) => {
    const modal = YakitModalConfirm({
      width: 420,
      title: '拒绝浏览器配对',
      content: `拒绝${
        request.managedInstance?.badge ? `浏览器 ${request.managedInstance.badge}` : '这个浏览器'
      }的本次配对申请？`,
      onOkText: '拒绝申请',
      onOk: async () => {
        await mutate(request.id, 'DELETE', `/pairings/${request.id}`, {
          message: 'Pairing rejected in Yakit',
        })
        modal.destroy()
      },
    })
  }

  const revokeDevice = (device: PairedBrowserDevice) => {
    const online = connectionsByDevice.has(device.id)
    const modal = YakitModalConfirm({
      width: 420,
      title: online ? '撤销在线浏览器信任' : '移除离线配对记录',
      content: online
        ? `撤销“${device.name}”的配对并立即断开？该浏览器再次连接前需要重新配对。`
        : `移除“${device.name}”的离线记录？它下次连接时需要重新配对。`,
      onOkText: online ? '撤销并断开' : '移除记录',
      onOk: async () => {
        await mutate(
          device.id,
          'DELETE',
          `/devices/${device.id}`,
          undefined,
          online ? '浏览器信任已撤销' : '离线配对记录已移除',
        )
        modal.destroy()
      },
    })
  }

  return (
    <div className={styles['browser-extension-page']}>
      <header className={styles['page-header']}>
        <div>
          <h1>浏览器集成</h1>
          <p>只管理 Yak 引擎与浏览器插件的连接和可信身份；浏览器操作请在 AI Agent 中完成。</p>
        </div>
        <div className={styles['header-actions']}>
          <YakitButton type="outline2" icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            刷新
          </YakitButton>
          <YakitButton icon={<PlusOutlined />} loading={mutating === 'pairing-window'} onClick={openPairing}>
            添加浏览器
          </YakitButton>
        </div>
      </header>

      {loadError ? (
        <div className={styles['load-error']}>
          <CloseOutlined />
          <div>
            <strong>当前引擎不支持浏览器集成</strong>
            <span>{loadError}</span>
          </div>
          <YakitButton type="outline2" onClick={() => void load()}>
            重试
          </YakitButton>
        </div>
      ) : (
        <Spin spinning={loading}>
          <section className={styles['bridge-status']}>
            <div className={`${styles['status-signal']} ${styles[statusTone]}`}>
              <LinkOutlined />
            </div>
            <div className={styles['status-copy']}>
              <div>
                <strong>Yak Browser Bridge</strong>
                <YakitTag color={statusTone}>{statusLabel}</YakitTag>
              </div>
              <span>{snapshot.status?.url || '本机 Bridge 尚未监听'}</span>
            </div>
            <dl>
              <div>
                <dt>协议</dt>
                <dd>v{snapshot.status?.protocolVersion || '-'}</dd>
              </div>
              <div>
                <dt>在线实例</dt>
                <dd>
                  {snapshot.status?.connections
                    .map((connection) => connection.managedInstance?.badge)
                    .filter(Boolean)
                    .join(' / ') || '-'}
                </dd>
              </div>
              <div>
                <dt>配对窗口</dt>
                <dd>{pairingWindowRemaining > 0 ? `${pairingWindowRemaining} 秒` : '按需审批'}</dd>
              </div>
            </dl>
          </section>
          {snapshot.status?.lastError && <div className={styles['bridge-warning']}>{snapshot.status.lastError}</div>}

          <section className={styles['workspace-section']}>
            <div className={styles['section-heading']}>
              <div>
                <h2>待确认申请</h2>
                <span>
                  {snapshot.pending.length ? `${snapshot.pending.length} 个浏览器等待确认` : '没有待处理申请'}
                </span>
              </div>
            </div>
            <div className={styles['request-list']}>
              {!snapshot.pending.length && (
                <div className={styles['empty-row']}>
                  <SafetyCertificateOutlined />
                  <span>暂无配对申请</span>
                </div>
              )}
              {snapshot.pending.map((request) => {
                const seconds = Math.max(0, Math.ceil((request.expiresAt - clock) / 1000))
                const replacementCandidates = snapshot.devices
                  .filter(
                    (device) =>
                      device.origin === request.origin &&
                      device.client === request.client &&
                      !connectionsByDevice.has(device.id),
                  )
                  .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
                const exactIdentity = replacementCandidates.find(
                  (device) => device.installationId === request.installationId,
                )
                const replacementChoice =
                  pairingReplacementByRequest[request.id] || exactIdentity?.id || ADD_NEW_BROWSER_IDENTITY
                const replacementDevice = replacementCandidates.find((device) => device.id === replacementChoice)
                return (
                  <article className={styles['pairing-request']} key={request.id}>
                    <div className={styles['browser-mark']}>
                      <ChromeOutlined />
                    </div>
                    <div className={styles['request-identity']}>
                      <strong>
                        {request.managedInstance?.badge ? `浏览器 ${request.managedInstance.badge}` : '新浏览器实例'}
                      </strong>
                      <span>{request.managedInstance ? '由 YTray 启动' : '浏览器插件请求连接'}</span>
                      <small>插件版本 {request.clientVersion}</small>
                    </div>
                    <div className={styles['verification-code']}>
                      <span>验证码</span>
                      <strong>
                        {request.code.slice(0, 3)} {request.code.slice(3)}
                      </strong>
                      <small>{seconds} 秒后过期</small>
                    </div>
                    <div className={styles['pairing-target']}>
                      <span>配对方式</span>
                      {replacementCandidates.length ? (
                        <YakitSelect
                          size="small"
                          value={replacementChoice}
                          options={[
                            ...replacementCandidates.map((device) => ({
                              value: device.id,
                              label: `替换 ${device.name} · ${formatTime(device.lastSeenAt)}`,
                            })),
                            {
                              value: ADD_NEW_BROWSER_IDENTITY,
                              label: '作为新的浏览器身份添加',
                            },
                          ]}
                          onChange={(value) =>
                            setPairingReplacementByRequest((current) => ({
                              ...current,
                              [request.id]: value,
                            }))
                          }
                        />
                      ) : (
                        <strong>添加新的浏览器身份</strong>
                      )}
                    </div>
                    <div className={styles['row-actions']}>
                      <YakitButton
                        type="outline2"
                        danger
                        icon={<CloseOutlined />}
                        disabled={Boolean(mutating)}
                        onClick={() => rejectPairing(request)}
                      >
                        拒绝
                      </YakitButton>
                      <YakitButton
                        icon={<CheckOutlined />}
                        loading={mutating === request.id}
                        disabled={seconds <= 0}
                        onClick={() =>
                          void mutate(
                            request.id,
                            'POST',
                            `/pairings/${request.id}/approve`,
                            {
                              name:
                                replacementDevice?.name ||
                                (request.managedInstance?.badge
                                  ? `浏览器 ${request.managedInstance.badge}`
                                  : 'Browser Extension'),
                              ...(replacementDevice ? { replaceDeviceId: replacementDevice.id } : {}),
                            },
                            replacementDevice ? '原浏览器身份已更新' : '浏览器配对已批准',
                          )
                        }
                      >
                        {replacementDevice ? '替换并批准' : '批准'}
                      </YakitButton>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className={styles['workspace-section']}>
            <div className={styles['section-heading']}>
              <div>
                <h2>已配对浏览器</h2>
                <span>
                  {snapshot.devices.length ? `${snapshot.devices.length} 个可信浏览器身份` : '尚未配对浏览器'}
                </span>
              </div>
            </div>
            <div className={styles['device-table']}>
              <div className={styles['device-table-head']}>
                <span>浏览器</span>
                <span>状态</span>
                <span>插件版本</span>
                <span>最后在线</span>
                <span>操作</span>
              </div>
              {!snapshot.devices.length && (
                <div className={styles['empty-row']}>
                  <ChromeOutlined />
                  <span>暂无可信浏览器身份</span>
                </div>
              )}
              {snapshot.devices.map((device) => {
                const connection = connectionsByDevice.get(device.id)
                return (
                  <div className={styles['device-row']} key={device.id}>
                    <div className={styles['device-name']}>
                      <span className={styles['device-icon']}>
                        <ChromeOutlined />
                      </span>
                      {editingID === device.id ? (
                        <YakitInput
                          value={editingName}
                          maxLength={80}
                          onChange={(event) => setEditingName(event.target.value)}
                        />
                      ) : (
                        <span>
                          <strong>{device.name}</strong>
                          <small>
                            {connection?.managedInstance?.badge
                              ? `YTray 实例 ${connection.managedInstance.badge}`
                              : device.client}
                          </small>
                        </span>
                      )}
                    </div>
                    <span className={styles['online-state']}>
                      <i className={connection ? styles.online : styles.offline} />
                      {connection ? '在线' : '离线'}
                    </span>
                    <span>{connection?.clientVersion || device.clientVersion}</span>
                    <span>{formatTime(connection?.connectedAt || device.lastSeenAt)}</span>
                    <div className={styles['row-actions']}>
                      {editingID === device.id ? (
                        <>
                          <YakitButton
                            type="text"
                            icon={<CheckOutlined />}
                            loading={mutating === device.id}
                            onClick={() =>
                              void mutate(
                                device.id,
                                'POST',
                                `/devices/${device.id}`,
                                { name: editingName },
                                '设备名称已更新',
                              ).then(() => setEditingID(''))
                            }
                          />
                          <YakitButton type="text" icon={<CloseOutlined />} onClick={() => setEditingID('')} />
                        </>
                      ) : (
                        <YakitButton
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingID(device.id)
                            setEditingName(device.name)
                          }}
                        />
                      )}
                      <YakitButton
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={Boolean(mutating)}
                        onClick={() => revokeDevice(device)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </Spin>
      )}
    </div>
  )
}

export default BrowserExtension
