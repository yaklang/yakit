import type { FC } from 'react'
import classNames from 'classnames'
import type { AITaskStatisticsStatusItem } from './type'
import styles from './AITaskStatisticsStatus.module.scss'

export const getStatItemClassName = (item: AITaskStatisticsStatusItem, extra: Record<string, boolean | undefined>) =>
  classNames(styles['stat-item'], {
    [styles['stat-main']]: item.color === 'main',
    [styles['stat-green']]: item.color === 'green',
    [styles['stat-red']]: item.color === 'red',
    ...extra,
  })

export const StatItemContent: FC<{ item: AITaskStatisticsStatusItem }> = ({ item }) => (
  <>
    <span className={styles['stat-count']}>{item.footerLeft}</span>
    <span className={styles['stat-label']}>{item.title}</span>
  </>
)
