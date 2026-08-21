import React, { useMemo, type ReactNode } from 'react'
import type { AIStreamChatContentProps } from './type'
import { Tooltip } from 'antd'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import styles from './AIStreamChatContent.module.scss'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import classNames from 'classnames'
import { OutlineChevrondownIcon } from '@/assets/icon/outline'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'
import { useUiExpand } from '@/pages/ai-re-act/hooks/useUiExpand'

const STREAM_MASK_THRESHOLD = 100

const ThoughtStreamContent: React.FC<{
  token: string
  content: string
  nodeLabel: string
  referenceNode?: ReactNode
  streaming?: boolean
}> = React.memo(({ token, content, nodeLabel, referenceNode, streaming }) => {
  const [expand, setExpand] = useUiExpand(token, false)
  return (
    <div className={styles['ai-stream-chat-content-thought']}>
      <div className={styles['thought-header']} onClick={() => setExpand((open) => !open)}>
        <span className={classNames({ [styles['thought-title-blink']]: streaming })}>{nodeLabel}</span>
        <OutlineChevrondownIcon
          className={classNames(styles['thought-chevron'], {
            [styles['thought-chevron-collapsed']]: !expand,
          })}
        />
      </div>
      {expand && (
        <div className={styles['thought-body']}>
          {content}
          {referenceNode}
        </div>
      )}
    </div>
  )
})

export const AIStreamChatContent: React.FC<AIStreamChatContentProps> = React.memo((props) => {
  const { content, nodeId, nodeIdVerbose, referenceNode, streaming, token } = props
  const { nodeLabel } = useAINodeLabel(nodeIdVerbose)
  const shouldShowMask = useMemo(() => content.length > STREAM_MASK_THRESHOLD, [content])
  if (nodeId === AI_STREAM_THOUGHT_NODE_ID) {
    return (
      <ThoughtStreamContent
        token={token || ''}
        content={content}
        nodeLabel={nodeLabel}
        referenceNode={referenceNode}
        streaming={streaming}
      />
    )
  }
  return (
    <div className={classNames(styles['ai-stream-chat-content-wrapper'], 'ai-stream-chat-content-wrapper')}>
      <div className={styles['ai-stream-chat-content']}>
        <div className={styles['title']}>{nodeLabel}</div>
        <div className={styles['ai-stream-content']}>
          <Tooltip
            placement="topRight"
            title={
              <div className={styles['tooltip-stream-content']}>
                {content}
                <CopyComponents copyText={content} />
              </div>
            }
            trigger={'click'}
          >
            {shouldShowMask && <div className={styles['ai-mask']} />}
            {content}
          </Tooltip>
          {referenceNode}
        </div>
      </div>
    </div>
  )
})
