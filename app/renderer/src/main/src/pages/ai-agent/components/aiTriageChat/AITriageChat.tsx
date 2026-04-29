import React, { memo, useRef, useState } from 'react'
import { AITriageChatContentEditProps, AITriageChatContentProps } from './type'

import classNames from 'classnames'
import styles from './AITriageChat.module.scss'
import { useCreation, useMemoizedFn } from 'ahooks'
import { AIMilkdownInput } from '../aiMilkdownInput/AIMilkdownInput'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { OutlinePencilaltIcon } from '@/assets/icon/outline'
import { Tooltip } from 'antd'
import { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import { editorViewCtx } from '@milkdown/kit/core'
import { convertKeyEventToKeyCombination } from '@/utils/globalShortcutKey/utils'
import { YakitKeyBoard } from '@/utils/globalShortcutKey/keyboard'
import { TextSelection } from '@milkdown/kit/prose/state'
import { getMarkdown } from '@milkdown/kit/utils'
import useAIAgentStore from '../../useContext/useStore'
import { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { AIChatTextareaSubmit } from '../../template/type'
import { getAIReActRequestParams } from '../../utils'
import { extractDataWithMilkdown } from '../aiMilkdownInput/utils'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import useGetChatDataStoreKey from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'

export const AITriageChatContent: React.FC<AITriageChatContentProps> = memo((props) => {
  const { isAnswer, content, contentClassName, chatClassName, extraValue } = props
  const { chatDataStoreKey } = useGetChatDataStoreKey()
  const [edit, setEdit] = useState<boolean>(false)

  const renderContent = useMemoizedFn(() => {
    if (!!extraValue?.showQS) {
      return (
        <>
          <AIMilkdownInput defaultValue={`${extraValue?.showQS}`} readonly={true} chatDataStoreKey={chatDataStoreKey} />
        </>
      )
    }
    return <>{content}</>
  })

  return (
    <div className={styles['triage-chat-content-wrapper']}>
      {edit ? (
        <AITriageChatContentEdit content={content} extraValue={extraValue} onCancel={() => setEdit(false)} />
      ) : (
        <>
          <div
            className={classNames(
              styles['triage-chat-content'],
              {
                [styles['triage-chat-question']]: !isAnswer,
                [styles['triage-chat-answer']]: !!isAnswer,
              },
              chatClassName || '',
            )}
          >
            <div className={classNames(styles['content-wrapper'], contentClassName || '')}>{renderContent()}</div>
          </div>
          {!isAnswer && (
            <div className={styles['triage-chat-content-extra']}>
              <Tooltip title="复制">
                <CopyComponents
                  copyText={`${extraValue?.showQS}` || content || ''}
                  iconColor="var(--Colors-Use-Neutral-Text-3-Secondary)"
                  className={styles['copy-btn']}
                />
              </Tooltip>
              <Tooltip title="编辑">
                <YakitButton type="text2" icon={<OutlinePencilaltIcon />} onClick={() => setEdit(true)} />
              </Tooltip>
            </div>
          )}
        </>
      )}
    </div>
  )
})
const AITriageChatContentEdit: React.FC<AITriageChatContentEditProps> = React.memo((props) => {
  const { extraValue, content, onCancel } = props
  const { activeChat } = useAIAgentStore()
  const { chatIPCEvents } = useChatIPCDispatcher()
  const { chatDataStoreKey } = useGetChatDataStoreKey()

  const defaultValue = useCreation(() => {
    if (!!extraValue?.showQS) {
      return `${extraValue?.showQS}`
    }
    return content
  }, [content, extraValue])

  const [disabled, setDisabled] = useState<boolean>(() => !defaultValue.trim())
  const editorMilkdown = useRef<EditorMilkdownProps>()

  const onUpdateEditor = useMemoizedFn((editor: EditorMilkdownProps) => {
    const isFirstEditorUpdate = !editorMilkdown.current
    editorMilkdown.current = editor
    if (isFirstEditorUpdate) {
      handleSetTextareaFocus()
    }
  })
  const onUpdateContent = useMemoizedFn((value: string) => {
    setDisabled(!value.trim())
  })
  const handleSetTextareaFocus = useMemoizedFn(() => {
    editorMilkdown.current?.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      if (view.isDestroyed) return
      const { state } = view
      const tr = state.tr.setSelection(TextSelection.create(state.doc, state.doc.content.size))
      view.focus()
      view.dispatch(tr.scrollIntoView())
    })
  })

  const onClose = useMemoizedFn((e) => {
    e.stopPropagation()
    onCancel()
  })
  const onSend = useMemoizedFn(() => {
    // 发送消息逻辑
    if (!editorMilkdown.current || !activeChat) return
    const qs = getMarkdownValue()
    if (!qs) return
    const { mentions } = extractDataWithMilkdown(editorMilkdown.current)
    const value: AIChatTextareaSubmit = {
      qs,
      mentionList: mentions,
      showQS: qs,
      focusMode: '',
    }
    const { extra, attachedResourceInfo } = getAIReActRequestParams(value)

    const chatMessage: AIInputEvent = {
      IsFreeInput: true,
      FreeInput: value.qs,
      AttachedResourceInfo: attachedResourceInfo,
      FocusModeLoop: value.focusMode,
    }
    chatIPCEvents.onSend({
      token: activeChat.SessionID,
      type: 'casual',
      params: {
        IsFreeInput: true,
        ...chatMessage,
      },
      extraValue: extra,
    })
    onCancel()
  })
  const getMarkdownValue = useMemoizedFn(() => {
    const value = editorMilkdown.current?.action(getMarkdown()) || ''
    return value.replace(/\n+$/, '')
  })
  const handleTextareaKeyDown = useMemoizedFn((e) => {
    const keys = convertKeyEventToKeyCombination(e)
    if (!e.nativeEvent?.isComposing && keys?.join() === YakitKeyBoard.Enter) {
      e.stopPropagation()
      e.preventDefault()
      onSend()
    }
  })

  return (
    <div className={styles['edit-content-wrapper']} onClick={handleSetTextareaFocus} onKeyDown={handleTextareaKeyDown}>
      <div
        onClick={(e) => {
          e.stopPropagation()
        }}
        className={styles['edit-content']}
      >
        <AIMilkdownInput
          filterMode={['focusMode']}
          defaultValue={defaultValue}
          onUpdateEditor={onUpdateEditor}
          onUpdateContent={onUpdateContent}
          chatDataStoreKey={chatDataStoreKey}
        />
      </div>
      <div className={styles['edit-footer']}>
        <YakitButton type="outline2" onClick={onClose}>
          取消
        </YakitButton>
        <YakitButton
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            onSend()
          }}
        >
          发送
        </YakitButton>
      </div>
    </div>
  )
})
