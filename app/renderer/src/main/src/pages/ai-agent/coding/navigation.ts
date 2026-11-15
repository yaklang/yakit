import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { AIAgentSettingDefault, createWelcomeChat } from '../defaultConstant'
import { openAIAgentChatTab } from '../historyChat/HistoryChat'
import { selectCodingWorkspace } from './binding'
import { isExperimentalCodingEnabled } from './experimentalCodingStore'
import type { CodingWorkspace, CodingWorktree } from './api'

export const openCodingWorktrees = () => {
  emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_Worktrees }))
}

export const openCodingProject = (workspace: CodingWorkspace, worktree?: CodingWorktree) => {
  if (!isExperimentalCodingEnabled()) return
  const draft = {
    ...createWelcomeChat(),
    StartParams: {
      ...AIAgentSettingDefault,
      ...selectCodingWorkspace(workspace, worktree),
    },
  }
  openAIAgentChatTab(draft)
}
