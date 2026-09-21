import { createStore } from 'zustand/vanilla'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import type { AISource } from '../grpcApi'

// state 里有 Map/Set，Immer 操作 Map/Set 前必须加载 MapSet 插件
enableMapSet()

/** 会话删除状态枚举 */
export enum SessionDeleteStatus {
  Idle = 'idle',
  Deleting = 'deleting',
  Deleted = 'deleted',
}

/**
 * 全局会话删除状态 store
 * 一个 store 同时承载两种删除语义：
 * - per-session（deleteStatuses）：单条删除 / 按天删除 —— 能拿到具体 sessionIds
 * - 按 source 批量（deletingSources）：按来源删除 / 删除所有
 *   Controller 内 resolveDeleteSessionIds 只返回内存中的 ids，但 UI 列表显示的
 *   历史会话很多来自 grpc 查询（不在内存），这些不会被 per-session 标记覆盖，
 *   因此需要一个全局的、按 source 维度的批量删除标记。
 * UI 用 useStore(sessionStatusStore, s => ...) 选择性订阅，selector 返回基本类型。
 */
export interface SessionStatusState {
  /** 各 session 的删除状态，按 sessionId 索引 */
  deleteStatuses: Map<string, SessionDeleteStatus>
  /** 正在批量删除的 source 集合 */
  deletingSources: Set<AISource>
  /** 设置多个 session 的删除状态（Controller deleteSessions 内部调用） */
  setSessionsDeleteStatus: (sessionIds: string[], status: SessionDeleteStatus) => void
  /** 标记某些 source 进入/退出批量删除 */
  setSourceDeleting: (sources: AISource[], deleting: boolean) => void
}

export const createSessionStatusStore = () => {
  return createStore<SessionStatusState>()(
    immer((set) => ({
      deleteStatuses: new Map<string, SessionDeleteStatus>(),
      deletingSources: new Set<AISource>(),
      setSessionsDeleteStatus: (sessionIds, status) =>
        set((state) => {
          for (const id of sessionIds) {
            state.deleteStatuses.set(id, status)
          }
        }),
      setSourceDeleting: (sources, deleting) =>
        set((state) => {
          for (const s of sources) {
            if (deleting) state.deletingSources.add(s)
            else state.deletingSources.delete(s)
          }
        }),
    })),
  )
}

/** 全局删除状态 store 实例 */
export const sessionStatusStore = createSessionStatusStore()
