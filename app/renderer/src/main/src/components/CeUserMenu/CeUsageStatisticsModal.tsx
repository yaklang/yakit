import React, { useMemo } from 'react'
import classNames from 'classnames'
import { Progress } from 'antd'
import { YakitModal } from '../yakitUI/YakitModal/YakitModal'
import { HorizontalScrollCardItemInfoMultiple } from '@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard'
import { OutlineDocumentduplicateIcon, OutlineHashtagIcon, OutlineRefreshIcon } from '@/assets/icon/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { setClipboardText } from '@/utils/clipboard'
import styles from './CeUsageStatisticsModal.module.scss'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { API } from '@/services/swagger/resposeType'
import { formatNumberUnits } from '@/pages/ai-agent/utils'
import { YakitSpin } from '../yakitUI/YakitSpin/YakitSpin'

/** 计算token使用百分比 */
export const getTokenPercent = (apiKeysInfo: API.ApiKeyDetail) => {
  const { tokenUsed = 0, tokenLimit = 0 } = apiKeysInfo || {}
  if (tokenUsed > 0 && tokenLimit > 0) {
    return Math.min(100, Math.floor((tokenUsed / tokenLimit) * 100))
  }
  return 0
}

/** 计算token限额 */
export const getTokenLimit = (apiKeysInfo: API.ApiKeyDetail) => {
  // 转换为mb
  if (apiKeysInfo?.tokenLimit && apiKeysInfo.tokenLimit > 0) {
    return Math.round(apiKeysInfo.tokenLimit / 1000 / 1000)
  }
  return 0
}

export const getTokenUsed = (apiKeysInfo: API.ApiKeyDetail) => {
  if (apiKeysInfo?.tokenUsed && apiKeysInfo.tokenUsed > 0) {
    return (apiKeysInfo.tokenUsed / 1000 / 1000).toFixed(2)
  }
  return 0
}

export interface CeUsageStatisticsModalProps {
  visible: boolean
  onClose: () => void
  apiKeysInfo: API.ApiKeyDetail
  update: () => void
  loading: boolean
}

export const CeUsageStatisticsModal: React.FC<CeUsageStatisticsModalProps> = (props) => {
  const { visible, onClose, apiKeysInfo, update, loading } = props
  const { t } = useI18nNamespaces(['layout'])

  const requestStatsInfo = useMemo(
    () => [
      { Id: t('CeUserMenu.success'), Data: `${apiKeysInfo.successCount || '-'}`, Timestamp: 0 },
      { Id: t('CeUserMenu.failure'), Data: `${apiKeysInfo.failureCount || '-'}`, Timestamp: 0 },
      { Id: t('CeUserMenu.total'), Data: `${apiKeysInfo.usageCount || '-'}`, Timestamp: 0 },
    ],
    [t, apiKeysInfo.successCount, apiKeysInfo.failureCount, apiKeysInfo.usageCount],
  )

  const byteStatsInfo = useMemo(
    () => [
      {
        Id: t('CeUserMenu.input'),
        Data: `${apiKeysInfo.inputBytes ? formatNumberUnits(apiKeysInfo.inputBytes) : '-'}`,
        Timestamp: 0,
      },
      {
        Id: t('CeUserMenu.output'),
        Data: `${apiKeysInfo.outputBytes ? formatNumberUnits(apiKeysInfo.outputBytes) : '-'}`,
        Timestamp: 0,
      },
    ],
    [t, apiKeysInfo.inputBytes, apiKeysInfo.outputBytes],
  )

  return (
    <YakitModal
      wrapClassName={styles['usage-statistics-modal']}
      visible={visible}
      title={t('CeUserMenu.usageStatistics')}
      type="white"
      width={640}
      footer={null}
      destroyOnClose
      onCancel={onClose}
    >
      <YakitSpin spinning={loading}>
        <div className={styles['usage-statistics-body']}>
          <div className={styles['api-key-row']}>
            <div className={styles['api-key-row-left']}>
              <span className={styles['api-key-label']}>{t('CeUserMenu.apiKey')}:</span>
              <span className={styles['api-key-value']} title={apiKeysInfo.apiKey}>
                {apiKeysInfo.apiKey}
              </span>
              {apiKeysInfo.apiKey && (
                <YakitButton
                  type="text2"
                  size="small"
                  icon={<OutlineDocumentduplicateIcon />}
                  onClick={() => setClipboardText(apiKeysInfo.apiKey)}
                />
              )}
            </div>
            <div className={styles['api-key-row-right']}>
              <YakitButton type="text2" size="small" icon={<OutlineRefreshIcon />} onClick={update} />
            </div>
          </div>

          <div className={styles['stats-grid']}>
            <HorizontalScrollCardItemInfoMultiple
              className={styles['stats-grid-card']}
              tag={t('CeUserMenu.requestStatistics')}
              info={requestStatsInfo}
            />
            <HorizontalScrollCardItemInfoMultiple
              className={styles['stats-grid-card']}
              tag={t('CeUserMenu.byteStatistics')}
              info={byteStatsInfo}
            />

            <div className={styles['token-consumption-card']}>
              <div className={styles['token-consumption-tag']}>
                <OutlineHashtagIcon />
                {t('CeUserMenu.tokenConsumption')}
              </div>
              <div className={styles['token-consumption-body']}>
                <Progress
                  type="circle"
                  percent={getTokenPercent(apiKeysInfo)}
                  width={72}
                  strokeColor="var(--Colors-Use-Main-Primary)"
                  trailColor="var(--Colors-Use-Neutral-Bg)"
                  className={styles['token-consumption-progress']}
                />
                <div className={styles['token-consumption-info']}>
                  <div className={styles['token-consumption-info-item']}>
                    <span className={styles['token-consumption-info-label']}>{t('CeUserMenu.tokenUsed')}: </span>
                    {getTokenUsed(apiKeysInfo)}M
                  </div>
                  <div className={styles['token-consumption-info-item']}>
                    <span className={styles['token-consumption-info-label']}>{t('CeUserMenu.tokenLimit')}: </span>
                    {getTokenLimit(apiKeysInfo)}M
                  </div>
                </div>
              </div>
            </div>

            <div className={classNames(styles['token-consumption-card'], styles['network-search-card'])}>
              <div className={styles['token-consumption-tag']}>
                <OutlineHashtagIcon />
                {t('CeUserMenu.networkSearchCount')}
              </div>
              <div className={styles['network-search-body']}>
                <span className={styles['network-search-value']}>{apiKeysInfo.webSearchCount ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </YakitSpin>
    </YakitModal>
  )
}
