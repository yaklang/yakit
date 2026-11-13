import type React from 'react'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { useCreation } from 'ahooks'
import classNames from 'classnames'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { BugOutlined, Log2Outlined } from '@yakit-libs/yakit-ui-icons/outline'
import type { AIResourceReferenceParams } from './aiResourceReferencePlugin'
import styles from './AICustomResourceReference.module.scss'

const renderResourceIcon = (type: AIResourceReferenceParams['type']) => {
  switch (type) {
    case 'risk':
      return <BugOutlined color="currentColor" />
    default:
      return <Log2Outlined color="currentColor" />
  }
}

export const AICustomResourceReference: React.FC = () => {
  const { node, selected, view, contentRef } = useNodeViewContext()

  const readonly = useCreation(() => {
    return !view.editable
  }, [view.editable])

  const displayText = useCreation(() => {
    return node?.attrs?.displayText || ''
  }, [node?.attrs?.displayText])

  const ids: string[] = node.attrs.ids || []

  const tag = (
    <YakitTag
      icon={<div className={styles['resource-reference-icon-wrapper']}>{renderResourceIcon(node.attrs.type)}</div>}
      className={classNames(styles['resource-reference-custom'], {
        [styles['resource-reference-custom-selected']]: selected && !readonly,
        [styles['resource-reference-custom-readonly']]: readonly,
      })}
      color="white"
      contentEditable={false}
    >
      <div
        className={styles['resource-reference-text']}
        contentEditable={false}
        ref={contentRef}
        title={ids.length ? undefined : displayText}
      ></div>
    </YakitTag>
  )

  return ids.length ? (
    <YakitPopover
      trigger="hover"
      placement="topLeft"
      content={
        <div className={styles['resource-reference-ids']} role="list">
          {ids.map((id) => (
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
