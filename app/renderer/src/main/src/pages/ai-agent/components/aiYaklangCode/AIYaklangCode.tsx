import React, { useMemo, useRef, useState } from 'react'
import { WebFuzzerAiStoreCardRightHeader } from '@/pages/ai-agent/components/WebFuzzerAiStoreCardRightHeader'
import { AIYaklangCodeProps } from './type'
import ChatCard from '../ChatCard'
// import { OutlinCompileTwoIcon } from '@/assets/icon/outline'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitIMonacoEditor } from '@/components/yakitUI/YakitEditor/YakitEditorType'
import ModalInfo from '../ModelInfo'
import styles from './AIYaklangCode.module.scss'
import { useCreation, useMemoizedFn, useThrottleEffect } from 'ahooks'
import { NewHTTPPacketEditor } from '@/utils/editors'
import { monaco as monacoApi } from 'react-monaco-editor'
import useAIAgentStore from '../../useContext/useStore'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'

const CODE_BLOCK_MAX_HEIGHT = 200

export const AIYaklangCode: React.FC<AIYaklangCodeProps> = React.memo((props) => {
  const { content: defContent, nodeLabel, modalInfo, contentType, referenceNode } = props

  const [content, setContent] = useState(defContent)
  const codeContainerRef = useRef<HTMLDivElement>(null)
  useThrottleEffect(
    () => {
      setContent(defContent)
    },
    [defContent],
    { wait: 500 },
  )
  const type = useCreation(() => {
    return contentType.split('/')?.[1] || 'plaintext'
  }, [contentType])

  const bindContentHeightEditor = useMemoizedFn((editor: YakitIMonacoEditor) => {
    const setEditorScrollActive = (active: boolean) => {
      editor.updateOptions({
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          handleMouseWheel: active,
          alwaysConsumeMouseWheel: active,
        },
      })
    }

    setEditorScrollActive(false)
    editor.onDidFocusEditorWidget(() => setEditorScrollActive(true))
    editor.onDidBlurEditorWidget(() => setEditorScrollActive(false))

    const updateHeight = () => {
      const container = codeContainerRef.current
      const editorEl = editor.getDomNode()
      if (!container || !editorEl) return

      const lineHeight = editor.getOption(monacoApi.editor.EditorOption.lineHeight)
      const lineCount = editor.getModel()?.getLineCount() || 1
      const contentHeight = Math.ceil(editor.getTopForLineNumber(lineCount + 1) + lineHeight)
      const height = Math.min(CODE_BLOCK_MAX_HEIGHT, contentHeight)

      container.style.height = `${height}px`
      editorEl.style.height = `${height}px`
      editor.layout()
    }

    updateHeight()
    editor.onDidChangeModelDecorations(() => {
      updateHeight()
      requestAnimationFrame(updateHeight)
    })
    editor.onDidContentSizeChange(updateHeight)
  })

  const renderCode = useMemoizedFn(() => {
    switch (type) {
      case 'http-request':
        return (
          <NewHTTPPacketEditor
            originValue={content}
            readOnly={true}
            onlyBasicMenu={false}
            noMinimap={true}
            noLineNumber={true}
            onEditor={bindContentHeightEditor}
          />
        )
      default:
        // case AIStreamContentType.CODE_YAKLANG:
        // case AIStreamContentType.CODE_PYTHON:
        return (
          <YakitEditor
            type={type}
            value={content}
            readOnly={true}
            noMiniMap={true}
            noLineNumber={true}
            editorDidMount={bindContentHeightEditor}
          />
        )
    }
  })
  // const { chatIPCEvents } = useChatIPCDispatcher()
  const { setting } = useAIAgentStore()

  const { getCurrentSelectPageId, currentPageTabRouteKey } = usePageInfo(
    (s) => ({
      getCurrentSelectPageId: s.getCurrentSelectPageId,
      currentPageTabRouteKey: s.currentPageTabRouteKey,
    }),
    shallow,
  )
  /** TODO - 这个pageId获取待修改@whale  */
  const webFuzzerAiStoreFuzzerPageId = useMemo((): string | undefined => {
    return getCurrentSelectPageId(currentPageTabRouteKey)
  }, [currentPageTabRouteKey])

  const isWebFuzzerAiStore = useMemo(() => {
    return setting.Source === AISourceEnum.webFuzzer
  }, [setting.Source])

  const titleExtra = useMemo(() => {
    if (!modalInfo) return null
    return (
      <ModalInfo
        {...modalInfo}
        trailing={
          isWebFuzzerAiStore && webFuzzerAiStoreFuzzerPageId ? (
            <WebFuzzerAiStoreCardRightHeader content={content} fuzzerPageId={webFuzzerAiStoreFuzzerPageId} />
          ) : undefined
        }
      />
    )
  }, [modalInfo, isWebFuzzerAiStore, content, webFuzzerAiStoreFuzzerPageId])

  return (
    <div className={styles['ai-yaklang-code-hover-wrap']}>
      {/*  titleIcon={<OutlinCompileTwoIcon />}  */}
      <ChatCard titleText={nodeLabel} titleExtra={titleExtra}>
        <div ref={codeContainerRef} className={styles['ai-yaklang-code']}>
          {renderCode()}
        </div>
        {referenceNode}
      </ChatCard>
    </div>
  )
})
