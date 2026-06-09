import React, { useRef } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { shallow } from 'zustand/shallow'

import { HistoryAIReActChatProvider } from '@/components/historyAIReActChat'
import { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { usePageInfo } from '@/store/pageInfo'
import { ChatDataStore } from '@/pages/ai-agent/store/ChatDataStore'

import { YakRunner } from './YakRunner'
import { YakRunnerAiAttachProvider } from './YakRunnerAiAttachContext'
import { YakRunnerAiPageBridge } from './YakRunnerAiPageContext'
import { YakRunnerAiSidePanelLayout } from './YakRunnerAiSidePanelLayout'
import { appendYakRunnerAttachmentsToEvent } from './yakRunnerEditorAttachment'

export const YAKRUNNER_FOCUS_MODE_WRITE_YAKLANG = 'write_yaklang_code'

class YakRunnerAiStore extends ChatDataStore {
  public readonly runnerPageId: string
  constructor(runnerPageId: string) {
    super()
    this.runnerPageId = runnerPageId
  }
}

/** Yak Runner 页：右侧 AI 对话 + 左侧编辑器，支持 yaklang_code_change 审阅应用 */
export const YakRunnerPage: React.FC = () => {
  const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)
  const pageId = currentRouteKey || 'yak-runner-default'
  const attachRef = useRef({})
  const cacheDataStore = useCreation(() => new YakRunnerAiStore(pageId), [pageId])

  const transformInputEvent = useMemoizedFn((event: AIInputEvent) => {
    return appendYakRunnerAttachmentsToEvent(event, attachRef.current)
  })

  return (
    <HistoryAIReActChatProvider
      cacheDataStore={cacheDataStore}
      focusModeLoop={YAKRUNNER_FOCUS_MODE_WRITE_YAKLANG}
      defaultTimelineSessionID={pageId}
      yakRunnerTabPageId={pageId}
      transformInputEvent={transformInputEvent}
    >
      <YakRunnerAiAttachProvider attachRef={attachRef}>
        <YakRunnerAiPageBridge pageId={pageId}>
          <YakRunnerAiSidePanelLayout>
            <YakRunner />
          </YakRunnerAiSidePanelLayout>
        </YakRunnerAiPageBridge>
      </YakRunnerAiAttachProvider>
    </HistoryAIReActChatProvider>
  )
}

export default YakRunnerPage
