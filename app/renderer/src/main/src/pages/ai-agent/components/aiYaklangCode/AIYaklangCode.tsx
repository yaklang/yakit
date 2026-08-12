import React, { useMemo, useRef, useState } from 'react'
import { useCreation, useInterval, useMemoizedFn } from 'ahooks'
import { WebFuzzerAiStoreCardRightHeader } from '@/pages/ai-agent/components/WebFuzzerAiStoreCardRightHeader'
import type { AIYaklangCodeProps } from './type'
import ChatCard from '../ChatCard'
// import { OutlinCompileTwoIcon } from '@/assets/icon/outline'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import type { YakitIMonacoEditor } from '@/components/yakitUI/YakitEditor/YakitEditorType'
import ModalInfo from '../ModelInfo'
import styles from './AIYaklangCode.module.scss'
import { NewHTTPPacketEditor } from '@/utils/editors'
import { monaco as monacoApi } from 'react-monaco-editor'
import useAIAgentStore from '../../useContext/useStore'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
import { YakitMonacoDiffInline } from '@/components/yakitUI/YakitMonacoDiffInline/YakitMonacoDiffInline'
import { useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'

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

const readStreamContent = (rawData: ReturnType<typeof useCurrentRawData>, streamId: string | undefined): string => {
  if (streamId) {
    const item = rawData.contents.get(streamId)
    if (item?.type === AIChatQSDataTypeEnum.STREAM) {
      return item.data.content ?? ''
    }
  }
  return ''
}

export const AIYaklangCode: React.FC<AIYaklangCodeProps> = React.memo((props) => {
  const { content: defContent, nodeLabel, modalInfo, contentType, referenceNode, streaming, autoApplyStreamId } = props

  const rawData = useCurrentRawData()
  const codeContainerRef = useRef<HTMLDivElement>(null)
  const [streamedContent, setStreamedContent] = useState(() => defContent)
  const isLiveStreaming = streaming === true
  // 流式正文在 rawData 里原地累加，React 感知不到；仅在流式进行中轮询取最新驱动渲染。
  // 结束后（含虚拟列表重挂载的历史卡片）直接用 defContent——它是 renderNum 触发的最终快照，
  // 不依赖 rawData 是否仍在内存，也不会被轮询到的残缺/陈旧数据覆盖
  useInterval(
    () => {
      const next = readStreamContent(rawData, autoApplyStreamId)
      if (!next) return
      setStreamedContent((prev) => (prev === next ? prev : next))
    },
    isLiveStreaming && autoApplyStreamId ? 200 : undefined,
  )

  const content = autoApplyStreamId && isLiveStreaming ? streamedContent : defContent

  const type = useCreation(() => contentType.split('/')?.[1] || 'plaintext', [contentType])

  const diffLanguage = useCreation(() => (type === 'yaklang' ? 'yak' : type), [type])
  // 结束后再挂 Diff；流式中途不解析 patch
  const isPatch = useCreation(
    () => !isLiveStreaming && content.trimStart().startsWith('*** Begin Patch'),
    [isLiveStreaming, content],
  )
  const { original: patchOriginal, incoming: patchIncoming } = useCreation(
    () => (isPatch ? parsePatchToDiff(content) : { original: '', incoming: '' }),
    [isPatch, content],
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
    if (isLiveStreaming) {
      return <pre className={styles['ai-yaklang-code-stream-pre']}>{content || ' '}</pre>
    }

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
                hideOriginalLineNumbers
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
