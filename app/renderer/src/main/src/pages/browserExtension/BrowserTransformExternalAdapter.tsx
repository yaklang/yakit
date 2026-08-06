import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { success } from '@/utils/notification'
import {
  getBrowserTransformAdapterStatus,
  startBrowserTransformAdapter,
  stopBrowserTransformAdapter,
  type BrowserTransformAdapterStatus,
} from './browserExtensionClient'
import styles from './BrowserTransformWorkspace.module.scss'

interface BrowserTransformExternalAdapterProps {
  active: boolean
  deviceId: string
  profileId?: string
  profileName?: string
  profileReady: boolean
}

const EMPTY_STATUS: BrowserTransformAdapterStatus = {
  running: false,
  endpoint: '',
  token: '',
  deviceId: '',
  profileId: '',
  profileName: '',
  requestEnabled: false,
  responseEnabled: false,
  startedAt: 0,
  requestCount: 0,
  bypassCount: 0,
  failureCount: 0,
  lastUsedAt: 0,
  lastError: '',
  port: 0,
  host: '',
  timeoutMilliseconds: 0,
  protocolVersion: '1',
  methods: [],
  urlPattern: '',
  origin: '',
}

function adapterError(error: unknown): string {
  if (error instanceof Error) return error.message
  return `${error}`
}

export const BrowserTransformExternalAdapter: React.FC<BrowserTransformExternalAdapterProps> = ({
  active,
  deviceId,
  profileId,
  profileName,
  profileReady,
}) => {
  const [status, setStatus] = useState(EMPTY_STATUS)
  const [port, setPort] = useState('0')
  const [timeoutMilliseconds, setTimeoutMilliseconds] = useState(10_000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      setStatus(await getBrowserTransformAdapterStatus())
      setError('')
    } catch (refreshError) {
      setError(adapterError(refreshError))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    void refresh()
  }, [active, refresh])

  useEffect(() => {
    if (!active || !status.running) return
    const timer = window.setInterval(() => void refresh(true), 5_000)
    return () => window.clearInterval(timer)
  }, [active, refresh, status.running])

  const sameBinding = Boolean(status.running && status.deviceId === deviceId && status.profileId === profileId)
  const protocolConfig = useMemo(
    () =>
      JSON.stringify(
        {
          protocol: `yak-browser-transform/${status.protocolVersion || '1'}`,
          endpoint: status.endpoint ? `${status.endpoint}/v1/transform` : '',
          healthEndpoint: status.endpoint ? `${status.endpoint}/v1/health` : '',
          token: status.token,
          failMode: 'closed',
          requestEnabled: status.requestEnabled,
          responseEnabled: status.responseEnabled,
          methods: status.methods,
          urlPattern: status.urlPattern,
          origin: status.origin,
          timeoutMilliseconds: status.timeoutMilliseconds || timeoutMilliseconds,
        },
        null,
        2,
      ),
    [status, timeoutMilliseconds],
  )

  const start = async () => {
    if (!profileId || !deviceId || !profileReady) return
    const parsedPort = Number(port)
    if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65_535) {
      setError('端口必须是 0–65535 的整数；0 表示自动选择')
      return
    }
    setLoading(true)
    try {
      const next = await startBrowserTransformAdapter({
        deviceId,
        profileId,
        port: parsedPort,
        timeoutMilliseconds,
      })
      setStatus(next)
      setPort(`${next.port}`)
      setError('')
      success('Burp / Fiddler 明文适配器已启动')
    } catch (startError) {
      setError(adapterError(startError))
    } finally {
      setLoading(false)
    }
  }

  const stop = async () => {
    setLoading(true)
    try {
      setStatus(await stopBrowserTransformAdapter())
      setError('')
      success('外部明文适配器已停止')
    } catch (stopError) {
      setError(adapterError(stopError))
    } finally {
      setLoading(false)
    }
  }

  const copy = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value)
    success(message)
  }

  return (
    <section className={styles['external-adapter']}>
      <header>
        <span>
          <ApiOutlined />
          <strong>Burp / Fiddler</strong>
        </span>
        <YakitButton type="text2" icon={<ReloadOutlined />} disabled={loading} onClick={() => void refresh()} />
      </header>
      <p>把外部代理中的明文报文交给当前浏览器 Profile；页面仍负责真实加密、签名或响应解密。</p>

      {status.running ? (
        <>
          <div className={`${styles['adapter-state']} ${sameBinding ? styles.ready : styles.warning}`}>
            {sameBinding ? <CheckCircleOutlined /> : <WarningOutlined />}
            <span>
              <strong>{sameBinding ? '当前 Profile 正在共享' : '引擎正在共享另一条 Profile'}</strong>
              <small>{status.profileName || status.profileId}</small>
            </span>
          </div>
          <div className={styles['adapter-value']}>
            <span>Endpoint</span>
            <code title={`${status.endpoint}/v1/transform`}>{status.endpoint}/v1/transform</code>
            <YakitButton
              type="text2"
              icon={<CopyOutlined />}
              onClick={() => void copy(`${status.endpoint}/v1/transform`, 'Endpoint 已复制')}
            />
          </div>
          <div className={styles['adapter-value']}>
            <span>Bearer token</span>
            <code title={status.token}>{status.token}</code>
            <YakitButton
              type="text2"
              icon={<CopyOutlined />}
              onClick={() => void copy(status.token, '临时 token 已复制')}
            />
          </div>
          <div className={styles['adapter-metrics']}>
            <span>
              <strong>{status.requestCount}</strong>转换
            </span>
            <span>
              <strong>{status.bypassCount}</strong>旁路
            </span>
            <span>
              <strong>{status.failureCount}</strong>失败
            </span>
            <span>
              {status.requestEnabled ? '请求加密' : ''}
              {status.requestEnabled && status.responseEnabled ? ' · ' : ''}
              {status.responseEnabled ? '响应解密' : ''}
            </span>
          </div>
          {status.lastError && (
            <div className={styles['adapter-error']}>
              <WarningOutlined />
              <span>{status.lastError}</span>
            </div>
          )}
          <details className={styles['adapter-contract']}>
            <summary>工具接入配置</summary>
            <pre>{protocolConfig}</pre>
            <YakitButton
              type="text"
              icon={<CopyOutlined />}
              onClick={() => void copy(protocolConfig, '适配器配置已复制')}
            >
              复制配置
            </YakitButton>
          </details>
          <div className={styles['adapter-actions']}>
            {!sameBinding && (
              <YakitButton disabled={!profileReady || loading} onClick={() => void start()}>
                切换到当前 Profile
              </YakitButton>
            )}
            <YakitButton danger type="text2" icon={<PoweroffOutlined />} disabled={loading} onClick={() => void stop()}>
              停止
            </YakitButton>
          </div>
        </>
      ) : (
        <>
          <div className={styles['adapter-settings']}>
            <label>
              <span>监听端口</span>
              <YakitInput value={port} placeholder="0 · 自动" onChange={(event) => setPort(event.target.value)} />
            </label>
            <label>
              <span>单次超时</span>
              <YakitSelect
                value={timeoutMilliseconds}
                options={[
                  { value: 5_000, label: '5 秒' },
                  { value: 10_000, label: '10 秒' },
                  { value: 20_000, label: '20 秒' },
                  { value: 30_000, label: '30 秒' },
                ]}
                onChange={setTimeoutMilliseconds}
              />
            </label>
          </div>
          <small className={styles['adapter-boundary']}>
            固定监听 127.0.0.1；token 仅存在于当前 Yak 引擎进程，停止或重启后失效。
          </small>
          <YakitButton
            icon={<ApiOutlined />}
            disabled={!profileReady || !profileId || loading}
            onClick={() => void start()}
          >
            为“{profileName || '当前 Profile'}”启动适配器
          </YakitButton>
        </>
      )}
      {error && (
        <div className={styles['adapter-error']}>
          <WarningOutlined />
          <span>{error}</span>
        </div>
      )}
    </section>
  )
}
