import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { probeFeedbackText, type ProbeFeedback } from '@/pages/ai-agent/aiModelList/aiModelForm/probeFeedback'
import { probeWithTimeout } from '@/pages/ai-agent/aiModelList/aiModelForm/probeWithTimeout'
import React, { useEffect, useRef, useState } from 'react'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import useAIGlobalConfig from '../hooks/useAIGlobalConfig'
import {
  buildReasoningEffortOptions,
  effortProbeResultFromResponse,
  normalizeReasoningEffort,
} from '@/pages/ai-agent/aiModelList/aiModelForm/reasoningEffort'
import { grpcProbeReasoningEffort } from '@/pages/ai-agent/aiModelList/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
export const AIReasoningEffortSelect: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'configNetwork'])
  const [{ aiGlobalConfig }, event] = useAIGlobalConfig({ isShowLoading: false })
  const current = useRef(aiGlobalConfig)
  current.current = aiGlobalConfig
  const model = aiGlobalConfig.IntelligentModels?.[0]
  const identity = model ? JSON.stringify([model.ProviderId, model.ModelName, model.Provider]) : ''
  const epoch = useRef(0)
  const [probing, setProbing] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState<ProbeFeedback>()
  const [confirmedEfforts, setConfirmedEfforts] = useState<string[]>()
  useEffect(() => {
    epoch.current += 1
    setProbing(false)
    setFeedback(undefined)
    setFeedbackOpen(false)
    setConfirmedEfforts(undefined)
    return () => {
      epoch.current += 1
    }
  }, [identity])
  const update = async (mutate: (value: NonNullable<typeof model>) => NonNullable<typeof model>) => {
    const models = current.current.IntelligentModels || []
    if (!models.length) return
    await event.setAIGlobalConfig({ IntelligentModels: [mutate(models[0]), ...models.slice(1)] })
    emiter.emit('onRefreshAvailableAIModelList')
  }
  const probe = async () => {
    if (!model || probing || disabled || model.IsOnline || model.Provider.Type === 'yak-script') return
    const request = ++epoch.current
    setProbing(true)
    setFeedback('running')
    try {
      const result = effortProbeResultFromResponse(
        await probeWithTimeout(grpcProbeReasoningEffort({ Config: model.Provider, Model: model.ModelName })),
      )
      if (request !== epoch.current) return
      if (!result.conclusive) {
        setFeedback('failed')
        return
      }
      try {
        await update((value) => ({ ...value, EffortProbed: true, ProbedExtendedEfforts: result.efforts }))
      } catch {
        if (request === epoch.current) setFeedback('saveFailed')
        return
      }
      if (request !== epoch.current) return
      setConfirmedEfforts(result.efforts)
      setFeedback(result.efforts.length ? 'supported' : 'unsupported')
    } catch (error) {
      if (request === epoch.current)
        setFeedback(error instanceof Error && error.message === 'Reasoning probe timeout' ? 'timeout' : 'failed')
    } finally {
      if (request === epoch.current) setProbing(false)
    }
  }
  const value = normalizeReasoningEffort(model?.Provider.ReasoningEffort)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flexWrap: 'wrap' }}>
      <YakitSelect
        aria-label={t('BatchModel.effort')}
        wrapperStyle={{ width: 160, minWidth: 110 }}
        disabled={disabled || !model || !!model.IsOnline}
        value={value}
        options={buildReasoningEffortOptions(t, confirmedEfforts ?? model?.ProbedExtendedEfforts, value)}
        onChange={(effort: string) => {
          epoch.current += 1
          setProbing(false)
          void update((m) => ({
            ...m,
            Provider: { ...m.Provider, ReasoningEffort: effort === 'no-set' ? undefined : effort },
          })).catch(() => {
            setFeedback('saveFailed')
            setFeedbackOpen(true)
          })
        }}
      />
      <YakitPopover
        visible={feedbackOpen}
        onVisibleChange={setFeedbackOpen}
        trigger="click"
        placement="top"
        content={
          <div style={{ maxWidth: 300, fontSize: 12 }}>
            <p>{t('BatchModel.probeHelp')}</p>
            {feedback && (
              <div role={['failed', 'timeout', 'saveFailed'].includes(feedback) ? 'alert' : 'status'}>
                {probeFeedbackText(t, feedback, confirmedEfforts)}
              </div>
            )}
          </div>
        }
      >
        <YakitButton
          title={t('BatchModel.probeHelp')}
          type="text"
          loading={probing}
          disabled={disabled || !model || !!model.IsOnline || model.Provider.Type === 'yak-script'}
          onClick={() => {
            setFeedbackOpen(true)
            void probe()
          }}
        >
          {t(probing ? 'BatchModel.probeRunning' : 'BatchModel.probe')}
        </YakitButton>
      </YakitPopover>
    </div>
  )
}
