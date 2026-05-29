import React, { useState } from 'react'
import classNames from 'classnames'
import styles from './AIToDoList.module.scss'
import type { AIToDoListProps } from './type'
import { OutlineChevronleftIcon, OutlineChevronrightIcon } from '@/assets/icon/outline'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import YakitSolidLoading from '@/components/yakitUI/YakitSolidLoading/YakitSolidLoading'
import { Progress } from 'antd'

export const AIToDoList: React.FC<AIToDoListProps> = React.memo((props) => {
  const {} = props
  const [hidden, setHidden] = useState(false)

  return (
    <div className={classNames(styles['ai-to-do-list-wrapper'])}>
      <div className={styles['card']}>
        <div className={styles['card-heard']} onClick={() => setHidden((v) => !v)}>
          <div className={styles['card-heard-title']}>
            {hidden ? (
              <OutlineChevronrightIcon className={styles['chevron-icon']} />
            ) : (
              <OutlineChevronleftIcon className={styles['chevron-icon']} />
            )}
            <span className={styles['title']}>待办清单</span>
            <YakitTag fullRadius color="main" size="small">
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
              <div key={index} className={styles['card-list-item']}>
                Task {index + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})
