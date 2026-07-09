import { OutlineChevronsUpDownIcon, OutlineChevronsDownUpIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { memo } from 'react'
import { useTypedStream } from '../../aiChatListItem/StreamingChatContent/hooks/useTypedStream'
import { AIGroupStreamCardHeardProps } from '../type'
import styles from './AIGroupStreamCardHeard.module.scss'

const AIGroupStreamCardHeard: React.FC<AIGroupStreamCardHeardProps> = memo((props) => {
  const { expand, setExpand, lastToken, nodeLabel, shouldShowMask } = props

  const { stream } = useTypedStream({ token: lastToken ?? '' })

  return (
    <div
      className={styles.title}
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
          <span>{stream?.data?.content}</span>
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
  )
})

export default AIGroupStreamCardHeard
