import React from 'react'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { useCreation, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { OutlineLog2Icon } from '@/assets/icon/outline'
import { AIHttpFlowRemovePayload } from './aiHttpFlowPlugin'
import styles from './AICustomHttpFlow.module.scss'

interface AICustomHttpFlowProps {
  onHttpFlowRemove?: (payload: AIHttpFlowRemovePayload) => void
}

export const AICustomHttpFlow: React.FC<AICustomHttpFlowProps> = (props) => {
  const { onHttpFlowRemove } = props
  const { node, selected, view, contentRef, getPos } = useNodeViewContext()

  const readonly = useCreation(() => {
    return !view.editable
  }, [view.editable])

  const locked = useCreation(() => {
    return node?.attrs?.lock ?? false
  }, [node?.attrs?.lock])

  const displayText = useCreation(() => {
    return node?.attrs?.displayText || ''
  }, [node?.attrs?.displayText])

  const onRemove = useMemoizedFn(() => {
    const payload: AIHttpFlowRemovePayload = {
      flowId: node?.attrs?.flowId || '',
      flowIds: node?.attrs?.flowIds || '',
      isSummary: !!node?.attrs?.isSummary,
    }

    const { state, dispatch } = view
    const nodePos = getPos?.()
    if (nodePos !== undefined) {
      dispatch?.(state.tr.delete(nodePos, nodePos + node.nodeSize))
    }

    if (locked) {
      onHttpFlowRemove?.(payload)
    }
  })

  const closable = useCreation(() => {
    return !readonly
  }, [readonly])

  return (
    <YakitTag
      border={false}
      closable={closable}
      icon={<div className={styles['http-flow-icon-wrapper']}>{<OutlineLog2Icon />}</div>}
      onClose={onRemove}
      className={classNames(styles['http-flow-custom'], {
        [styles['http-flow-custom-selected']]: selected && !readonly,
        [styles['http-flow-custom-readonly']]: readonly,
        [styles['http-flow-custom-no-effect']]: !closable,
      })}
      color="green"
      onClick={(e) => {
        if (closable) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
      contentEditable={false}
    >
      <div
        className={styles['http-flow-text']}
        contentEditable={false}
        ref={contentRef}
        title={displayText}
        onClick={(e) => {
          if (closable) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      ></div>
    </YakitTag>
  )
}
