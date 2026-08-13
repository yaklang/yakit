import type React from 'react'
import { useMemo, useState } from 'react'
import classNames from 'classnames'
import { Avatar } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitModal } from '../yakitUI/YakitModal/YakitModal'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '../yakitUI/YakitSpin/YakitSpin'
import { OutlineDocumentduplicateIcon, OutlineArrowUpRightIcon } from '@/assets/icon/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { setClipboardText } from '@/utils/clipboard'
import { formatNumberUnits } from '@/pages/ai-agent/utils'
import type { API } from '@/services/swagger/resposeType'
import type { UserInfoProps } from '@/store'
import { UserPlatformType } from '@/pages/globalVariable'
import yakitImg from '@/assets/yakit.jpg'
import { yakitNotify } from '@/utils/notification'
import CeApiKeysListModal from './CeApiKeysListModal'
import styles from './CeUsageStatisticsModal.module.scss'
import { MetricCaptionFailedIcon, MetricCaptionSuccessIcon } from './icon'

type TokenQuotaLike = {
  tokenUsed?: number
  tokenLimit?: number
  tokenLimitEnable?: boolean
}

/** 计算token使用百分比 */
export const getTokenPercent = (apiKeysInfo: TokenQuotaLike) => {
  const { tokenUsed = 0, tokenLimit = 0 } = apiKeysInfo || {}
  if (tokenUsed > 0 && tokenLimit > 0) {
    return Math.min(100, Math.floor((tokenUsed / tokenLimit) * 100))
  }
  return 0
}

/** 计算token限额 */
export const getTokenLimit = (apiKeysInfo: TokenQuotaLike) => {
  if (apiKeysInfo?.tokenLimit && apiKeysInfo.tokenLimit > 0) {
    return Math.round(apiKeysInfo.tokenLimit / 1000 / 1000)
  }
  return 0
}

export const getTokenUsed = (apiKeysInfo: TokenQuotaLike) => {
  if (apiKeysInfo?.tokenUsed && apiKeysInfo.tokenUsed > 0) {
    return (apiKeysInfo.tokenUsed / 1000 / 1000).toFixed(2)
  }
  return 0
}

const formatPercent = (part: number, total: number) => {
  if (!total || total <= 0) return '0.0'
  return ((part / total) * 100).toFixed(1)
}

export interface CeUsageStatisticsModalProps {
  visible: boolean
  onClose: () => void
  apiKeysInfo: API.ApiUserUsageResponse
  apiKeys?: API.ApiKeyDetail
  userInfo: UserInfoProps
  update: () => void
  loading: boolean
  onOpenRecharge?: () => void
}

const CeUsageStatisticsModal: React.FC<CeUsageStatisticsModalProps> = (props) => {
  const { visible, onClose, apiKeysInfo, apiKeys, userInfo, loading, onOpenRecharge } = props
  const { t } = useI18nNamespaces(['layout'])
  const [apiKeysListVisible, setApiKeysListVisible] = useState(false)

  const platformType = UserPlatformType[userInfo.platform || '']

  const userName = useMemo(() => {
    if (platformType) {
      const nameKey = platformType.name as keyof UserInfoProps
      return (userInfo[nameKey] as string) || ''
    }
    return ''
  }, [userInfo, platformType])

  const avatarSrc = useMemo(() => {
    if (platformType) {
      const imgKey = platformType.img as keyof UserInfoProps
      return (userInfo[imgKey] as string) || yakitImg
    }
    return yakitImg
  }, [userInfo, platformType])

  const apiKeyList = useMemo(() => apiKeys?.apiKey || [], [apiKeys])
  const previewKeys = useMemo(() => apiKeyList.slice(0, 3), [apiKeyList])
  const showAllKeys = apiKeyList.length > 3

  const tokenUsed = useMemo(() => getTokenUsed(apiKeys || {}), [apiKeys])
  const tokenLimit = useMemo(() => getTokenLimit(apiKeys || {}), [apiKeys])
  const tokenPercent = useMemo(() => getTokenPercent(apiKeys || {}), [apiKeys])
  const tokenLimitEnable = !!apiKeys?.tokenLimitEnable
  const tokenBalance = useMemo(() => {
    const usedNum = typeof tokenUsed === 'number' ? tokenUsed : Number(tokenUsed)
    return Math.max(0, Math.round((tokenLimit - (Number.isFinite(usedNum) ? usedNum : 0)) * 100) / 100)
  }, [tokenLimit, tokenUsed])
  const balancePercent = useMemo(() => {
    if (!tokenLimit) return 0
    return Math.max(0, Math.min(100, ((tokenLimit - Number(tokenUsed || 0)) / tokenLimit) * 100))
  }, [tokenLimit, tokenUsed])

  const summary = apiKeysInfo.summary
  const inputTokens = summary?.uncachedInputTokens ?? 0
  const outputTokens = summary?.outputTokens ?? 0
  const tokenIoTotal = inputTokens + outputTokens
  const outputRate = Number(formatPercent(outputTokens, tokenIoTotal))
  const inputRate = Number(formatPercent(inputTokens, tokenIoTotal))
  const RMB = Number(summary?.rmb ?? 0).toFixed(2)
  const CacheCreationTokens = summary?.cacheCreationTokens ?? 0
  const CacheHitTokens = summary?.cacheHitTokens ?? 0

  const handleCopy = useMemoizedFn((apiKey?: string) => {
    if (!apiKey) return
    setClipboardText(apiKey)
  })

  const handleReplace = useMemoizedFn(() => {
    yakitNotify('info', t('CeUserMenu.replaceApiKeyDeveloping'))
  })

  const handleRecharge = useMemoizedFn(() => {
    onOpenRecharge?.()
  })

  return (
    <>
      <YakitModal
        wrapClassName={styles['usage-statistics-modal']}
        visible={visible}
        title={t('CeUserMenu.aiUsageTitle')}
        subTitle={t('CeUserMenu.aiUsageSubtitle')}
        headerStyle={{ padding: '16px 24px 4px' }}
        bodyStyle={{ padding: 0 }}
        type="white"
        width={480}
        footer={null}
        destroyOnClose
        onCancel={onClose}
      >
        <YakitSpin spinning={loading}>
          <div className={styles['usage-statistics-body']}>
            <div className={styles['user-banner']}>
              <div className={styles['user-banner-left']}>
                <Avatar src={avatarSrc} size={40} style={{ marginTop: 2 }} />
                <div className={styles['user-banner-meta']}>
                  <div className={classNames(styles['user-banner-name'], 'yakit-single-line-ellipsis')}>{userName}</div>
                  <div className={styles['user-banner-keys']}>
                    {previewKeys.length === 0 ? (
                      <div className={styles['user-banner-key-empty']}>{t('CeUserMenu.noApiKey')}</div>
                    ) : (
                      previewKeys.map((key, index) => {
                        const showReplace = index === 0
                        const showAll = index === 2 && showAllKeys
                        return (
                          <div key={`${key}-${index}`} className={styles['user-banner-key-row']}>
                            <div className={styles['key-row-main']}>
                              <span className={styles['user-banner-key-label']}>{t('CeUserMenu.apiKey')}:</span>
                              <span
                                className={classNames(styles['user-banner-key-value'], 'yakit-single-line-ellipsis')}
                                title={key}
                              >
                                {key || '-'}
                              </span>
                              {!!key && (
                                <YakitButton
                                  type="text2"
                                  size="small"
                                  icon={<OutlineDocumentduplicateIcon />}
                                  onClick={() => handleCopy(key)}
                                />
                              )}
                            </div>
                            <div className={styles['key-row-aside']}>
                              {showReplace && (
                                <>
                                  <span className={styles['key-row-divider']} />
                                  <div className={styles['key-row-action']} onClick={handleReplace}>
                                    {t('CeUserMenu.replaceApiKey')}
                                    <OutlineArrowUpRightIcon />
                                  </div>
                                </>
                              )}
                              {showAll && (
                                <>
                                  <span className={styles['key-row-divider']} />
                                  <div className={styles['key-row-action']} onClick={() => setApiKeysListVisible(true)}>
                                    {t('CeUserMenu.showAllApiKeys')}
                                    <OutlineArrowUpRightIcon />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles['stats-shell']}>
              <div className={styles['stats-panel']}>
                <div className={styles['section-block']}>
                  <div className={styles['section-header']}>
                    <span className={styles['section-title']}>{t('CeUserMenu.tokenStatistics')}</span>
                    <YakitButton type="primary" onClick={handleRecharge}>
                      {t('CeUserMenu.recharge')}
                    </YakitButton>
                  </div>
                  <div className={styles['token-metrics']}>
                    <div className={classNames(styles['token-metric'], styles['token-metric-balance'])}>
                      <div className={styles['token-metric-line']} />
                      <span className={styles['token-metric-value']}>
                        {tokenLimitEnable ? `${tokenBalance}M` : t('CeUserMenu.unlimited')}
                      </span>
                      <span className={styles['token-metric-label']}>
                        {t('CeUserMenu.balance')}
                        {tokenLimitEnable ? `(${balancePercent.toFixed(1)}%)` : ''}
                      </span>
                    </div>
                    <div className={classNames(styles['token-metric'], styles['token-metric-used'])}>
                      <div className={styles['token-metric-line']} />
                      <span className={styles['token-metric-value']}>{tokenUsed}M</span>
                      <span className={styles['token-metric-label']}>
                        {t('CeUserMenu.tokenUsed')}({tokenPercent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className={classNames(styles['token-metric'], styles['token-metric-total'])}>
                      <div className={styles['token-metric-line']} />
                      <span className={styles['token-metric-value']}>
                        {tokenLimitEnable ? `${tokenLimit}M` : t('CeUserMenu.unlimited')}
                      </span>
                      <span className={styles['token-metric-label']}>{t('CeUserMenu.tokenTotal')}</span>
                    </div>
                  </div>
                </div>

                <div className={styles['section-block']}>
                  <div className={styles['section-header']}>
                    <span className={styles['section-title']}>{t('CeUserMenu.cacheStatistics')}</span>
                  </div>
                  <div className={styles['request-metrics']}>
                    <div className={styles['request-metric']}>
                      <div className={styles['request-metric-caption']}>
                        <div
                          className={classNames(styles['request-metric-caption-title'])}
                          style={{
                            color: 'var(--Colors-Use-Neutral-Text-3-Secondary)',
                          }}
                        >
                          {t('CeUserMenu.cacheCreated')}
                        </div>
                        <div className={styles['request-metric-caption-sub-title']}></div>
                      </div>
                      <div className={styles['request-metric-value']}>{formatNumberUnits(CacheCreationTokens)}</div>
                    </div>
                    <div className={styles['request-metric-line']} />
                    <div className={styles['request-metric']}>
                      <div className={styles['request-metric-caption']}>
                        <div
                          className={classNames(styles['request-metric-caption-title'])}
                          style={{
                            color: 'var(--Colors-Use-Neutral-Text-3-Secondary)',
                          }}
                        >
                          {t('CeUserMenu.cacheHit')}
                        </div>
                        <div className={styles['request-metric-caption-sub-title']}></div>
                      </div>
                      <div className={styles['request-metric-value']}>{formatNumberUnits(CacheHitTokens)}</div>
                    </div>
                    {/* <div className={styles['request-metric']}>
                      <div className={styles['request-metric-header']}>
                        <div className={styles['request-metric-icon']}>
                          <MetricCaptionSuccessIcon />
                        </div>
                        <div className={styles['request-metric-caption']}>
                          <div className={styles['request-metric-caption-title']}>
                            {t('CeUserMenu.success')}({98}%)
                          </div>
                          <div className={styles['request-metric-caption-sub-title']}>Success</div>
                        </div>
                      </div>
                      <div className={classNames(styles['request-metric-value'], styles['request-metric-success'])}>
                        {98}
                      </div>
                    </div>
                    <div className={styles['request-metric-line']} />
                    <div className={styles['request-metric']}>
                      <div className={styles['request-metric-header']}>
                        <div className={styles['request-metric-icon']}>
                          <MetricCaptionFailedIcon />
                        </div>
                        <div className={styles['request-metric-caption']}>
                          <div className={styles['request-metric-caption-title']}>
                            {t('CeUserMenu.failure')}({2}%)
                          </div>
                          <div className={styles['request-metric-caption-sub-title']}>Fail</div>
                        </div>
                      </div>
                      <div className={classNames(styles['request-metric-value'], styles['request-metric-fail'])}>
                        {2}
                      </div>
                    </div> */}
                  </div>
                </div>

                <div className={styles['bottom-row']}>
                  <div className={styles['byte-card']}>
                    <div className={styles['section-header']}>
                      <span className={styles['section-title']}>{t('CeUserMenu.byteStatistics')}</span>
                    </div>
                    <div className={styles['byte-metrics']}>
                      <div className={styles['byte-metric-output']}>
                        <span className={styles['byte-metric-value']}>{formatNumberUnits(outputTokens)}</span>
                        <span className={styles['byte-metric-name']}>{t('CeUserMenu.output')}</span>
                        <span className={styles['byte-metric-percent']}>{outputRate.toFixed(1)}%</span>
                      </div>
                      <div className={styles['byte-metric-input']}>
                        <span className={styles['byte-metric-value']}>{formatNumberUnits(inputTokens)}</span>
                        <span className={styles['byte-metric-name']}>{t('CeUserMenu.input')}</span>
                        <span className={styles['byte-metric-percent']}>{inputRate.toFixed(1)}%</span>
                      </div>
                      {/* <div className={styles['byte-progress']}>
                        <div className={styles['byte-progress-output']} />
                        <div className={styles['byte-progress-input']} />
                      </div> */}
                    </div>
                  </div>

                  <div className={styles['search-card']}>
                    <div className={styles['section-header']}>
                      <span className={styles['section-title']}>{t('CeUserMenu.cumulativeAmount')}</span>
                    </div>
                    <div className={styles['search-box']}>
                      <div className={styles['search-caption']}>Total</div>
                      <div className={styles['search-value']}>{RMB}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </YakitSpin>
      </YakitModal>

      <CeApiKeysListModal visible={apiKeysListVisible} onClose={() => setApiKeysListVisible(false)} />
    </>
  )
}

export default CeUsageStatisticsModal
