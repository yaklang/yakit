import { ChevronsUpDownOutlined, ChevronsDownUpOutlined, ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { OutlineThoughtIcon } from '@yakit-libs/yakit-ui-icons/oldicon/OutlineThoughtIcon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { memo } from 'react'
import { useTypedStream } from '../../aiChatListItem/StreamingChatContent/hooks/useTypedStream'
import type { AIGroupStreamCardHeardProps } from '../type'
import styles from './AIGroupStreamCardHeard.module.scss'
import { useCreation } from 'ahooks'
import { getAIStreamIcon } from '../../aiStreamChatContent/icons'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'
import ThoughtDuration from '../../thoughtDuration/ThoughtDuration'

/** 末子项未入 store 时不算思考中，与旧独立 header 一致 */
export const isThoughtHeaderStreaming = (lastItem: AIGroupStreamCardHeardProps['lastItem']) =>
  lastItem != null && lastItem.data.status !== 'end'

const AIGroupStreamCardThoughtHeard: React.FC<
  Pick<AIGroupStreamCardHeardProps, 'expand' | 'setExpand' | 'nodeLabel' | 'persistKey' | 'lastItem'>
> = memo((props) => {
  const { expand, setExpand, nodeLabel, persistKey, lastItem } = props
  const streaming = isThoughtHeaderStreaming(lastItem)
  return (
    <div className={styles['thought-header']} onClick={() => setExpand((open) => !open)}>
      <OutlineThoughtIcon className={styles['thought-icon']} color="currentColor" />
      <span className={classNames({ [styles['thought-title-blink']]: streaming })}>
        {nodeLabel}
        <ThoughtDuration persistKey={persistKey || lastItem?.id || ''} status={streaming ? 'start' : 'end'} />
      </span>
      <ChevronDownOutlined
        className={classNames(styles['thought-chevron'], {
          [styles['thought-chevron-collapsed']]: !expand,
        })}
        color="currentColor"
      />
    </div>
  )
})

const AIGroupStreamCardNormalHeard: React.FC<AIGroupStreamCardHeardProps> = memo((props) => {
  const { expand, setExpand, lastItem, nodeId, nodeLabel, shouldShowMask, childrenTokensLength } = props
  const StreamIcon = getAIStreamIcon(nodeId)
  const { content } = useTypedStream({
    getContent: () => lastItem?.data.content ?? '',
    getStatus: () => lastItem?.data.status ?? 'end',
  })
  const collapseTooltip = useCreation(() => {
    return !expand && childrenTokensLength > 1 ? `折叠${childrenTokensLength}条信息` : ''
  }, [expand, childrenTokensLength])
  return (
    <Tooltip title={collapseTooltip} mouseEnterDelay={0.3} destroyOnHidden>
      <div
        className={styles['title']}
        onClick={() => {
          setExpand(!expand)
        }}
      >
        <div className={styles['title-node-label']}>
          <StreamIcon className={styles['stream-icon']} color="currentColor" />
          {nodeLabel}
        </div>
        <div className={styles['stream-text']}>
          {shouldShowMask && <div className={styles['ai-mask']} />}
          <p
            className={classNames({
              [styles['stream-text-hidden']]: expand,
            })}
          >
            <span>{content}</span>
          </p>
        </div>
        <Tooltip title="展开">
          <YakitButton
            size="small"
            type="text"
            icon={<ChevronsUpDownOutlined color="currentColor" />}
            className={classNames(styles['expand-btn'], {
              [styles['hidden-expand-btn']]: expand,
            })}
          />
        </Tooltip>
        <Tooltip title="收起">
          <YakitButton
            size="small"
            type="text"
            icon={<ChevronsDownUpOutlined color="currentColor" />}
            className={classNames(styles['expand-btn'], {
              [styles['hidden-expand-btn']]: !expand,
            })}
          />
        </Tooltip>
      </div>
    </Tooltip>
  )
})

const AIGroupStreamCardHeard: React.FC<AIGroupStreamCardHeardProps> = memo((props) => {
  if (props.nodeId === AI_STREAM_THOUGHT_NODE_ID) {
    return (
      <AIGroupStreamCardThoughtHeard
        expand={props.expand}
        setExpand={props.setExpand}
        nodeLabel={props.nodeLabel}
        persistKey={props.persistKey}
        lastItem={props.lastItem}
      />
    )
  }
  return <AIGroupStreamCardNormalHeard {...props} />
})

export default AIGroupStreamCardHeard
