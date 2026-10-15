import React, { useMemo } from 'react'
import { useCreation } from 'ahooks'
import styles from './AIToDoList.module.scss'
import type { AIToDoListDetailProps } from './type'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const todoStatStyleConfigs = [
  {
    key: 'deleted',
    labelKey: 'AIToDoListDetail.deleted',
    color: 'var(--Colors-Use-Status-High)',
    backgroundColor: 'var(--Colors-Use-Status-High)',
  },
  {
    key: 'done',
    labelKey: 'AIToDoListDetail.done',
    color: 'var(--Colors-Use-Status-Safe)',
    backgroundColor: 'var(--Colors-Use-Status-Safe)',
  },
  {
    key: 'doing',
    labelKey: 'AIToDoListDetail.doing',
    color: 'var(--Colors-Use-Main-Primary)',
    backgroundColor: 'var(--Colors-Use-Main-Primary)',
  },
  {
    key: 'skipped',
    labelKey: 'AIToDoListDetail.skipped',
    color: 'var(--Colors-Use-Neutral-Text-4-Help-text)',
    backgroundColor: 'var(--Colors-Use-Neutral-Disable)',
  },
  {
    key: 'pending',
    labelKey: 'AIToDoListDetail.pending',
    color: 'var(--Colors-Use-Neutral-Text-1-Title)',
    backgroundColor: 'var(--Colors-Use-Basic-Background)',
  },
] as const

export const AIToDoListDetail: React.FC<AIToDoListDetailProps> = React.memo((props) => {
  const { todoData } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const total = useCreation(() => todoData.items.length, [todoData.items.length])
  const visibleStats = useMemo(() => todoStatStyleConfigs.filter((item) => todoData.stats[item.key]), [todoData.stats])
  const statSum = useCreation(
    () => todoStatStyleConfigs.reduce((sum, item) => sum + (todoData.stats[item.key] || 0), 0),
    [todoData.stats],
  )
  const barDenominator = useCreation(() => Math.max(total, statSum, 1), [total, statSum])

  return (
    <YakitPopover
      placement="bottomLeft"
      content={
        <div className={styles['popover-content']}>
          {todoStatStyleConfigs.map((item) => (
            <div key={item.key} className={styles['popover-content-item']}>
              <span className={styles['popover-content-item-bar']} style={{ backgroundColor: item.color }} />
              <div className={styles['popover-content-item-text']}>
                <span className={styles['popover-content-item-label']}>{t(item.labelKey)}</span>
                <span className={styles['popover-content-item-value']}>{todoData.stats[item.key] ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      }
    >
      <div className={styles['card-heard-extra']}>
        <span className={styles['tip']}>{t('AIToDoListDetail.progress')}</span>
        <div className={styles['progress-stats']}>
          {visibleStats.map((item, index) => (
            <React.Fragment key={item.key}>
              <span className={styles['progress-stat-value']} style={{ color: item.color }}>
                {todoData.stats[item.key]}
              </span>
              {index < visibleStats.length - 1 && <span className={styles['progress-stat-divider']}>|</span>}
            </React.Fragment>
          ))}
        </div>
        <div className={styles['progress-segments-bar']}>
          {visibleStats.map((item) => (
            <span
              key={item.key}
              className={styles['progress-segment']}
              style={{
                width: `${(todoData.stats[item.key] / barDenominator) * 100}%`,
                backgroundColor: item.backgroundColor,
              }}
            />
          ))}
        </div>
      </div>
    </YakitPopover>
  )
})
