import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AIStreamChatContentProps } from './type'
import { Tooltip } from 'antd'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import styles from './AIStreamChatContent.module.scss'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import classNames from 'classnames'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { OutlineThoughtIcon } from '@yakit-libs/yakit-ui-icons/oldicon/OutlineThoughtIcon'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'
import { useUiExpand } from '@/pages/ai-re-act/hooks/useUiExpand'
import { useClickAway } from 'ahooks'
import ThoughtDuration from '../thoughtDuration/ThoughtDuration'

const STREAM_MASK_THRESHOLD = 100

const ThoughtStreamContent: React.FC<{
  token: string
  content: string
  nodeLabel: string
  referenceNode?: ReactNode
  streaming?: boolean
}> = React.memo(({ token, content, nodeLabel, referenceNode, streaming }) => {
  const [expand, setExpand] = useUiExpand(token, false)
  const [isScroll, setIsScroll] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useClickAway(() => {
    if (isScroll) setIsScroll(false)
  }, bodyRef)

  useEffect(() => {
    if (!expand) setIsScroll(false)
  }, [expand])

  return (
    <div className={styles['ai-stream-chat-content-thought']}>
      <div className={styles['thought-header']} onClick={() => setExpand((open) => !open)}>
        <OutlineThoughtIcon className={styles['thought-icon']} />
        <span className={classNames({ [styles['thought-title-blink']]: streaming })}>
          {nodeLabel}
          <ThoughtDuration persistKey={token} status={streaming ? 'start' : 'end'} />
        </span>
        <ChevronDownOutlined
          className={classNames(styles['thought-chevron'], {
            [styles['thought-chevron-collapsed']]: !expand,
          })}
          color="currentColor"
        />
      </div>
      {expand && (
        <div
          ref={bodyRef}
          className={classNames(styles['thought-body'], {
            [styles['thought-body-scroll']]: isScroll,
          })}
          onClick={() => setIsScroll(true)}
        >
          <div
            className={classNames(styles['thought-body-inner'], {
              [styles['thought-body-inner-scroll']]: isScroll,
            })}
          >
            {content}
            {referenceNode}
          </div>
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
