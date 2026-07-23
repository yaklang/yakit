import { OutlineChevronsUpDownIcon, OutlineChevronsDownUpIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { memo } from 'react'
import { useTypedStream } from '../../aiChatListItem/StreamingChatContent/hooks/useTypedStream'
import { AIGroupStreamCardHeardProps } from '../type'
import styles from './AIGroupStreamCardHeard.module.scss'
import useCreation from 'ahooks/lib/useCreation'

const AIGroupStreamCardHeard: React.FC<AIGroupStreamCardHeardProps> = memo((props) => {
  const { expand, setExpand, lastItem, nodeLabel, shouldShowMask, childrenTokensLength } = props

  const { content } = useTypedStream({
    getContent: () => lastItem?.data.content ?? '',
    getStatus: () => lastItem?.data.status ?? 'end',
  })
  const collapseTooltip = useCreation(() => {
    return !expand && childrenTokensLength > 1 ? `折叠${childrenTokensLength}条信息` : ''
  }, [expand, childrenTokensLength])
  return (
    <Tooltip title={collapseTooltip} mouseEnterDelay={0.3} destroyTooltipOnHide>
      <div
        className={styles['title']}
        onClick={() => {
          setExpand(!expand)
        }}
      >
        <div className={styles['title-node-label']}>{nodeLabel}</div>
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
            icon={<OutlineChevronsUpDownIcon />}
            className={classNames(styles['expand-btn'], {
              [styles['hidden-expand-btn']]: expand,
            })}
          />
        </Tooltip>
        <Tooltip title="收起">
          <YakitButton
            size="small"
            type="text"
            icon={<OutlineChevronsDownUpIcon />}
            className={classNames(styles['expand-btn'], {
              [styles['hidden-expand-btn']]: !expand,
            })}
          />
        </Tooltip>
      </div>
    </Tooltip>
  )
})

export default AIGroupStreamCardHeard
