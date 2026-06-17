import React from 'react'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { useCreation, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { buildCodeRefDisplayText } from './aiCustomCodeBlockPlugin'
import { openCodeBlockRef } from './openCodeBlockRef'
import styles from './AICustomCodeBlock.module.scss'
import { usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'

export const AICustomCodeRef: React.FC = () => {
  const { node, selected, view, contentRef } = useNodeViewContext()
  const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)

  const readonly = useCreation(() => {
    return !view.editable
  }, [view.editable])

  const locked = useCreation(() => {
    return node?.attrs?.lock ?? false
  }, [node?.attrs?.lock])

  const name = useCreation(() => {
    return node?.attrs?.name || ''
  }, [node?.attrs?.name])

  const path = useCreation(() => {
    return node?.attrs?.path || ''
  }, [node?.attrs?.path])

  const range = useCreation(() => {
    if (!node?.attrs?.startLineNumber && !node?.attrs?.endLineNumber) return null
    return {
      startLineNumber: Number(node?.attrs?.startLineNumber || 0),
      startColumn: Number(node?.attrs?.startColumn || 0),
      endLineNumber: Number(node?.attrs?.endLineNumber || 0),
      endColumn: Number(node?.attrs?.endColumn || 0),
    }
  }, [node?.attrs?.startLineNumber, node?.attrs?.startColumn, node?.attrs?.endLineNumber, node?.attrs?.endColumn])

  const displayText = useCreation(() => {
    return buildCodeRefDisplayText(name, range)
  }, [name, range])

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

  const onOpenCodeRef = useMemoizedFn((e: React.MouseEvent) => {
    if (!path) return
    e.stopPropagation()
    e.preventDefault()
    openCodeBlockRef(currentRouteKey, { path, name, range })
  })

  const closable = useCreation(() => {
    return !readonly && !locked
  }, [readonly, locked])

  const clickable = useCreation(() => {
    return !!path
  }, [path])

  return (
    <YakitTag
      border={false}
      closable={closable}
      onClose={onRemove}
      className={classNames(styles['code-block-custom'], {
        [styles['code-block-custom-selected']]: selected && !readonly,
        [styles['code-block-custom-readonly']]: readonly,
        [styles['code-block-custom-no-effect']]: !closable && !clickable,
        [styles['code-block-custom-clickable']]: clickable,
      })}
      color="lakeBlue"
      onClick={onOpenCodeRef}
      contentEditable={false}
    >
      <div
        className={styles['code-block-text']}
        contentEditable={false}
        ref={contentRef}
        title={displayText}
        onClick={onOpenCodeRef}
      ></div>
    </YakitTag>
  )
}
