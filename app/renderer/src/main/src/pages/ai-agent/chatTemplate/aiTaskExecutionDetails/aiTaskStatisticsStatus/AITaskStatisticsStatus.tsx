import React, { useId } from 'react'
import { useCreation } from 'ahooks'
import { TODO_STATUS_FILTER_KEYS } from '../taskStatusUtils'
import { AITaskStatisticsStatusSortableItem } from './AITaskStatisticsStatusSortableItem'
import { AITaskStatisticsStatusStaticItem } from './AITaskStatisticsStatusStaticItem'
import type { AITaskStatisticsStatusProps } from './type'
import styles from './AITaskStatisticsStatus.module.scss'

export const AITaskStatisticsStatus: React.FC<AITaskStatisticsStatusProps> = React.memo((props) => {
  const { list, hiddenKeys = [], onToggle, onReorder } = props
  const scope = useId()
  const sortableItems = list.filter((item) => item.key !== 'created')
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
        const index = sortableItems.findIndex((stat) => stat.key === item.key)
        return (
          <AITaskStatisticsStatusSortableItem
            key={item.key}
            item={item}
            scope={scope}
            previousKey={sortableItems[index - 1]?.key}
            nextKey={sortableItems[index + 1]?.key}
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
