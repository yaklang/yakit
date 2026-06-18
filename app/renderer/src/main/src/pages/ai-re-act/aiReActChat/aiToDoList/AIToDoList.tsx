import React, { useState } from 'react'
import classNames from 'classnames'
import styles from './AIToDoList.module.scss'
import type { AIToDoListItemProps, AIToDoListProps } from './type'
import { OutlineChevrondownIcon, OutlineChevronrightIcon } from '@/assets/icon/outline'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import YakitSolidLoading from '@/components/yakitUI/YakitSolidLoading/YakitSolidLoading'
import { Progress } from 'antd'
import { useCreation, useMemoizedFn } from 'ahooks'
import { AIToDoListDeletedIcon, AIToDoListPendingIcon, AIToDoListDoneIcon, AIToDoListSkippedIcon } from './icon'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'

export const AIToDoList: React.FC<AIToDoListProps> = React.memo((props) => {
  const { className, todoData, taskId, bannedExpand } = props

  const [hidden, setHidden] = useState(!bannedExpand)
  const finishedCount = useCreation(() => {
    return todoData.stats.deleted + todoData.stats.done + todoData.stats.skipped
  }, [todoData.stats])
  const total = useCreation(() => todoData.items.length, [todoData.items.length])
  const doingItem = useCreation(() => {
    return todoData.items.find((item) => item.status === AIToDoListStatusEnum.Doing)
  }, [todoData.items])

  const handleHiddenChange = useMemoizedFn((e) => {
    e.stopPropagation()
    if (bannedExpand) return
    setHidden((v) => !v)
  })

  return (
    <div className={classNames(styles['ai-to-do-list-wrapper'], className)}>
      <div className={styles['card']}>
        {!!total ? (
          <>
            <div className={styles['card-heard']} onClick={handleHiddenChange}>
              <div className={styles['card-heard-title']}>
                {!bannedExpand && (
                  <>
                    {hidden ? (
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
              <div className={styles['card-heard-extra']}>
                <span className={styles['tip']}>进度</span>
                <span className={styles['progress ']}>
                  {finishedCount}/{total || 1}
                </span>
                <Progress
                  strokeColor="var(--Colors-Use-Neutral-Disable)"
                  trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
                  percent={Math.ceil(finishedCount / total) * 100}
                  size="small"
                  showInfo={false}
                  className={styles['progress-bar']}
                />
              </div>
            </div>
            <div
              className={classNames(styles['card-list'], {
                [styles['card-list-hidden']]: hidden,
              })}
            >
              <div
                className={classNames(styles['card-list-inner'], {
                  [styles['card-list-inner-hidden']]: hidden,
                })}
              >
                {todoData.items.map((item, index) => (
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
