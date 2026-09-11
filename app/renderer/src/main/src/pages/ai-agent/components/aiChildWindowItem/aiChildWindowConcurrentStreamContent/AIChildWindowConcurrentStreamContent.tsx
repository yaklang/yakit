import classNames from 'classnames'
import styles from './AIChildWindowConcurrentStreamContent.module.scss'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import useClickFocus from '@/pages/ai-re-act/hooks/useClickFocus'
import React, { type FC, memo } from 'react'
import AIChildWindowGroupItem from '../aiChildWindowGroupItem/AIChildWindowGroupItem'
import AIChildWindowNodeItemWrapper from '../aiChildWindowNodeItemWrapper/AIChildWindowNodeItemWrapper'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'

const AIChildWindowConcurrentStreamContent: FC = memo(() => {
  const { childrenTokens, rawData, tokenVersions } = useAIConcurrentStreamStore()
  return (
    <div className={styles['concurrent-stream-content-wrapper']}>
      <div
        className={styles['content']}
        hidden={!childrenTokens?.length}
        style={{ flex: 1, maxHeight: 'inherit', height: 0 }}
      >
        {/* 焦点态隔离在轻量壳层：mousedown 触发的 isFocus 重渲染只波及壳层，
            children（整棵卡片树）作为稳定 children 传入，不再被焦点切换重渲染 */}
        <ScrollShell>
          {childrenTokens?.map((token) => {
            const item = rawData?.get(token)
            if (!item) return <React.Fragment key={token} />
            return (
              <div className={styles['concurrent-stream-content-item']} key={token}>
                {item.type === AIChatQSDataTypeEnum.STREAM_GROUP ? (
                  <AIChildWindowGroupItem token={token} />
                ) : (
                  <AIChildWindowNodeItemWrapper
                    itemData={item}
                    // per-token 版本：内容未变化的 token 版本不变，卡片 memo 命中不重渲染
                    renderNum={tokenVersions?.get(token) || 0}
                  />
                )}
              </div>
            )
          })}
        </ScrollShell>
      </div>
    </div>
  )
})

/** 滚动容器壳层：只持有焦点态与滚动样式，children 由父级渲染，焦点切换不会重渲染卡片树 */
const ScrollShell: FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const { ref: scrollRef, isFocus } = useClickFocus<HTMLDivElement>()
  return (
    <div
      ref={scrollRef}
      className={classNames(styles['concurrent-stream-content'], {
        [styles.focused]: isFocus,
      })}
      style={{ maxHeight: 'inherit', height: '100%', overflowY: 'auto' }}
    >
      {children}
    </div>
  )
})

export default AIChildWindowConcurrentStreamContent
