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
import { YakitMonacoDiffInline } from '@/components/yakitUI/YakitMonacoDiffInline/YakitMonacoDiffInline'

const CODE_BLOCK_MAX_HEIGHT = 200

// 将 `*** Begin Patch` 文本块解析为 original / incoming 两份，供 diff 高亮。
// 约定（unified 风格）：`-` 删除行、`+` 新增行、其余（`*** ` 文件头 / `@@ ` 行 / 上下文）两边都放。
const parsePatchToDiff = (block: string): { original: string; incoming: string } => {
  const original: string[] = []
  const incoming: string[] = []
  for (const raw of block.split(/\r?\n/)) {
    if (raw === '*** Begin Patch' || raw === '*** End Patch' || raw.startsWith('@@')) continue
    const body = raw.slice(1)
    if (raw.startsWith('-')) original.push(body)
    else if (raw.startsWith('+')) incoming.push(body)
    else {
      const line = raw.startsWith(' ') ? body : raw
      original.push(line)
      incoming.push(line)
    }
  }
  return { original: original.join('\n'), incoming: incoming.join('\n') }
}

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

  const diffLanguage = useCreation(() => (type === 'yaklang' ? 'yak' : type), [type])
  // 仅当 content 以 `*** Begin Patch` 开头时，才以 YakitMonacoDiffInline 只读展示
  const isPatch = useCreation(() => defContent.trimStart().startsWith('*** Begin Patch'), [defContent])
  const { original: patchOriginal, incoming: patchIncoming } = useCreation(
    () => (isPatch ? parsePatchToDiff(defContent) : { original: '', incoming: '' }),
    [isPatch, defContent],
  )

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
        if (isPatch) {
          return (
            <div style={{ height: CODE_BLOCK_MAX_HEIGHT }}>
              <YakitMonacoDiffInline
                reuseKey="yaklang-patch-diff"
                original={patchOriginal}
                incoming={patchIncoming}
                hunks={[]}
                onDecision={() => {}}
                language={diffLanguage}
              />
            </div>
          )
        }
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
