import React from 'react'
import { Tooltip } from 'antd'
import { useMemoizedFn } from 'ahooks'

import { HistoryAIReActChatProvider, useHistoryAIReActChat } from '@/components/historyAIReActChat'
import { AIInputInnerFeatureEnum } from '@/pages/ai-agent/template/type'
import { yakRunnerAiStore } from '@/pages/ai-agent/store/ChatDataStore'
import { OutlinePlusIcon, OutlineXIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import useStore from './hooks/useStore'

import styles from './YakRunnerAI.module.scss'

const YAK_RUNNER_AI_PAGE_ID = 'yakrunner-ai'
const YAK_RUNNER_AI_FOCUS_MODE = 'yaklang-writer'

const YakRunnerAIInner: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { renderHistoryAIReActChat, historyAIReActChatBridge, focusModeLoop } = useHistoryAIReActChat()

  const onResetChat = useMemoizedFn(() => {
    const { activeID, events, onStop, onChatFromHistory, setActiveChat } = historyAIReActChatBridge
    if (!activeID) return
    onStop()
    events.onReset()
    onChatFromHistory(activeID)
    setActiveChat(undefined)
  })

  return (
    <div className={styles['yak-runner-ai']}>
      {renderHistoryAIReActChat({
        className: styles['yak-runner-ai-content'],
        externalParameters: {
          isOpen: false,
          rightIcon: (
            <>
              <Tooltip title="新建对话">
                <YakitButton type="text2" icon={<OutlinePlusIcon />} onClick={onResetChat} />
              </Tooltip>
              <YakitButton type="text2" icon={<OutlineXIcon />} onClick={onClose} />
            </>
          ),
          footerLeftTypes: [
            AIInputInnerFeatureEnum.AIModelSelect,
            {
              type: AIInputInnerFeatureEnum.AIFocusMode,
              props: {
                value: focusModeLoop,
                onChange: () => {},
                disabled: true,
              },
            },
          ],
          filterMentionType: ['focusMode'],
        },
      })}
    </div>
  )
}

const prependCurrentFileContext = (event: any, activeFileCode?: string, activeFilePath?: string) => {
  const code = (activeFileCode || '').trim()
  if (!code) return event
  const prefix = `Current editor file: ${activeFilePath || 'Untitled'}\n\n\`\`\`\n${code}\n\`\`\`\n\nUser request:\n`
  if (event.IsStart && event.Params?.UserQuery != null) {
    return {
      ...event,
      Params: {
        ...event.Params,
        UserQuery: `${prefix}${event.Params.UserQuery}`.trim(),
      },
    }
  }
  if (event.IsFreeInput && event.FreeInput != null) {
    return {
      ...event,
      FreeInput: `${prefix}${event.FreeInput}`.trim(),
    }
  }
  return event
}

export const YakRunnerAI: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { activeFile } = useStore()

  return (
    <HistoryAIReActChatProvider
      cacheDataStore={yakRunnerAiStore}
      focusModeLoop={YAK_RUNNER_AI_FOCUS_MODE}
      transformInputEvent={(event) => prependCurrentFileContext(event, activeFile?.code, activeFile?.path)}
    >
      <YakRunnerAIInner onClose={onClose} />
    </HistoryAIReActChatProvider>
  )
}

export { YAK_RUNNER_AI_PAGE_ID }
