import type { FC } from 'react'
import { memo, useEffect } from 'react'
import { useCreation } from 'ahooks'
import { useStore } from 'zustand'
import cloneDeep from 'lodash/cloneDeep'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { useRafPolling } from '@/hook/useRafPolling/useRafPolling'
import AITokens from './AITokens'
import { CONTEXT_PERF_POLL_INTERVAL, useContextPerfStore } from './useContextPerfStore'
import { isConsumptionPerfChanged } from './utils'

const AIMainModelTokens: FC<{
  className?: string
}> = ({ className }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)
  const aiPerfData = useContextPerfStore()
  const [aiGlobalConfigData, event] = useAIGlobalConfig()

  const { renderNumber, aiDataRef: consumption } = useRafPolling({
    getData: () => aiPerfData?.consumption ?? null,
    interval: CONTEXT_PERF_POLL_INTERVAL,
    shouldStop: () => !execute,
    resetDeps: [execute],
    shouldUpdate: (prev, next) => isConsumptionPerfChanged(prev, next),
    clone: (data) => cloneDeep(data),
  })

  useEffect(() => {
    event.onRefresh()
  }, [event])

  const aiGlobalConfig = useCreation(() => aiGlobalConfigData.aiGlobalConfig, [aiGlobalConfigData.aiGlobalConfig])
  const tierModelConsumption = consumption?.tier_model_consumption
  const hasRuntimeModelConsumption = tierModelConsumption !== undefined
  const intelligentModel = useCreation(() => {
    if (aiGlobalConfig?.IntelligentModels?.length) {
      return aiGlobalConfig.IntelligentModels[0]
    }
    return undefined
  }, [aiGlobalConfig?.IntelligentModels])

  return (
    <div data-token-render={renderNumber} style={{ display: 'contents' }}>
      <AITokens
        className={className}
        modelType={t('AiAgengt.intelligentModels')}
        aiModel={hasRuntimeModelConsumption ? undefined : intelligentModel}
        modelConsumption={tierModelConsumption?.intelligent}
        fallbackConsumption={hasRuntimeModelConsumption ? undefined : consumption?.tier_consumption?.intelligent}
      />
    </div>
  )
}

export default memo(AIMainModelTokens)
