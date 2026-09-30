import type React from 'react'
import { useMemo } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { API } from '@/services/swagger/resposeType'
import { getBalanceYuanText, getTokenLimit, getTokenRemaining, getTokenRemainingPercent } from './ceTokenQuota'
import styles from './CeUserMenu.module.scss'

export interface CeUserTokenQuotaProps {
  apiKeys: API.ApiKeyDetail
  className?: string
  /** 点击整块（如打开用量统计）；充值按钮会 stopPropagation */
  onClick?: (e: React.MouseEvent) => void
  onRecharge?: () => void
}

export const CeUserTokenQuota: React.FC<CeUserTokenQuotaProps> = (props) => {
  const { apiKeys, className, onClick, onRecharge } = props
  const { t } = useI18nNamespaces(['layout'])

  const tokenRemainingPercent = useMemo(() => getTokenRemainingPercent(apiKeys), [apiKeys])
  const tokenRemaining = useMemo(() => getTokenRemaining(apiKeys), [apiKeys])
  const tokenLimit = useMemo(() => getTokenLimit(apiKeys), [apiKeys])
  const balanceYuanText = useMemo(() => getBalanceYuanText(apiKeys), [apiKeys])

  const handleRecharge = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation()
    onRecharge?.()
  })

  return (
    <div
      className={classNames(styles['ce-user-info-token'], className)}
      data-testid="ce-user-token-quota"
      onClick={onClick}
    >
      <div className={styles['ce-user-info-balance-row']}>
        <span className={styles['ce-user-info-balance']}>
          {t('CeUserMenu.balance')}
          <span className={styles['ce-user-info-balance-value']}>
            {apiKeys.tokenLimitEnable ? `¥${balanceYuanText}` : t('CeUserMenu.unlimited')}
          </span>
        </span>
        <button type="button" className={styles['ce-user-info-recharge']} onClick={handleRecharge}>
          {t('CeUserMenu.recharge')}
        </button>
      </div>
      <div className={styles['ce-user-info-progress-box']}>
        <div className={styles['ce-user-info-progress-track']}>
          <div className={styles['ce-user-info-progress-fill']} style={{ width: `${tokenRemainingPercent}%` }} />
        </div>
      </div>
      <div className={styles['ce-user-info-token-row']}>
        <span className={styles['ce-user-info-token-label']}>
          {t('CeUserMenu.tokenRemaining')}
          <span className={styles['ce-user-info-token-percent']}>({tokenRemainingPercent.toFixed(1)}%)</span>
        </span>
        <span className={styles['ce-user-info-token-value']}>
          {apiKeys.tokenLimitEnable ? `${tokenRemaining}/${tokenLimit}M` : t('CeUserMenu.unlimited')}
        </span>
      </div>
    </div>
  )
}

export default CeUserTokenQuota
