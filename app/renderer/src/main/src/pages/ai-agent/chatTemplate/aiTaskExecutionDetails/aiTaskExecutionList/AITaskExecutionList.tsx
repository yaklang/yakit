import useClickFocus from '@/pages/ai-re-act/hooks/useClickFocus'
import classNames from 'classnames'
import React, { memo, useState } from 'react'
import type { AITaskExecutionListProps, AITaskActionItemProps } from './type'
import styles from './AITaskExecutionList.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'

function AITaskExecutionListInner<T>(props: AITaskExecutionListProps<T>) {
  const { list, header, renderItem, classNameList } = props

  const { ref: containerRef, isFocus } = useClickFocus<HTMLDivElement>()
  const [scroll, setScroll] = useState<boolean>(false)

  return (
    <div className={styles['plugin-group']}>
      {header && <div className={styles['plugin-group-header']}>{header}</div>}
      <div
        className={classNames(
          styles['plugin-list'],
          {
            [styles['list-focus']]: isFocus,
          },
          classNameList,
        )}
        style={{ overflowY: scroll ? 'auto' : 'hidden' }}
        onMouseEnter={() => setScroll(true)}
        onMouseLeave={() => setScroll(false)}
        ref={containerRef}
      >
        {list.map((dynamicItem, index) => renderItem(dynamicItem, index))}
      </div>
    </div>
  )
}

export const AITaskExecutionList = memo(AITaskExecutionListInner) as <T>(
  props: AITaskExecutionListProps<T>,
) => JSX.Element

export const AITaskActionItem: React.FC<AITaskActionItemProps> = React.memo((props) => {
  const { title, category, description, titleExtra } = props
  return (
    <div className={classNames(styles['plugin-item'])}>
      <div className={styles['plugin-item-heard']}>
        <div className={styles['plugin-item-title']}>
          <div className={styles['text']} title={title}>
            {title}
          </div>
          {category === 'skill' && (
            <YakitTag color="info" size="small">
              skill
            </YakitTag>
          )}
        </div>
        {titleExtra && <div className={styles['plugin-item-actions']}>{titleExtra}</div>}
      </div>
      {description && (
        <div className={styles['plugin-item-desc']} title={description}>
          {description}
        </div>
      )}
    </div>
  )
})
