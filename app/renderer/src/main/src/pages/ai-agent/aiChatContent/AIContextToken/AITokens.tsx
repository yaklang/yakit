import type React from 'react'
import { memo } from 'react'
import { useCreation } from 'ahooks'
import { Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import classNames from 'classnames'
import { ArrowDownOutlined, ArrowUpOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import type { AIModelConfig } from '../../aiModelList/utils'
import { getIconByAI } from '../../aiModelList/aiModelSelect/AIModelSelect'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { formatNumberUnits } from '../../utils'
import styles from '../AIChatContent.module.scss'

interface AITokensProps {
  modelType: string
  aiModel?: AIModelConfig
  modelConsumption?: AIAgentGrpcApi.AIModelConsumptionStats[]
  consumption?: AIAgentGrpcApi.AIConsumptionStats
}

const thinkingLevelKeys: Record<string, string> = {
  auto: 'AIContextToken.thinkingLevels.auto',
  none: 'AIContextToken.thinkingLevels.none',
  low: 'AIContextToken.thinkingLevels.low',
  medium: 'AIContextToken.thinkingLevels.medium',
  high: 'AIContextToken.thinkingLevels.high',
  xhigh: 'AIContextToken.thinkingLevels.xhigh',
  max: 'AIContextToken.thinkingLevels.max',
}

export const getThinkingLevelLabel = (t: TFunction, thinkingLevel?: string) => {
  if (!thinkingLevel) return ''
  const key = thinkingLevelKeys[thinkingLevel.toLowerCase()]
  return key ? t(key) : thinkingLevel
}

const AITokens: React.FC<AITokensProps> = ({ modelType, aiModel, modelConsumption, consumption }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const modelList = useCreation<AIAgentGrpcApi.AIModelConsumptionStats[]>(() => {
    if (modelConsumption?.length) return modelConsumption
    if (!aiModel) return []
    return [
      {
        provider_type: aiModel.Provider?.Type,
        model_name: aiModel.ModelName,
        input_consumption: 0,
        output_consumption: 0,
        cache_hit_token: 0,
      },
    ]
  }, [modelConsumption, aiModel])

  const token = useCreation(() => {
    const input = consumption?.input_consumption || 0
    const output = consumption?.output_consumption || 0
    const cacheHit = consumption?.cache_hit_token || 0
    const totalInput = input + cacheHit
    const percent = totalInput > 0 && cacheHit > 0 ? Number(((cacheHit / totalInput) * 100).toFixed(2)) : 0
    return [formatNumberUnits(input), formatNumberUnits(output), formatNumberUnits(cacheHit), percent]
  }, [consumption])

  return (
    <div className={styles['ai-tokens']}>
      <div className={styles['ai-tokens-heard']}>
        <span className={styles['title']}>{modelType}</span>
        <div className={styles['model-list']}>
          {modelList.length ? (
            modelList.map((model, index) => {
              const modelName = model.model_name || ''
              const thinkingLevel = getThinkingLevelLabel(t, model.thinking_level)
              return (
                <div
                  className={styles['model']}
                  key={`${model.provider_type || ''}-${modelName}-${model.thinking_level || ''}-${index}`}
                >
                  {!!model.provider_type && getIconByAI(model.provider_type)}
                  <div className={styles['model-text']} title={modelName}>
                    {modelName || t('AIContextToken.unknownModel')}
                  </div>
                  {!!thinkingLevel && (
                    <Tooltip title={`${t('AIContextToken.thinkingLevel')}：${thinkingLevel}`}>
                      <span className={styles['thinking-level']}>{thinkingLevel}</span>
                    </Tooltip>
                  )}
                </div>
              )
            })
          ) : (
            <span className={styles['no-model-record']}>{t('AIContextToken.noCallRecords')}</span>
          )}
        </div>
      </div>
      <div className={styles['ai-tokens-content']}>
        <div className={styles['ai-tokens-item']}>
          <div className={styles['token-item']}>
            {t('AIContextToken.input')}
            <ArrowUpOutlined color="currentColor" />
          </div>
          <div className={classNames(styles['token-tag'], styles['upload-token'])}>{token[0]}</div>
        </div>
        <div className={styles['diver']} />
        <div className={styles['ai-tokens-item']}>
          <div className={styles['token-item']}>
            {t('AIContextToken.output')}
            <ArrowDownOutlined color="currentColor" />
          </div>
          <div className={classNames(styles['token-tag'], styles['download-token'])}>{token[1]}</div>
        </div>
        <div className={styles['diver']} />
        <div className={styles['ai-tokens-item']}>
          <div className={styles['token-item']}>
            {t('AIContextToken.cache')}
            {Number(token[3]) > 0 && (
              <Tooltip title={`${t('AIContextToken.cacheTooltip')}：${token[3]}%`}>
                <QuestionCircleOutlined />
              </Tooltip>
            )}
          </div>
          <div className={classNames(styles['token-tag'], styles['download-token'])}>{token[2]}</div>
        </div>
      </div>
    </div>
  )
}

export default memo(AITokens)
