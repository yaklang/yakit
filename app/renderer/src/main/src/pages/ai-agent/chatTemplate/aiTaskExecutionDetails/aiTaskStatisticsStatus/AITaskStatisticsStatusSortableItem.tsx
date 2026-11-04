import React, { useEffect, useRef, useState } from 'react'
import { useDrag, useDrop } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getStatItemClassName, StatItemContent } from './statItemShared'
import type { AITaskStatisticsStatusSortableItemProps, StatDragPayload } from './type'
import styles from './AITaskStatisticsStatus.module.scss'

/** 可拖拽的状态统计项：待处理 / 进行中等，拖放到其他项上重排 */
export const AITaskStatisticsStatusSortableItem: React.FC<AITaskStatisticsStatusSortableItemProps> = React.memo(
  ({ item, hidden, filterable, onToggle, onReorder, scope, previousKey, nextKey }) => {
    const { t } = useI18nNamespaces(['aiAgent'])
    const releaseTimer = useRef<number>()
    useEffect(() => () => window.clearTimeout(releaseTimer.current), [])
    const itemRef = useRef<HTMLDivElement>(null)
    const skipClickRef = useRef(false)
    const [dragging, setDragging] = useState(false)
    const [dropOver, setDropOver] = useState(false)

    useDrag({ key: item.key, scope }, itemRef, {
      onDragStart: (e) => {
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
        window.clearTimeout(releaseTimer.current)
        skipClickRef.current = true
        setDragging(true)
      },
      onDragEnd: () => {
        setDragging(false)
        setDropOver(false)
        releaseTimer.current = window.setTimeout(() => {
          skipClickRef.current = false
        }, 0)
      },
    })

    useDrop(itemRef, {
      onDragEnter: () => setDropOver(true),
      onDragLeave: () => setDropOver(false),
      onDom: (content: StatDragPayload) => {
        setDropOver(false)
        if (!onReorder || content?.scope !== scope || !content?.key || content.key === item.key) return
        onReorder(content.key, item.key)
      },
    })

    const onClick = () => {
      if (!filterable || skipClickRef.current) return
      onToggle?.(item.key)
    }

    return (
      <div
        ref={itemRef}
        className={getStatItemClassName(item, {
          [styles['stat-item-clickable']]: filterable,
          [styles['stat-item-sortable']]: true,
          [styles['stat-item-hidden']]: hidden,
          [styles['stat-item-dragging']]: dragging,
          [styles['stat-item-drop-over']]: dropOver && !dragging,
        })}
        aria-pressed={filterable ? !hidden : undefined}
        aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
        title={t('AITaskStatusControls.sortHint')}
        onClick={filterable ? onClick : undefined}
        role={filterable ? 'button' : undefined}
        tabIndex={filterable ? 0 : undefined}
        onKeyDown={
          filterable
            ? (e) => {
                if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                  e.preventDefault()
                  const target = e.key === 'ArrowLeft' ? previousKey : nextKey
                  if (target) onReorder?.(item.key, target)
                  return
                }
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
