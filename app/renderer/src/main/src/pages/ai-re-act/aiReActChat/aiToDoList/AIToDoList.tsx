import React, { ReactNode, useState } from 'react'
import classNames from 'classnames'
import styles from './AIToDoList.module.scss'
import type { AIToDoListItemProps, AIToDoListProps } from './type'
import { OutlineChevronleftIcon, OutlineChevronrightIcon } from '@/assets/icon/outline'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import YakitSolidLoading from '@/components/yakitUI/YakitSolidLoading/YakitSolidLoading'
import { Progress } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { AIToDoListDeletedIcon, AIToDoListDoingIcon, AIToDoListDoneIcon, AIToDoListSkippedIcon } from './icon'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'

export const AIToDoList: React.FC<AIToDoListProps> = React.memo((props) => {
  const { className } = props
  const [hidden, setHidden] = useState(false)

  return (
    <div className={classNames(styles['ai-to-do-list-wrapper'], className)}>
      <div className={styles['card']}>
        <div className={styles['card-heard']} onClick={() => setHidden((v) => !v)}>
          <div className={styles['card-heard-title']}>
            {hidden ? (
              <OutlineChevronrightIcon className={styles['chevron-icon']} />
            ) : (
              <OutlineChevronleftIcon className={styles['chevron-icon']} />
            )}
            <span className={styles['title']}>待办清单</span>
            <YakitTag fullRadius color="main" size="small" className={styles['pending-tag']}>
              <YakitSolidLoading size={12} className={styles['loading']} />
              <span className={styles['content']}>这里是正在执行的任务这里是正在执行的任务</span>
            </YakitTag>
          </div>
          <div className={styles['card-heard-extra']}>
            <span className={styles['tip']}>进度</span>
            <span className={styles['progress ']}>4/6</span>
            <Progress
              strokeColor="var(--Colors-Use-Neutral-Disable)"
              trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
              percent={67}
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
            {Array.from({ length: 5 }).map((_, index) => (
              <AIToDoListItem
                key={index}
                item={{
                  content: '这里是正在执行的任务这里是正在执行的任务',
                  created_at: Date.now(),
                  id: String(index),
                  status: AIToDoListStatusEnum.Pending,
                  updated_at: Date.now(),
                }}
              />
            ))}
          </div>
        </div>
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
        <YakitSolidLoading size={16} className={styles['loading']} />
        <div className={classNames(styles['item-text'], styles['main'])}>这里是正在执行的任务这里是正在执行的任务</div>
      </>
    )
  })
  const renderDoing = useMemoizedFn(() => {
    return (
      <>
        <AIToDoListDoingIcon />
        <div className={classNames(styles['item-text'], styles['help-text'])}>
          这里是正在执行的任务这里是正在执行的任务
        </div>
      </>
    )
  })
  const renderDone = useMemoizedFn(() => {
    return (
      <>
        <AIToDoListDoneIcon />
        <div className={classNames(styles['item-text'], styles['help-text'])}>
          这里是正在执行的任务这里是正在执行的任务
        </div>
      </>
    )
  })
  const renderDeleted = useMemoizedFn(() => {
    return (
      <>
        <AIToDoListDeletedIcon />
        <div className={classNames(styles['item-text'], styles['help-text'])}>
          这里是正在执行的任务这里是正在执行的任务
        </div>
      </>
    )
  })
  const renderSkipped = useMemoizedFn(() => {
    return (
      <>
        <AIToDoListSkippedIcon />
        <div className={classNames(styles['item-text'], styles['skip-text'])}>
          这里是正在执行的任务这里是正在执行的任务
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
