import type React from 'react'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { useCreation } from 'ahooks'
import classNames from 'classnames'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { Log2Outlined } from '@yakit-libs/yakit-ui-icons/outline'
import styles from './AICustomHttpFlow.module.scss'

export const AICustomHttpFlow: React.FC = () => {
  const { node, selected, view, contentRef } = useNodeViewContext()

  const readonly = useCreation(() => {
    return !view.editable
  }, [view.editable])

  const displayText = useCreation(() => {
    return node?.attrs?.displayText || ''
  }, [node?.attrs?.displayText])

  const flowIds: string[] = node?.attrs?.flowIds || []

  const tag = (
    <YakitTag
      icon={<div className={styles['http-flow-icon-wrapper']}>{<Log2Outlined color="currentColor" />}</div>}
      className={classNames(styles['http-flow-custom'], {
        [styles['http-flow-custom-selected']]: selected && !readonly,
        [styles['http-flow-custom-readonly']]: readonly,
      })}
      color="white"
      contentEditable={false}
    >
      <div
        className={styles['http-flow-text']}
        contentEditable={false}
        ref={contentRef}
        title={flowIds.length ? undefined : displayText}
      ></div>
    </YakitTag>
  )

  return flowIds.length ? (
    <YakitPopover
      trigger="hover"
      placement="topLeft"
      content={
        <div className={styles['http-flow-ids']} role="list">
          {flowIds.map((id) => (
            <YakitTag key={id} role="listitem" title={`#${id}`}>
              #{id}
            </YakitTag>
          ))}
        </div>
      }
    >
      {tag}
    </YakitPopover>
  ) : (
    tag
  )
}
