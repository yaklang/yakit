import { memo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { OutlineSearchIcon } from '@/assets/icon/outline'
import HistoryChat from '../historyChat/HistoryChat'
import { AI_AGENT_HISTORY_AI_SOURCES } from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AISession } from '../type/aiChat'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { SessionSearchCommand } from './SessionSearchCommand/SessionSearchCommand'
import styles from './ChatSessionPane.module.scss'

const ChatSessionPane: React.FC = memo(() => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [searchOpen, setSearchOpen] = useState(false)
  const { setActiveChat, setSetting } = useAIAgentDispatcher()

  const handleCloseSearch = useMemoizedFn(() => {
    setSearchOpen(false)
  })

  const handleSelectSession = useMemoizedFn((info: AISession) => {
    setSetting?.((old) => ({
      ...old,
      SyncPerceptionTrigger: info?.StartParams?.SyncPerceptionTrigger ?? false,
      EnablePlan: info?.StartParams?.EnablePlan ?? false,
      DisableMemoryTriage: info?.StartParams?.DisableMemoryTriage ?? false,
      Strategy: {
        EnableMultiAgent: info?.StartParams?.Strategy?.EnableMultiAgent ?? false,
        EnableGoalMode: info?.StartParams?.Strategy?.EnableGoalMode ?? false,
        GoalMinIterations: info?.StartParams?.Strategy?.GoalMinIterations ?? 0,
        MaxSubAgents: info?.StartParams?.Strategy?.MaxSubAgents ?? 0,
      },
    }))
    setActiveChat?.(info)
    setSearchOpen(false)
  })

  return (
    <div className={styles['chat-session-pane']}>
      <HistoryChat
        aiSource={AI_AGENT_HISTORY_AI_SOURCES}
        title={t('ChatSessionPane.sessionList')}
        hideInlineSearch
        className={styles['session-history-chat']}
        headerActionsExtra={
          <Tooltip title={t('YakitInput.search')} placement="topRight">
            <YakitButton
              type="text2"
              isActive={searchOpen}
              icon={<OutlineSearchIcon />}
              onClick={() => setSearchOpen(true)}
            />
          </Tooltip>
        }
        renderExtra={(sessions) => (
          <YakitModal
            visible={searchOpen}
            footer={null}
            hiddenHeader
            type="white"
            width={480}
            destroyOnClose
            maskClosable
            wrapClassName={styles['session-search-modal']}
            bodyStyle={{ padding: 0 }}
            onCancel={handleCloseSearch}
          >
            <SessionSearchCommand sessions={sessions} onSelect={handleSelectSession} onClose={handleCloseSearch} />
          </YakitModal>
        )}
      />
    </div>
  )
})

export default ChatSessionPane
