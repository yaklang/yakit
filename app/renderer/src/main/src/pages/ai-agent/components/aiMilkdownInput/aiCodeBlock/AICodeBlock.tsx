import React from 'react'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { useCreation, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { buildCodeRefDisplayText } from './aiCustomCodeBlockPlugin'
import styles from './AICustomCodeBlock.module.scss'

export const AICustomCodeRef: React.FC = () => {
  const { node, selected, view, contentRef } = useNodeViewContext()

  const readonly = useCreation(() => {
    return !view.editable
  }, [view.editable])

  const locked = useCreation(() => {
    return node?.attrs?.lock ?? false
  }, [node?.attrs?.lock])

  const name = useCreation(() => {
    return node?.attrs?.name || ''
  }, [node?.attrs?.name])

  const displayText = useCreation(() => {
    const range =
      node?.attrs?.startLineNumber || node?.attrs?.endLineNumber
        ? {
            startLineNumber: Number(node?.attrs?.startLineNumber || 0),
            startColumn: Number(node?.attrs?.startColumn || 0),
            endLineNumber: Number(node?.attrs?.endLineNumber || 0),
            endColumn: Number(node?.attrs?.endColumn || 0),
          }
        : null
    return buildCodeRefDisplayText(name, range)
  }, [name, node?.attrs?.startLineNumber, node?.attrs?.startColumn, node?.attrs?.endLineNumber, node?.attrs?.endColumn])

  const onRemove = useMemoizedFn(() => {
    if (locked) return
    const { state, dispatch } = view
    const { from, to } = state.selection
    if (from !== to) {
      const tr = state.tr.delete(from, to)
      if (dispatch) {
        dispatch(tr)
      }
    }
  })

  const closable = useCreation(() => {
    return !readonly && !locked
  }, [readonly, locked])

  return (
    <YakitTag
      border={false}
      closable={closable}
      onClose={onRemove}
      className={classNames(styles['code-block-custom'], {
        [styles['code-block-custom-selected']]: selected && !readonly,
        [styles['code-block-custom-readonly']]: readonly,
        [styles['code-block-custom-no-effect']]: !closable,
      })}
      color='lakeBlue'
      onClick={(e) => {
        if (closable) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
      contentEditable={false}
    >
      <div
        className={styles['code-block-text']}
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
