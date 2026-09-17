import React, { useState, useEffect, useRef } from 'react'
import type { YaklangEngineMode } from '@/yakitGVDefine'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '../yakitUI/YakitPopover/YakitPopover'
import { GooglePhotosLogoSvgIcon } from '@yakit-libs/yakit-ui-icons/oldicon/GooglePhotosLogoSvgIcon'
import emiter from '@/utils/eventBus/eventBus'
import { showYakitModal } from '../yakitUI/YakitModal/YakitModalConfirm'
import { YakitPopconfirm } from '../yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitTag } from '../yakitUI/YakitTag/YakitTag'
import styles from './performanceDisplay.module.scss'
import panelStyles from '../../../../../shared/engineManagement.module.scss'
import { yakitEngine, yakitPerf } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { startIdleVisibleInterval } from '@/utils/scheduleIdleTask'

interface PerformanceDisplayProps {
  engineMode: YaklangEngineMode | undefined
  typeCallback: (type: 'break') => any
  engineLink: boolean
  extraLeft?: React.ReactNode
  extraRight?: React.ReactNode
}

export const PerformanceDisplay: React.FC<PerformanceDisplayProps> = React.memo((props) => {
  const [cpu, setCpu] = useState<number[]>([])
  const [rps, setRps] = useState<number>(0)

  useEffect(() => {
    let computeStarted = false
    const ensureCompute = () => {
      if (computeStarted || document.hidden) return
      computeStarted = true
      yakitPerf.startComputePercent()
    }
    const stopCompute = () => {
      if (!computeStarted) return
      computeStarted = false
      yakitPerf.clearComputePercent()
    }

    // 空闲后再采 CPU，页面隐藏时停采集，避免首屏与后台空转抢主线程
    const cancelInterval = startIdleVisibleInterval(
      () => {
        ensureCompute()
        yakitPerf.fetchComputePercent().then((res) => setCpu(res))
      },
      500,
      { runImmediately: true },
    )
    const onVisibilityChange = () => {
      if (document.hidden) stopCompute()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      cancelInterval()
      stopCompute()
    }
  }, [])

  useEffect(() => {
    const onRefreshCurRps = (nextRps: number) => setRps(nextRps)
    emiter.on('onRefreshCurRps', onRefreshCurRps)
    return () => {
      emiter.off('onRefreshCurRps', onRefreshCurRps)
    }
  }, [])

  return (
    <div className={styles['system-func-wrapper']}>
      {props.extraLeft}
      <UIEngineList {...props} cpu={cpu} rps={rps} />
      {props.extraRight}
    </div>
  )
})

export interface yakProcess extends LocalEngineInstance {}

interface UIEngineListProp {
  engineMode: YaklangEngineMode | undefined
  typeCallback: (type: 'break') => any
  engineLink: boolean
  cpu?: number[]
  rps?: number
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
                  <YakitTag className={panelStyles.state} color={item.state === 'ready' ? 'success' : 'danger'}>
                    {t(`EngineManagement.${item.state}`, { defaultValue: item.state })}
                  </YakitTag>
                </div>
                <div className={panelStyles.endpoint} title={item.displayEndpoint}>
                  {item.displayEndpoint || t('EngineManagement.endpointUnknown')}
                </div>
                <div className={panelStyles.meta}>
                  <div className={panelStyles.metaFacts}>
                    <span>PID {item.pid ?? '—'}</span>
                    <span>{item.version || t('EngineManagement.versionUnknown')}</span>
                    <span>{t(`EngineManagement.${item.ownership}`)}</span>
                  </div>
                  <div className={panelStyles.actions}>
                    <YakitButton type="text2" onClick={() => details(item)}>
                      {t('EngineManagement.details')}
                    </YakitButton>
                    {!item.current && (
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
                        type="outline1"
                        colors="danger"
                        disabled={busy || !item.actions.stop}
                      >
                        {t('EngineManagement.stop')}
                      </YakitButton>
                    </YakitPopconfirm>
                  </div>
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
