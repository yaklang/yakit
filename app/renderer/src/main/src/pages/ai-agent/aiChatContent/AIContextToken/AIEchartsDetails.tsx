import React, { memo, useEffect, useRef, useState } from 'react'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import {
  AICostDetailsEcharts,
  AICostDetailsEchartsProps,
  AIPressureDetailsEcharts,
  AIPressureDetailsEchartsProps,
  TokenCountEcharts,
  type ContextStatsChartMetric,
} from '../../chatTemplate/AIEcharts'
import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { AIChatData } from '../../type/aiChat'
import { formatNumberUnits } from '../../utils'
import {
  OutlineArrowdownIcon,
  OutlineArrowupIcon,
  OutlinePresentationchartlineIcon,
  OutlineXIcon,
} from '@/assets/icon/outline'
import classNames from 'classnames'
import { getPressuresData, getCostData, getThreshold, getContextStatsData } from './utils'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { AIDetailsDashIcon } from '../../aiChatWelcome/icon'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import ContextTable from './ContextTable/ContextTable'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { AIModelConfig } from '../../aiModelList/utils'
import AITokens from './AITokens'
import styles from '../AIChatContent.module.scss'

interface CurrentModel {
  intelligentModels?: AIModelConfig
  lightweightModels?: AIModelConfig
}

export interface AIEchartsDetailsProps {
  overallToken: [number | string, number | string, number | string]
  tierConsumption?: AIAgentGrpcApi.Consumption['tier_consumption']
  pressure?: AIChatData['aiPerfData']['pressure']
  firstCost?: AIChatData['aiPerfData']['firstCost']
  contextStats?: AIChatData['aiPerfData']['contextStats']
  contextSections?: AIChatData['aiPerfData']['contextSections']
  onClose: () => void
  renderNumber: number
}

const AIEchartsDetails: React.FC<AIEchartsDetailsProps> = ({
  overallToken,
  tierConsumption,
  pressure,
  firstCost,
  contextStats,
  contextSections,
  onClose,
  renderNumber,
}) => {
  const { t, i18n } = useI18nNamespaces(['aiAgent'])
  const ref = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(ref)
  const [aiGlobalConfigData, event] = useAIGlobalConfig()
  const [contextStatsMetric, setContextStatsMetric] = useState<ContextStatsChartMetric>('tokens')

  useEffect(() => {
    inViewport && event.onRefresh()
  }, [event, inViewport])

  const aiGlobalConfig = useCreation(() => aiGlobalConfigData.aiGlobalConfig, [aiGlobalConfigData.aiGlobalConfig])

  const currentModel = useCreation((): CurrentModel => {
    const data: CurrentModel = {}
    if (aiGlobalConfig?.IntelligentModels?.length) {
      data.intelligentModels = aiGlobalConfig.IntelligentModels[0]
    }
    if (aiGlobalConfig?.LightweightModels?.length) {
      data.lightweightModels = aiGlobalConfig.LightweightModels[0]
    }
    return data
  }, [aiGlobalConfig.IntelligentModels, aiGlobalConfig.LightweightModels])

  const intelligentToken = useCreation(() => {
    if (!tierConsumption?.intelligent) return [0, 0, 0, 0]
    const input = tierConsumption.intelligent.input_consumption || 0
    const output = tierConsumption.intelligent.output_consumption || 0
    const cacheHit = tierConsumption.intelligent.cache_hit_token || 0
    let percent = 0
    if (input !== 0 && cacheHit !== 0) {
      percent = Number(((Number(cacheHit) / Number(input)) * 100).toFixed(2))
    }
    return [formatNumberUnits(input), formatNumberUnits(output), formatNumberUnits(cacheHit), percent]
  }, [renderNumber, tierConsumption?.intelligent])

  const lightweightToken = useCreation(() => {
    if (!tierConsumption?.lightweight) return [0, 0, 0, 0]
    const input = tierConsumption.lightweight.input_consumption || 0
    const output = tierConsumption.lightweight.output_consumption || 0
    const cacheHit = tierConsumption.lightweight.cache_hit_token || 0
    let percent = 0
    if (input !== 0 && cacheHit !== 0) {
      percent = Number(((Number(cacheHit) / Number(input)) * 100).toFixed(2))
    }
    return [formatNumberUnits(input), formatNumberUnits(output), formatNumberUnits(cacheHit), percent]
  }, [renderNumber, tierConsumption?.lightweight])

  const pressuresEcharts: AIPressureDetailsEchartsProps['dataEcharts'] = useCreation(() => {
    return getPressuresData(pressure)
  }, [renderNumber, pressure?.intelligent, pressure?.lightweight])

  const costEcharts: AICostDetailsEchartsProps['dataEcharts'] = useCreation(() => {
    return getCostData(firstCost)
  }, [renderNumber, firstCost?.intelligent, firstCost?.lightweight])

  const threshold = useCreation(
    () => getThreshold(pressure),
    [renderNumber, pressure?.intelligent, pressure?.lightweight],
  )

  const contextStatsData = useCreation(() => {
    return getContextStatsData(contextStats?.data)
  }, [renderNumber, contextStats])

  const contextStatsTotalDisplay = useCreation(() => {
    if (contextStatsMetric === 'tokens') {
      return formatNumberUnits(contextStats?.prompt_tokens ?? 0)
    }
    return formatNumberUnits(contextStats?.prompt_bytes ?? 0)
  }, [contextStatsMetric, contextStats?.prompt_bytes, contextStats?.prompt_tokens])

  const contextSectionsData = useCreation(() => {
    if (!contextSections?.sections) {
      return {
        summary: new Map<string, string>(),
        sections: [],
      }
    }
    return {
      summary: contextSections.summary,
      sections: contextSections.sections,
    }
  }, [renderNumber, contextSections?.sections])

  const getEchartsHeard = useMemoizedFn((title: string) => {
    return (
      <div className={styles['echarts-heard']}>
        <div className={styles['echarts-heard-left']}>
          <div className={styles['title']}>{title}</div>
          {title === t('AIContextToken.pressure') && (
            <div className={styles['threshold']}>
              {t('AIContextToken.limit')}:{formatNumberUnits(threshold)}
            </div>
          )}
        </div>
        <div className={styles['extra']}>
          <div className={styles['intelligent']}>
            <AIDetailsDashIcon className={styles['intelligent-icon']} />
            <span>{t('AiAgengt.intelligentModels')}</span>
          </div>
          <div className={styles['lightweight']}>
            <AIDetailsDashIcon className={styles['lightweight-icon']} />
            <span>{t('AiAgengt.lightweightModels')}</span>
          </div>
        </div>
      </div>
    )
  })

  const isShowPressure = useCreation(() => {
    return !!(
      pressuresEcharts?.data?.intelligent?.length > 0 ||
      pressuresEcharts?.data?.lightweight?.length > 0 ||
      pressuresEcharts?.data?.vision?.length > 0
    )
  }, [pressuresEcharts.data])

  const isShowCost = useCreation(() => {
    return !!(
      costEcharts?.data?.intelligent?.length > 0 ||
      costEcharts?.data?.lightweight?.length > 0 ||
      costEcharts?.data?.vision?.length > 0
    )
  }, [costEcharts.data])

  return (
    <div
      className={styles['echarts-details-wrapper']}
      ref={ref}
      style={{ width: i18n.language.startsWith('zh') ? 480 : 550 }}
    >
      <div className={styles['echarts-details-heard']}>
        <div className={styles['echarts-details-title']}>
          <OutlinePresentationchartlineIcon />
          <span>{t('AIContextToken.dataDetails')}</span>
        </div>
        <YakitButton icon={<OutlineXIcon />} type="text2" onClick={onClose} />
      </div>
      <div className={styles['echarts-details-content']}>
        <div className={styles['token-wrapper']}>
          <div className={styles['token-heard']}>
            <span>Tokens:</span>
            <div className={styles['token-overall-wrapper']}>
              <div className={styles['token-overall']}>
                <span>{t('AIContextToken.totalInput')}</span>
                <div className={classNames(styles['token-tag'], styles['upload-token'])}>
                  <OutlineArrowupIcon />
                  {overallToken[0]}
                </div>
              </div>
              <div className={styles['token-overall']}>
                <span>{t('AIContextToken.totalOutput')}</span>
                <div className={classNames(styles['token-tag'], styles['download-token'])}>
                  <OutlineArrowdownIcon />
                  {overallToken[1]}
                </div>
              </div>
              <div className={styles['token-overall']}>
                <span>{t('AIContextToken.cache')}</span>
                <div className={classNames(styles['token-tag'], styles['download-token'])}>{overallToken[2]}</div>
              </div>
            </div>
          </div>
          <div className={styles['token-content']}>
            <AITokens
              modelType={t('AiAgengt.intelligentModels')}
              aiModel={currentModel?.intelligentModels}
              token={[intelligentToken[0], intelligentToken[1], intelligentToken[2], intelligentToken[3]]}
            />
            <AITokens
              modelType={t('AiAgengt.lightweightModels')}
              aiModel={currentModel?.lightweightModels}
              token={[lightweightToken[0], lightweightToken[1], lightweightToken[2], lightweightToken[3]]}
            />
          </div>
        </div>
        {isShowPressure && (
          <div className={styles['pressure-wrapper']}>
            {getEchartsHeard(t('AIContextToken.pressure'))}
            <AIPressureDetailsEcharts dataEcharts={pressuresEcharts} threshold={threshold} />
          </div>
        )}
        {isShowCost && (
          <div className={styles['cost-wrapper']}>
            {getEchartsHeard(t('AIContextToken.speed'))}
            <AICostDetailsEcharts dataEcharts={costEcharts} />
          </div>
        )}
        {(!!contextStats?.prompt_bytes || !!contextStats?.prompt_tokens) && (
          <div className={styles['cost-wrapper']}>
            <div className={styles['echarts-heard']}>
              <div className={styles['echarts-heard-left']}>
                <div className={styles['title']}>上下文统计</div>
                <YakitRadioButtons
                  size="small"
                  value={contextStatsMetric}
                  buttonStyle="solid"
                  onChange={(v) => {
                    setContextStatsMetric(v.target.value as ContextStatsChartMetric)
                  }}
                  options={[
                    { value: 'tokens', label: 'Token' },
                    { value: 'bytes', label: 'Byte' },
                  ]}
                />
              </div>
              <div className={styles['total']}>
                总数 <span>{contextStatsTotalDisplay}</span>
              </div>
            </div>
            <TokenCountEcharts contextStatsData={contextStatsData} metric={contextStatsMetric} />
          </div>
        )}
        {contextSectionsData?.sections.length > 0 && (
          <div style={{ height: '320px' }}>
            <ContextTable contextSectionsData={contextSectionsData} roleLabelMap={contextStats?.data?.role_labels} />
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(AIEchartsDetails)
