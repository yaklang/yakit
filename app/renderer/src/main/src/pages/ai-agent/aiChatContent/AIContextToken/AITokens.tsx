import React, { memo } from 'react'
import { useCreation } from 'ahooks'
import { Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import classNames from 'classnames'
import { OutlineArrowdownIcon, OutlineArrowupIcon } from '@/assets/icon/outline'
import { AIModelConfig } from '../../aiModelList/utils'
import { getIconByAI } from '../../aiModelList/aiModelSelect/AIModelSelect'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from '../AIChatContent.module.scss'

interface AITokensProps {
  modelType: string
  aiModel?: AIModelConfig
  token: [number | string, number | string, number | string, number | string]
}

const AITokens: React.FC<AITokensProps> = ({ modelType, aiModel, token }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const icon = useCreation(() => {
    if (!aiModel?.Provider?.Type) return <></>
    return getIconByAI(aiModel?.Provider?.Type)
  }, [aiModel?.Provider?.Type])
  const modelName = useCreation(() => aiModel?.ModelName || '', [aiModel?.ModelName])

  return (
    <div className={styles['ai-tokens']}>
      <div className={styles['ai-tokens-heard']}>
        <span className={styles['title']}>{modelType}</span>
        <div className={styles['model']}>
          {icon}
          <div className={styles['model-text']} title={modelName}>
            {modelName}
          </div>
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
