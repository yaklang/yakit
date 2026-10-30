import React from 'react'
import { getStatItemClassName, StatItemContent } from './statItemShared'
import type { AITaskStatisticsStatusItemBaseProps } from './type'
import styles from './AITaskStatisticsStatus.module.scss'

/** 不可拖拽的状态统计项（已创建） */
export const AITaskStatisticsStatusStaticItem: React.FC<AITaskStatisticsStatusItemBaseProps> = React.memo(
  ({ item, hidden, filterable, onToggle }) => {
    const onClick = () => {
      if (!filterable) return
      onToggle?.(item.key)
    }
    return (
      <div
        className={getStatItemClassName(item, {
          [styles['stat-item-clickable']]: filterable,
          [styles['stat-item-hidden']]: hidden,
        })}
        onClick={filterable ? onClick : undefined}
        role={filterable ? 'button' : undefined}
        tabIndex={filterable ? 0 : undefined}
        onKeyDown={
          filterable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                }
              }
            : undefined
        }
      >
        <StatItemContent item={item} />
      </div>
    )
  },
)
