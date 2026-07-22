import classNames from 'classnames'
import styles from './AIChildWindowConcurrentStreamContent.module.scss'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import useClickFocus from '@/pages/ai-re-act/hooks/useClickFocus'
import React, { type FC, memo } from 'react'
import AIChildWindowGroupItem from '../aiChildWindowGroupItem/AIChildWindowGroupItem'
import AIChildWindowNodeItemWrapper from '../aiChildWindowNodeItemWrapper/AIChildWindowNodeItemWrapper'

const AIChildWindowConcurrentStreamContent: FC = memo(() => {
  const { childrenTokens, rawData } = useAIConcurrentStreamStore()
  const { ref: scrollRef, isFocus } = useClickFocus<HTMLDivElement>()

  return (
    <div className={styles['concurrent-stream-content-wrapper']}>
      <div
        className={styles['content']}
        hidden={!childrenTokens?.length}
        style={{ flex: 1, maxHeight: 'inherit', height: 0 }}
      >
        <div
          ref={scrollRef}
          className={classNames(styles['concurrent-stream-content'], {
            [styles.focused]: isFocus,
          })}
          style={{ maxHeight: 'inherit', height: '100%', overflowY: 'auto' }}
        >
          {childrenTokens?.map((token) => {
            const item = rawData?.get(token)
            if (!item) return <React.Fragment key={token} />
            if (!!item.parentGroupToken) {
              if (!rawData) return <React.Fragment key={token} />
              return <AIChildWindowGroupItem key={token} token={token} />
            } else {
              return <AIChildWindowNodeItemWrapper key={token} itemData={item} />
            }
          })}
        </div>
      </div>
    </div>
  )
})

export default AIChildWindowConcurrentStreamContent
