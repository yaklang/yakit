import React from 'react'
import { useCreation } from 'ahooks'
import { TODO_STATUS_FILTER_KEYS } from '../type'
import { AITaskStatisticsStatusSortableItem } from './AITaskStatisticsStatusSortableItem'
import { AITaskStatisticsStatusStaticItem } from './AITaskStatisticsStatusStaticItem'
import type { AITaskStatisticsStatusProps } from './type'
import styles from './AITaskStatisticsStatus.module.scss'

export const AITaskStatisticsStatus: React.FC<AITaskStatisticsStatusProps> = React.memo((props) => {
  const { list, hiddenKeys = [], onToggle, onReorder } = props
  const hiddenSet = useCreation(() => new Set(hiddenKeys), [hiddenKeys])
  const allHidden = useCreation(() => TODO_STATUS_FILTER_KEYS.every((key) => hiddenSet.has(key)), [hiddenSet])
  return (
    <div className={styles['stats-overview']}>
      {list.map((item) => {
        const filterable = !!onToggle
        // 已创建：全隐藏时灰显；单项：自身在 hiddenKeys 中时灰显
        const hidden = item.key === 'created' ? allHidden : hiddenSet.has(item.key)
        const sortable = !!onReorder && item.key !== 'created'
        if (!sortable) {
          return (
            <AITaskStatisticsStatusStaticItem
              key={item.key}
              item={item}
              hidden={hidden}
              filterable={filterable}
              onToggle={onToggle}
            />
          )
        }
        return (
          <AITaskStatisticsStatusSortableItem
            key={item.key}
            item={item}
            hidden={hidden}
            filterable={filterable}
            onToggle={onToggle}
            onReorder={onReorder}
          />
        )
      })}
    </div>
  )
})
