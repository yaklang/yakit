import { memo, useEffect, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useRafPolling } from '@/hook/useRafPolling/useRafPolling'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { AIInputEventHotPatchTypeEnum, type AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import useAIAgentStore from '../../useContext/useStore'
import emiter from '@/utils/eventBus/eventBus'
import { useSavedModelContext } from './useSavedModelContext'
import { CONTEXT_PERF_POLL_INTERVAL, useContextPerfStore } from './useContextPerfStore'
import ModelContextControl, { ContextUsageRing, contextUsagePercent, formatContextTokens } from './ModelContextControl'
import { MIN_CONTEXT_THRESHOLD_TOKENS } from './contextTokens'
import styles from './ModelContextControl.module.scss'

/** The composer owns model settings; the existing statistics popover stays independent. */
export default memo(function ModelContextPopover() {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [visible, setVisible] = useState(false)
  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)
  const sessionId = useCurrentSessionId()
  const { onSend, setActiveChat } = useAIAgentDispatcher()
  const { activeChat } = useAIAgentStore()
  const [{ aiGlobalConfig }] = useAIGlobalConfig()
  const perf = useContextPerfStore()
  const { aiDataRef: runtimeContext } = useRafPolling({
    getData: () => perf?.modelContext,
    interval: visible ? 200 : CONTEXT_PERF_POLL_INTERVAL,
    shouldStop: () => !execute && !visible,
    resetDeps: [sessionId, execute, visible],
    shouldUpdate: (prev, next) => !isEqual(prev, next),
    clone: (data) => cloneDeep(data),
  })
  const selected = aiGlobalConfig.IntelligentModels?.[0]
  const identity = sessionId
    ? {
        provider: runtimeContext?.provider ?? '',
        model: runtimeContext?.model ?? '',
        context_key: runtimeContext?.context_key,
      }
    : { provider: selected?.Provider?.Type ?? '', model: selected?.ModelName ?? '', config: selected }
  const saved = useSavedModelContext(identity, !execute)
  const confirmedContext = execute ? (runtimeContext?.context_key ? runtimeContext : undefined) : saved.context
  const scope = JSON.stringify([
    sessionId,
    execute,
    identity.provider,
    identity.model,
    identity.context_key,
    identity.config,
  ])
  const [pendingChange, setPendingChange] = useState<{
    scope: string
    tokens?: number
    disabled?: boolean
    baseline: AIAgentGrpcApi.ModelContext
  }>()
  const [timedOut, setTimedOut] = useState<{ scope: string; tokens?: number; disabled?: boolean }>()
  const newSnapshot = pendingChange && confirmedContext && confirmedContext !== pendingChange.baseline
  const newChange = confirmedContext?.change?.id !== pendingChange?.baseline.change?.id
  const acknowledged =
    pendingChange &&
    newSnapshot &&
    (pendingChange.tokens === undefined || confirmedContext.threshold_tokens === pendingChange.tokens) &&
    (pendingChange.disabled === undefined || !!confirmedContext.disable_auto_adjust === pendingChange.disabled) &&
    (confirmedContext.threshold_tokens !== pendingChange.baseline.threshold_tokens ||
      !!confirmedContext.disable_auto_adjust !== !!pendingChange.baseline.disable_auto_adjust ||
      (newChange && confirmedContext.change?.reason === 'manual'))
  const recalibrated =
    newSnapshot &&
    newChange &&
    (pendingChange.disabled === undefined || !!confirmedContext.disable_auto_adjust === pendingChange.disabled) &&
    ['overflow', 'confirmed'].includes(confirmedContext.change?.reason ?? '')
  const pending =
    pendingChange?.scope === scope &&
    !saved.error &&
    !acknowledged &&
    !recalibrated &&
    !(newSnapshot && confirmedContext.error)
      ? pendingChange
      : undefined

  useEffect(() => {
    if (!pendingChange || pending) return
    setPendingChange(undefined)
    // Only legacy session overrides need migration; normal model edits must not redraw the chat/history tree.
    if (
      pendingChange.scope !== scope ||
      !acknowledged ||
      !execute ||
      activeChat?.SessionID !== sessionId ||
      !activeChat.StartParams?.RuntimeContextSizeLimit
    )
      return
    setActiveChat((current) =>
      current?.SessionID === sessionId && current.StartParams?.RuntimeContextSizeLimit
        ? { ...current, StartParams: { ...current.StartParams, RuntimeContextSizeLimit: 0 } }
        : current,
    )
    emiter.emit(
      'sessionData',
      JSON.stringify({
        type: 'updateSession',
        sessionId,
        updates: { StartParams: { RuntimeContextSizeLimit: 0 } },
      }),
    )
  }, [pendingChange, pending, acknowledged, execute, scope, sessionId, activeChat, setActiveChat])

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => {
      setPendingChange((current) => (current === pending ? undefined : current))
      setTimedOut({ scope: pending.scope, tokens: pending.tokens, disabled: pending.disabled })
    }, 10000)
    return () => clearTimeout(timer)
  }, [pending])

  const context = confirmedContext && {
    ...confirmedContext,
    threshold_tokens: pending?.tokens ?? confirmedContext.threshold_tokens,
    disable_auto_adjust: pending?.disabled ?? confirmedContext.disable_auto_adjust,
    // An explicit new setting supersedes the prior automatic-adjustment label while awaiting its acknowledgement.
    source: pending ? ('manual' as const) : confirmedContext.source,
    pending: pending ? false : confirmedContext.pending,
    change: pending ? undefined : confirmedContext.change,
    prompt_tokens: execute ? confirmedContext.prompt_tokens : sessionId ? runtimeContext?.prompt_tokens ?? 0 : 0,
  }
  const timeoutError =
    timedOut?.scope === scope &&
    ((timedOut.tokens !== undefined && timedOut.tokens !== confirmedContext?.threshold_tokens) ||
      (timedOut.disabled !== undefined && timedOut.disabled !== !!confirmedContext?.disable_auto_adjust))
  const status = saved.error || (!pending && confirmedContext?.error) || timeoutError ? 'error' : undefined

  const onChange = useMemoizedFn((tokens: number, disabled?: boolean) => {
    if (!confirmedContext?.model || !confirmedContext.context_key) return false
    if (disabled === undefined && tokens < MIN_CONTEXT_THRESHOLD_TOKENS) return false
    // A quick switch after a threshold edit must carry the still-unconfirmed value forward.
    const pendingTokens = disabled === undefined ? tokens : pending?.tokens
    const requestedTokens = pendingTokens ?? 0
    const requestedDisabled = disabled ?? pending?.disabled
    const accepted = !store.getState().execute
      ? requestedDisabled === undefined
        ? saved.save(requestedTokens)
        : saved.save(requestedTokens, requestedDisabled)
      : !!sessionId &&
        onSend({
          token: sessionId,
          type: 'casual',
          params: {
            IsConfigHotpatch: true,
            HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_RuntimeContextSizeLimit,
            Params: {
              RuntimeContextSizeLimit: requestedTokens,
              ...(requestedDisabled === undefined ? {} : { DisableContextAutoAdjust: requestedDisabled }),
              AIService: confirmedContext.provider,
              AIModelName: confirmedContext.model,
              ModelContextKey: confirmedContext.context_key,
            },
          },
        })
    if (!accepted) return false
    setTimedOut(undefined)
    setPendingChange({
      scope,
      tokens: pendingTokens,
      disabled: requestedDisabled,
      baseline: confirmedContext,
    })
    return true
  })

  const summary = context
    ? t('AIContextToken.thresholdUsageSummary', {
        used: formatContextTokens(context.prompt_tokens),
        threshold: formatContextTokens(context.threshold_tokens),
        percent: contextUsagePercent(context),
      })
    : t('AIContextToken.adjustContextThreshold')

  return (
    <YakitPopover
      open={visible}
      onOpenChange={(open) => {
        setVisible(open)
        if (open && !execute) saved.refresh()
      }}
      trigger="click"
      placement="top"
      align={{ offset: [0, -4] }}
      classNames={{ root: styles.popoverRoot }}
      arrow={false}
      destroyOnHidden
      content={
        <div
          className={styles.popover}
          // Popover portals still bubble through the composer, whose click handler focuses its editor.
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {saved.error && !context && (
            <div role="alert" className={styles.warning}>
              {t('AIContextToken.contextRequestFailed')}
            </div>
          )}
          {context ? (
            <ModelContextControl
              context={context}
              onChange={!saved.loading && !saved.saving ? onChange : undefined}
              onAutoAdjustChange={
                !saved.loading && !saved.saving ? (enabled) => onChange(context.threshold_tokens, !enabled) : undefined
              }
              status={status}
              timeoutError={timeoutError}
            />
          ) : (
            <div role="status">
              {saved.loading
                ? t('AIContextToken.loadingContext')
                : !saved.error &&
                  t(
                    sessionId || identity.model ? 'AIContextToken.waitingContext' : 'AIContextToken.selectContextModel',
                  )}
            </div>
          )}
        </div>
      }
    >
      <button type="button" className={styles.trigger} aria-label={summary} aria-expanded={visible}>
        <ContextUsageRing context={context ?? undefined} />
      </button>
    </YakitPopover>
  )
})
