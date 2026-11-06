import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { formatNumberUnits } from '../../utils'
import type React from 'react'
import { memo, useState } from 'react'
import { useCreation } from 'ahooks'
import { Tooltip, Select } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import classNames from 'classnames'
import { OutlineArrowdownIcon, OutlineArrowupIcon } from '@/assets/icon/outline'
import type { AIModelConfig } from '../../aiModelList/utils'
import { getIconByAI } from '../../aiModelList/aiModelSelect/AIModelSelect'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from '../AIChatContent.module.scss'

interface AITokensProps {
  modelType: string
  aiModel?: AIModelConfig
  token: [number | string, number | string, number | string, number | string]
  modelConsumption?: AIAgentGrpcApi.AIModelConsumptionStats[]
}

const AITokens: React.FC<AITokensProps> = ({ modelType, aiModel, token: legacyToken, modelConsumption }) => {
  const [selectedKey, setSelectedKey] = useState('')
  const modelKey = (m: AIAgentGrpcApi.AIModelConsumptionStats) =>
    JSON.stringify([m.provider_type, m.model_name, m.thinking_level])
  const actual = modelConsumption?.find((m) => modelKey(m) === selectedKey) ?? modelConsumption?.[0]
  const totalInput = (actual?.input_consumption || 0) + (actual?.cache_hit_token || 0)
  const token = actual
    ? [
        formatNumberUnits(actual.input_consumption),
        formatNumberUnits(actual.output_consumption),
        formatNumberUnits(actual.cache_hit_token),
        totalInput ? +((actual.cache_hit_token / totalInput) * 100).toFixed(2) : 0,
      ]
    : modelConsumption !== undefined
      ? [0, 0, 0, 0]
      : legacyToken
  const { t } = useI18nNamespaces(['aiAgent'])
  const icon = useCreation(() => {
    const provider = actual?.provider_type || (modelConsumption === undefined ? aiModel?.Provider?.Type : undefined)
    return provider ? getIconByAI(provider) : <></>
  }, [aiModel?.Provider?.Type, actual?.provider_type, modelConsumption])
  const modelName =
    actual?.model_name ||
    (modelConsumption === undefined ? aiModel?.ModelName : '') ||
    t('AIContextToken.noCallRecords')

  return (
    <div className={styles['ai-tokens']}>
      <div className={styles['ai-tokens-heard']}>
        <span className={styles['title']}>{modelType}</span>
        <div className={styles['model']}>
          {icon}
          {modelConsumption?.length ? (
            <Select
              aria-label={`${modelType} ${t('AIModelSelect.selectModel')}`}
              style={{ minWidth: 160, maxWidth: 300 }}
              value={actual ? modelKey(actual) : undefined}
              onChange={setSelectedKey}
              bordered={false}
              options={modelConsumption.map((m) => ({
                value: modelKey(m),
                label: `${m.model_name || t('AIContextToken.unknownModel')} · ${m.provider_type || ''}${
                  m.thinking_level ? ` · ${m.thinking_level}` : ''
                }`,
              }))}
            />
          ) : (
            <div className={styles['model-text']} title={modelName}>
              {modelName}
            </div>
          )}
        </div>
      </div>
      <div className={styles['ai-tokens-content']}>
        <div className={styles['ai-tokens-item']}>
          <div className={styles['token-item']}>
            {t('AIContextToken.input')}
            <OutlineArrowupIcon />
          </div>
          <div className={classNames(styles['token-tag'], styles['upload-token'])}>{token[0]}</div>
        </div>
        <div className={styles['diver']} />
        <div className={styles['ai-tokens-item']}>
          <div className={styles['token-item']}>
            {t('AIContextToken.output')}
            <OutlineArrowdownIcon />
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
