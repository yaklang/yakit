import React, { useMemo, useRef } from 'react'
import classNames from 'classnames'
import styles from './AIToDoList.module.scss'
import type { AIToDoListItemProps, AIToDoListProps } from './type'
import { OutlineChevrondownIcon, OutlineChevronrightIcon } from '@/assets/icon/outline'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import YakitSolidLoading from '@/components/yakitUI/YakitSolidLoading/YakitSolidLoading'
import { useCreation, useHover, useMemoizedFn } from 'ahooks'
import { AIToDoListDeletedIcon, AIToDoListPendingIcon, AIToDoListDoneIcon, AIToDoListSkippedIcon } from './icon'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'

const stats = [
  {
    key: 'deleted',
    label: '已删除',
    color: 'var(--Colors-Use-Status-High)',
    backgroundColor: 'var(--Colors-Use-Status-High)',
  },
  {
    key: 'done',
    label: '已完成',
    color: 'var(--Colors-Use-Status-Safe)',
    backgroundColor: 'var(--Colors-Use-Status-Safe)',
  },
  {
    key: 'doing',
    label: '进行中',
    color: 'var(--Colors-Use-Main-Primary)',
    backgroundColor: 'var(--Colors-Use-Main-Primary)',
  },
  {
    key: 'skipped',
    label: '已跳过',
    color: 'var(--Colors-Use-Neutral-Text-4-Help-text)',
    backgroundColor: 'var(--Colors-Use-Neutral-Disable)',
  },
  {
    key: 'pending',
    label: '待处理',
    color: 'var(--Colors-Use-Neutral-Text-1-Title)',
    backgroundColor: 'var(--Colors-Use-Basic-Background)',
  },
]

export const AIToDoList: React.FC<AIToDoListProps> = React.memo((props) => {
  const { className, todoData, bannedExpand } = props

  const divRef = useRef(null)
  const isHover = useHover(divRef)
  const total = useCreation(() => todoData.items.length, [todoData.items.length])
  const doingItem = useCreation(() => {
    return todoData.items.find((item) => item.status === AIToDoListStatusEnum.Doing)
  }, [todoData.items])

  // 过滤数据为0的
  const visibleStats = useMemo(() => stats.filter((item) => todoData.stats[item.key]), [todoData.stats])

  const statSum = useCreation(
    () => stats.reduce((sum, item) => sum + (todoData.stats[item.key] || 0), 0),
    [todoData.stats],
  )
  const barDenominator = useCreation(() => Math.max(total, statSum, 1), [total, statSum])

  // const handleHiddenChange = useMemoizedFn((e) => {
  //   e.stopPropagation()
  //   if (bannedExpand) return
  //   setHidden((v) => !v)
  // })

  return (
    <div className={classNames(styles['ai-to-do-list-wrapper'], className)}>
      <div className={styles['card']} ref={divRef}>
        {!!total ? (
          <>
            <div className={styles['card-heard']}>
              <div className={styles['card-heard-title']}>
                {!bannedExpand && (
                  <>
                    {!isHover ? (
                      <OutlineChevronrightIcon className={styles['chevron-icon']} />
                    ) : (
                      <OutlineChevrondownIcon className={styles['chevron-icon']} />
                    )}
                  </>
                )}

                <span className={styles['title']}>待办清单</span>
                {!!doingItem && (
                  <YakitTag fullRadius color="main" size="small" className={styles['pending-tag']}>
                    <YakitSolidLoading size={12} className={styles['loading']} />
                    <span className={styles['content']}>{doingItem.content}</span>
                  </YakitTag>
                )}
              </div>
              <YakitPopover
                placement="bottomLeft"
                content={
                  <div className={styles['popover-content']}>
                    {stats.map((item) => (
                      <div key={item.key} className={styles['popover-content-item']}>
                        <span className={styles['popover-content-item-bar']} style={{ backgroundColor: item.color }} />
                        <div className={styles['popover-content-item-text']}>
                          <span className={styles['popover-content-item-label']}>{item.label}</span>
                          <span className={styles['popover-content-item-value']}>{todoData.stats[item.key] ?? 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              >
                <div className={styles['card-heard-extra']}>
                  <span className={styles['tip']}>进度</span>
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
            </div>
            <div
              className={classNames(styles['card-list'], {
                [styles['card-list-hidden']]: !isHover,
              })}
            >
              <div
                className={classNames(styles['card-list-inner'], {
                  [styles['card-list-inner-hidden']]: !isHover,
                })}
              >
                {todoData.items.map((item) => (
                  <AIToDoListItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className={styles['no-data']}>暂无数据</div>
        )}
      </div>
    </div>
  )
})

export const AIToDoListItem: React.FC<AIToDoListItemProps> = React.memo((props) => {
  const { item } = props
  const renderContent = useMemoizedFn(() => {
    switch (item.status) {
      case AIToDoListStatusEnum.Pending:
        return renderPending()
      case AIToDoListStatusEnum.Doing:
        return renderDoing()
      case AIToDoListStatusEnum.Done:
        return renderDone()
      case AIToDoListStatusEnum.Deleted:
        return renderDeleted()
      case AIToDoListStatusEnum.Skipped:
        return renderSkipped()
      default:
        return null
    }
  })
  const renderPending = useMemoizedFn(() => {
    return (
      <>
        <AIToDoListPendingIcon />
        <div className={classNames(styles['item-text'], styles['help-text'])} title={item.content}>
          {item.content}
        </div>
      </>
    )
  })
  const renderDoing = useMemoizedFn(() => {
    return (
      <>
        <YakitSolidLoading size={16} className={styles['loading']} />
        <div className={classNames(styles['item-text'], styles['main'])} title={item.content}>
          {item.content}
        </div>
      </>
    )
  })
  const renderDone = useMemoizedFn(() => {
    return (
      <>
        <AIToDoListDoneIcon />
        <div className={classNames(styles['item-text'], styles['help-text'])} title={item.content}>
          {item.content}
        </div>
      </>
    )
  })
  const renderDeleted = useMemoizedFn(() => {
    return (
      <>
        <AIToDoListDeletedIcon />
        <div className={classNames(styles['item-text'], styles['help-text'])} title={item.content}>
          {item.content}
        </div>
      </>
    )
  })
  const renderSkipped = useMemoizedFn(() => {
    return (
      <>
        <AIToDoListSkippedIcon />
        <div className={classNames(styles['item-text'], styles['skip-text'])} title={item.content}>
          {item.content}
        </div>
      </>
    )
  })
  return (
    <div
      className={classNames(styles['card-list-item'], {
        [styles['card-list-item-pending']]: true,
      })}
    >
      {renderContent()}
    </div>
  )
})
