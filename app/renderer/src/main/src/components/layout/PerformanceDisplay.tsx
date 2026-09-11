import React, { useState, useEffect, useRef } from 'react'
import type { YaklangEngineMode } from '@/yakitGVDefine'
import { useMemoizedFn } from 'ahooks'
import { Sparklines, SparklinesCurve } from 'react-sparklines'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '../yakitUI/YakitPopover/YakitPopover'
import { GooglePhotosLogoSvgIcon } from '@yakit-libs/yakit-ui-icons/oldicon/GooglePhotosLogoSvgIcon'
import emiter from '@/utils/eventBus/eventBus'
import { showYakitModal } from '../yakitUI/YakitModal/YakitModalConfirm'
import { YakitPopconfirm } from '../yakitUI/YakitPopconfirm/YakitPopconfirm'
import classNames from 'classnames'
import styles from './performanceDisplay.module.scss'
import panelStyles from '../../../../../shared/engineManagement.module.scss'
import { yakitEngine, yakitPerf } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

interface PerformanceDisplayProps {
  engineMode: YaklangEngineMode | undefined
  typeCallback: (type: 'break') => any
  engineLink: boolean
  cpuWrapperClassName: Record<string, boolean>
}

export const PerformanceDisplay: React.FC<PerformanceDisplayProps> = React.memo((props) => {
  // cpu和内存可视图数据
  const [cpu, setCpu] = useState<number[]>([])

  const [showLine, setShowLine] = useState<boolean>(true)
  const showLineTime = useRef<any>(null)

  useEffect(() => {
    yakitPerf.startComputePercent()
    const time = setInterval(() => {
      yakitPerf.fetchComputePercent().then((res) => setCpu(res))
    }, 500)

    return () => {
      clearInterval(time)
      yakitPerf.clearComputePercent()
    }
  }, [])

  const onWinResize = (e: UIEvent) => {
    if (showLineTime.current) clearTimeout(showLineTime.current)
    showLineTime.current = setTimeout(() => {
      if (document) {
        const header = document.getElementById('yakit-header')
        if (header) {
          setShowLine(header.clientWidth >= 1000)
        }
      }
    }, 100)
  }

  useEffect(() => {
    if (window) {
      window.addEventListener('resize', onWinResize)
      return () => {
        window.removeEventListener('resize', onWinResize)
        if (showLineTime.current) clearTimeout(showLineTime.current)
        showLineTime.current = null
      }
    }
  }, [])

  const [rps, setRps] = useState<number>(0)
  const onRefreshCurRps = (rps: number) => {
    setRps(rps)
  }
  useEffect(() => {
    emiter.on('onRefreshCurRps', onRefreshCurRps)
    return () => {
      emiter.off('onRefreshCurRps', onRefreshCurRps)
    }
  }, [])

  return (
    <div className={styles['system-func-wrapper']}>
      <div className={classNames(styles['cpu-wrapper'], props.cpuWrapperClassName)}>
        <div className={styles['cpu-title']}>
          <span className={styles['title-headline']}>RPS </span>
          <span className={styles['title-content']}>{rps}</span>
        </div>

        <div className={styles['cpu-title']}>
          <span className={styles['title-headline']}> CPU </span>
          <span className={styles['title-content']}>{`${cpu[cpu.length - 1] || 0}%`}</span>
        </div>

        {showLine && (
          <div className={styles['cpu-spark']}>
            <Sparklines data={cpu} width={50} height={10} max={50}>
              <SparklinesCurve color="#85899E" />
            </Sparklines>
          </div>
        )}
      </div>
      <UIEngineList {...props} />
    </div>
  )
})

export interface yakProcess extends LocalEngineInstance {}

interface UIEngineListProp {
  engineMode: YaklangEngineMode | undefined
  typeCallback: (type: 'break') => any
  engineLink: boolean
}

export const UIEngineList: React.FC<UIEngineListProp> = React.memo((props) => {
  const { t } = useI18nNamespaces(['layout'])
  const [show, setShow] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [rows, setRows] = useState<LocalEngineInstance[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [builtIn, setBuiltIn] = useState('')
  const generation = useRef(0)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      generation.current++
    }
  }, [])
  const refresh = useMemoizedFn(async () => {
    const token = ++generation.current
    try {
      const items = await yakitEngine.listYakGrpc()
      if (mounted.current && token === generation.current) setRows(items)
    } catch {
      if (mounted.current) setMessage(t('EngineManagement.discoveryFailed'))
    }
  })
  useEffect(() => {
    if (!show) return
    void refresh()
    void yakitEngine
      .getBuildInEngineVersion()
      .then(setBuiltIn)
      .catch(() => {})
    const timer = setInterval(refresh, 3000)
    return () => {
      clearInterval(timer)
      generation.current++
    }
  }, [show])
  const execute = useMemoizedFn(async (work: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      await work()
    } catch {
      if (mounted.current) setMessage(t('EngineManagement.operationFailed'))
    } finally {
      if (mounted.current) {
        setBusy(false)
        void refresh()
      }
    }
  })
  const managed = rows.filter((item) => item.ownership === 'managed' && item.state !== 'exited')
  const stop = (item: LocalEngineInstance) =>
    execute(async () => {
      const result = await yakitEngine.stopLocalEngine(item.id)
      if (!result.ok || !result.stopped) {
        setMessage(t('EngineManagement.stopFailed'))
        return
      }
      setMessage(t('EngineManagement.stopped'))
      if (item.current) props.typeCallback('break')
    })
  const stopAll = () =>
    execute(async () => {
      const result = await yakitEngine.stopAllLocalEngines()
      const details = (result.results || [])
        .map(
          (item) =>
            `${item.id?.slice(0, 8) || ''}: ${t(item.stopped ? 'EngineManagement.stopped' : 'EngineManagement.stopFailed')}`,
        )
        .join(' · ')
      setMessage(details || t(result.ok && result.stopped ? 'EngineManagement.stopped' : 'EngineManagement.stopFailed'))
      if (result.ok && result.stopped && rows.some((item) => item.current)) props.typeCallback('break')
    })
  const restore = () =>
    execute(async () => {
      const stopped = await yakitEngine.stopAllLocalEngines()
      if (!stopped.ok || !stopped.stopped) {
        setMessage(t('EngineManagement.stopFailed'))
        return
      }
      await yakitEngine.restoreEngineAndPlugin({})
      await yakitEngine.writeEngineKeyToYakitProjects()
      setMessage(t('EngineManagement.restored'))
      // No restart in finally; configuration/extraction failure keeps the recovery UI available.
    })
  const visibleRows = rows
    .filter((item) => item.state !== 'exited')
    .sort((a, b) => Number(b.current) - Number(a.current))
  const details = (item: LocalEngineInstance) =>
    showYakitModal({
      title: t('EngineManagement.details'),
      width: 520,
      content: (
        <dl className={panelStyles.details}>
          <dt>{t('EngineManagement.transport')}</dt>
          <dd>{t(`EngineManagement.${item.transport}`)}</dd>
          <dt>{t('EngineManagement.endpoint')}</dt>
          <dd className={panelStyles.copy}>
            <span>{item.displayEndpoint || t('EngineManagement.endpointUnknown')}</span>
            <YakitButton
              type="text2"
              disabled={!item.displayEndpoint}
              onClick={() => navigator.clipboard.writeText(item.displayEndpoint)}
            >
              {t('EngineManagement.copy')}
            </YakitButton>
          </dd>
          <dt>PID</dt>
          <dd>{item.pid ?? t('EngineManagement.unknown')}</dd>
          <dt>{t('EngineManagement.state')}</dt>
          <dd>{t(`EngineManagement.${item.state}`, { defaultValue: item.state })}</dd>
          <dt>{t('EngineManagement.version')}</dt>
          <dd>{item.version || t('EngineManagement.unknown')}</dd>
          {item.fallbackReason && (
            <>
              <dt>{t('EngineManagement.fallbackReason')}</dt>
              <dd>
                {item.fallbackReason.reasonCode || item.fallbackReason.status} · {item.fallbackReason.stage}
              </dd>
            </>
          )}
          <dt>{t('EngineManagement.ownership')}</dt>
          <dd>{t(`EngineManagement.${item.ownership}`)}</dd>
        </dl>
      ),
      footer: null,
    })
  return (
    <YakitPopover
      open={show}
      trigger="click"
      placement="bottomRight"
      onOpenChange={setShow}
      classNames={{ root: panelStyles.popover }}
      content={
        <section
          className={panelStyles.panel}
          aria-label={t('EngineManagement.title')}
          data-testid="engine-management-panel"
        >
          <header className={panelStyles.header}>
            <div>
              <div className={panelStyles.heading}>
                <h3>{t('EngineManagement.title')}</h3>
                <span className={panelStyles.count}>{visibleRows.length}</span>
              </div>
              <p className={panelStyles.scope}>{t('EngineManagement.scopeShort')}</p>
            </div>
            <YakitButton type="text2" disabled={busy} onClick={refresh}>
              {t('EngineManagement.refresh')}
            </YakitButton>
          </header>
          {(busy || message) && (
            <div className={panelStyles.feedback} role="status" aria-live="polite">
              {busy ? t('EngineManagement.working') : message}
            </div>
          )}
          <div className={panelStyles.list}>
            {!visibleRows.length && <div className={panelStyles.empty}>{t('EngineManagement.empty')}</div>}
            {visibleRows.map((item) => (
              <article
                className={panelStyles.card}
                data-current={item.current && props.engineLink}
                data-engine-id={item.id}
                key={item.id}
              >
                <div className={panelStyles.rowHeader}>
                  <strong>{t(`EngineManagement.${item.transport}`)}</strong>
                  {item.current && props.engineLink && (
                    <span className={`${panelStyles.badge} ${panelStyles.current}`}>
                      {t('EngineManagement.current')}
                    </span>
                  )}
                  {item.ownership === 'external' && (
                    <span className={panelStyles.badge}>{t('EngineManagement.externalBadge')}</span>
                  )}
                  <span className={panelStyles.state} data-ready={item.state === 'ready'}>
                    {t(`EngineManagement.${item.state}`, { defaultValue: item.state })}
                  </span>
                </div>
                <div className={panelStyles.endpoint} title={item.displayEndpoint}>
                  {item.displayEndpoint || t('EngineManagement.endpointUnknown')}
                </div>
                <div className={panelStyles.meta}>
                  <span>PID {item.pid ?? '—'}</span>
                  <span>{item.version || t('EngineManagement.versionUnknown')}</span>
                  <span>{t(`EngineManagement.${item.ownership}`)}</span>
                </div>
                <div className={panelStyles.actions}>
                  <YakitButton type="text2" onClick={() => details(item)}>
                    {t('EngineManagement.details')}
                  </YakitButton>
                  {item.current ? (
                    <YakitButton
                      type="outline2"
                      disabled={busy}
                      onClick={() =>
                        execute(async () => {
                          const result = await yakitEngine.disconnectLocalEngine()
                          if (!result.ok) {
                            setMessage(t('EngineManagement.operationFailed'))
                            return
                          }
                          props.typeCallback('break')
                        })
                      }
                    >
                      {t('EngineManagement.disconnect')}
                    </YakitButton>
                  ) : (
                    <YakitButton
                      type="outline2"
                      disabled={busy}
                      onClick={() =>
                        showYakitModal({
                          title: t('EngineManagement.settings'),
                          width: 440,
                          content: <p className={panelStyles.settingsHelp}>{t('EngineManagement.settingsReason')}</p>,
                          footer: null,
                        })
                      }
                    >
                      {t('EngineManagement.settings')}
                    </YakitButton>
                  )}
                  <YakitPopconfirm title={t('EngineManagement.stopConfirm')} onConfirm={() => stop(item)}>
                    <YakitButton
                      data-testid="engine-stop"
                      type="outline2"
                      colors="danger"
                      disabled={busy || !item.actions.stop}
                    >
                      {t('EngineManagement.stop')}
                    </YakitButton>
                  </YakitPopconfirm>
                </div>
              </article>
            ))}
          </div>
          <footer className={panelStyles.footer}>
            <YakitButton type="text2" aria-expanded={recoveryOpen} onClick={() => setRecoveryOpen(!recoveryOpen)}>
              {t('EngineManagement.troubleshoot')}
              <span aria-hidden="true">{recoveryOpen ? ' −' : ' +'}</span>
            </YakitButton>
            <YakitPopconfirm title={t('EngineManagement.stopConfirm')} onConfirm={stopAll}>
              <YakitButton type="text" colors="danger" disabled={busy || !managed.length}>
                {t('EngineManagement.stopAllShort', { count: managed.length })}
              </YakitButton>
            </YakitPopconfirm>
          </footer>
          <div className={panelStyles.recovery} hidden={!recoveryOpen}>
            <p>{t('EngineManagement.restoreHelp', { version: builtIn || '—' })}</p>
            <YakitPopconfirm
              title={t('EngineManagement.restoreConfirm', { version: builtIn || '—' })}
              onConfirm={restore}
            >
              <YakitButton type="outline2" disabled={busy || !builtIn}>
                {t('EngineManagement.restore')}
              </YakitButton>
            </YakitPopconfirm>
          </div>
        </section>
      }
    >
      <button
        type="button"
        data-testid="engine-management-trigger"
        aria-label={t('EngineManagement.title')}
        className={`${styles['ui-op-btn-wrapper']} ${panelStyles.trigger}`}
      >
        <GooglePhotosLogoSvgIcon />
      </button>
    </YakitPopover>
  )
})
