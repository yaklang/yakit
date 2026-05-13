import React, { memo, useMemo } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import ChatCard from '../ChatCard'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import type { AIHttpFlowFuzzStatusCardProps } from './type'
import styles from './AIHttpFlowFuzzStatusCard.module.scss'

export const AIHttpFlowFuzzStatusCard: React.FC<AIHttpFlowFuzzStatusCardProps> = memo((props) => {
  const { item } = props
  const { data } = item
  const { t } = useI18nNamespaces(['aiAgent'])

  const badge = useMemo(() => {
    if (data.engine_status === 'finish') {
      return { text: t('AIHttpFlowFuzzStatusCard.badgeDone'), done: true }
    }
    if (data.engine_status === 'start') {
      return { text: t('AIHttpFlowFuzzStatusCard.badgeStarting'), done: false }
    }
    return { text: t('AIHttpFlowFuzzStatusCard.badgeSending'), done: false }
  }, [data.engine_status, t])

  const p = data.progress
  const total = p?.total_requests ?? 0
  const ok = p?.successful_responses ?? 0
  const fail = p?.failed_requests ?? 0
  const avgMs = p?.average_response_ms

  const openDetail = useMemoizedFn(() => {
    const m = showYakitModal({
      title: t('AIHttpFlowFuzzStatusCard.detailTitle'),
      width: 520,
      footer: null,
      closable: true,
      maskClosable: true,
      onCancel: () => m.destroy(),
      content: (
        <div style={{ padding: '8px 0 0' }}>
          <div className={styles['detail-section']}>
            <div className={styles['detail-title']}>{t('AIHttpFlowFuzzStatusCard.savedFlows')}</div>
            <div>{p?.saved_httpflow_count ?? '—'}</div>
          </div>
          <div className={styles['detail-section']}>
            <div className={styles['detail-title']}>{t('AIHttpFlowFuzzStatusCard.interesting')}</div>
            <div>{p?.interesting_sample_num ?? '—'}</div>
          </div>
          {p?.last_status_code != null && (
            <div className={styles['detail-section']}>
              <div className={styles['detail-title']}>{t('AIHttpFlowFuzzStatusCard.lastStatus')}</div>
              <div>{p.last_status_code}</div>
            </div>
          )}
          {!!p?.status_counts?.length && (
            <div className={styles['detail-section']}>
              <div className={styles['detail-title']}>{t('AIHttpFlowFuzzStatusCard.statusDistribution')}</div>
              <table className={styles['detail-table']}>
                <thead>
                  <tr>
                    <th>{t('AIHttpFlowFuzzStatusCard.colCode')}</th>
                    <th>{t('AIHttpFlowFuzzStatusCard.colCount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.status_counts.map((row, i) => (
                    <tr key={`${row.code}-${i}`}>
                      <td>{row.code}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!!p?.response_length_groups?.length && (
            <div className={styles['detail-section']}>
              <div className={styles['detail-title']}>{t('AIHttpFlowFuzzStatusCard.lengthDistribution')}</div>
              <table className={styles['detail-table']}>
                <thead>
                  <tr>
                    <th>{t('AIHttpFlowFuzzStatusCard.colLength')}</th>
                    <th>{t('AIHttpFlowFuzzStatusCard.colCount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.response_length_groups.map((row, i) => (
                    <tr key={`${row.body_length}-${i}`}>
                      <td>{row.body_length}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    })
  })

  return (
    <ChatCard
      titleText={t('AIHttpFlowFuzzStatusCard.title')}
      titleExtra={<span className={classNames(styles.badge, badge.done && styles['badge-done'])}>{badge.text}</span>}
      titleMore={
        <YakitButton type='outline2' size='small' onClick={openDetail}>
          {t('AIHttpFlowFuzzStatusCard.viewDetail')}
        </YakitButton>
      }
    >
      <div className={styles.desc}>{data.action_name || '—'}</div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles['stat-value']}>{total}</div>
          <div className={styles['stat-label']}>{t('AIHttpFlowFuzzStatusCard.sentTotal')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles['stat-value']}>{ok}</div>
          <div className={styles['stat-label']}>{t('AIHttpFlowFuzzStatusCard.successCount')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles['stat-value']}>{fail}</div>
          <div className={styles['stat-label']}>{t('AIHttpFlowFuzzStatusCard.failCount')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles['stat-value']}>{avgMs != null ? avgMs : t('AIHttpFlowFuzzStatusCard.dash')}</div>
          <div className={styles['stat-label']}>{t('AIHttpFlowFuzzStatusCard.avgMs')}</div>
        </div>
      </div>
    </ChatCard>
  )
})

AIHttpFlowFuzzStatusCard.displayName = 'AIHttpFlowFuzzStatusCard'
