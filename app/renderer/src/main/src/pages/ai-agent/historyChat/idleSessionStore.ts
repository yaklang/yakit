import { createStore } from 'zustand/vanilla'
import type { AITaskStatusType } from '@/pages/ai-re-act/hooks/grpcApi'

/** 未在前端绑定的历史记录共用空状态，不创建完整的会话数据。 */
export const idleSessionStore = createStore<{ currentChatStatus: { status?: AITaskStatusType } }>(() => ({
  currentChatStatus: {},
}))
