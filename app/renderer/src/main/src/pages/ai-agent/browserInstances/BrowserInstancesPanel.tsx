import { useSessionModal } from '../sessionTabs/useSessionModal'
import { BrowserThumbnail } from './BrowserThumbnail'
import {
  BrowserInstancesGuideEmpty,
  BrowserInstancesGuideManual,
} from './BrowserInstancesGuideEmpty/BrowserInstancesGuideEmpty'
import React, { useEffect, useRef, useState } from 'react'
import { Modal } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  approveBrowserExtensionPairing,
  rejectBrowserExtensionPairing,
  requestBrowserExtensionSnapshot,
  callBrowserExtensionCapability,
  type BrowserPairingRequest,
} from '@/pages/browserExtension/browserExtensionClient'
import {
  useBrowserInstances,
  refreshBrowserInstances,
  restoreBrowserHistory,
  selectBrowserInstance,
  browserInstanceMentionName,
  type AIBrowserInstance,
} from './browserInstanceStore'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import styles from './BrowserInstancesPanel.module.scss'

export const browserInstanceMention = (instance: AIBrowserInstance): AIMentionCommandParams => ({
  mentionType: 'browser',
  mentionId: instance.id,
  mentionName: browserInstanceMentionName(instance),
})

export const BrowserInstancesPanel: React.FC<{
  onMention: (mention: AIMentionCommandParams) => void
  modalContainer?: () => HTMLElement
}> = ({ onMention, modalContainer }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const state = useBrowserInstances()
  const { active, ownDialog } = useSessionModal()
  const [guide, setGuide] = useState(false)
  useEffect(() => {
    if (!active) setGuide(false)
  }, [active])
  const [busy, setBusy] = useState('')
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const action = async (id: string, operation: () => Promise<unknown>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(id)
    setError('')
    try {
      await operation()
      await refreshBrowserInstances(true)
    } catch (reason) {
      setError(String(reason))
    } finally {
      busyRef.current = false
      setBusy('')
    }
  }
  const pair = (request: BrowserPairingRequest, approved: boolean) =>
    ownDialog(
      Modal.confirm({
        getContainer: modalContainer,
        title: t(approved ? 'BrowserInstances.approveConfirm' : 'BrowserInstances.rejectConfirm'),
        content: (
          <div>
            {request.client} · {request.origin}
            <br />
            {request.code}
          </div>
        ),
        onOk: () =>
          action(request.id, () =>
            approved ? approveBrowserExtensionPairing(request) : rejectBrowserExtensionPairing(request),
          ),
      }),
    )
  return (
    <section className={styles.panel} aria-label={t('BrowserInstances.title')}>
      <div className={styles.actions}>
        <YakitButton onClick={() => setGuide(true)}>{t('BrowserInstances.guideViewManual')}</YakitButton>
        <YakitButton loading={state.loading} onClick={() => void refreshBrowserInstances()}>
          {t('BrowserInstances.refresh')}
        </YakitButton>
        <YakitButton
          disabled={!!busy}
          loading={busy === 'pair'}
          onClick={() =>
            void action('pair', () => requestBrowserExtensionSnapshot('POST', '/pairing-window', { ttlSeconds: 120 }))
          }
        >
          {t('BrowserInstances.openPairing')}
        </YakitButton>
      </div>
      <p>{t('BrowserInstances.setupHint')}</p>
      {(error || state.error) && <div role="alert">{error || state.error}</div>}
      {state.pending.map((request) => (
        <article key={request.id} className={styles.card}>
          <strong>
            {t('BrowserInstances.pending')} · {request.client}
          </strong>
          <div>
            {request.origin} · {request.code}
          </div>
          {state.autoApprovalErrors[request.id] && (
            <div role="status">{t('BrowserInstances.manualApprovalRequired')}</div>
          )}
          <div className={styles.actions}>
            <YakitButton disabled={!!busy || request.expiresAt <= Date.now()} onClick={() => pair(request, true)}>
              {t('BrowserInstances.approve')}
            </YakitButton>
            <YakitButton disabled={!!busy} onClick={() => pair(request, false)}>
              {t('BrowserInstances.reject')}
            </YakitButton>
          </div>
        </article>
      ))}
      {!state.loading && !state.instances.length && <BrowserInstancesGuideEmpty onOpenManual={() => setGuide(true)} />}
      {state.instances.map((instance) => (
        <article key={instance.id} className={styles.card}>
          <strong>
            {instance.identity && `${instance.identity} · `}
            {instance.name}
          </strong>
          <span>
            {' '}
            ·{' '}
            {t(
              instance.online
                ? instance.running
                  ? 'BrowserInstances.running'
                  : 'BrowserInstances.online'
                : 'BrowserInstances.offline',
            )}
          </span>
          <div>
            {instance.client} {instance.clientVersion}
          </div>
          <BrowserThumbnail instance={instance} />
          <div title={instance.tab?.url}>
            {instance.tab?.title} {instance.tab?.url}
          </div>
          <div className={styles.actions}>
            <YakitButton
              disabled={!instance.online}
              onClick={() => {
                selectBrowserInstance(instance.id)
                onMention(browserInstanceMention(instance))
              }}
            >
              {t('BrowserInstances.reference')}
            </YakitButton>
            <YakitButton
              disabled={
                !instance.online ||
                !instance.tab ||
                !!busy ||
                !instance.connection?.capabilities.includes('browser.takeover')
              }
              loading={busy === instance.id}
              onClick={() =>
                void action(instance.id, () =>
                  callBrowserExtensionCapability(
                    instance.id,
                    'browser.takeover',
                    { tabId: instance.tab!.id, frameId: 0 },
                    15000,
                  ),
                )
              }
            >
              {t('BrowserInstances.focus')}
            </YakitButton>
          </div>
        </article>
      ))}
      <h4>{t('BrowserInstances.history')}</h4>
      {state.historyError && <div role="alert">{state.historyError}</div>}
      {!state.history.length && !state.historyError && <p>{t('BrowserInstances.noHistory')}</p>}
      {state.history.map((instance) => (
        <article key={instance.id} className={styles.card}>
          <strong>
            {instance.badge} · {instance.name || instance.pageTitle}
          </strong>
          <div>{instance.pageUrl || instance.startUrl}</div>
          <YakitButton
            disabled={!!busy}
            loading={busy === instance.id}
            onClick={() =>
              ownDialog(
                Modal.confirm({
                  getContainer: modalContainer,
                  title: t('BrowserInstances.restoreConfirm'),
                  content: instance.name || instance.pageTitle,
                  onOk: () => action(instance.id, () => restoreBrowserHistory(instance.id)),
                }),
              )
            }
          >
            {t('BrowserInstances.restore')}
          </YakitButton>
        </article>
      ))}
      <BrowserInstancesGuideManual
        open={guide && active}
        onClose={() => setGuide(false)}
        getContainer={modalContainer}
      />
    </section>
  )
}
