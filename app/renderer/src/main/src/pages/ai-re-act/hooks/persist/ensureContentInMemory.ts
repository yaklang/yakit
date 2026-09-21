import type { AIChatQSData } from '../aiRender'
import { applyHydratedStageSettled, persistGetSessionContent } from './contentPersistHelper'

/**
 * 内存没有则从 IDB 灌回 Map（旧行缺 stageSettled 视为 true）。
 * 仍没有则用 create 按事件重建，不写回对抗淘汰的热路径。
 */
export const ensureContentInMemory = async (
  sessionId: string,
  token: string,
  contents: Map<string, AIChatQSData>,
  create?: () => AIChatQSData | undefined,
): Promise<AIChatQSData | undefined> => {
  const existing = contents.get(token)
  if (existing) return existing

  try {
    const persisted = await persistGetSessionContent(sessionId, token)
    if (persisted) {
      applyHydratedStageSettled(persisted)
      contents.set(token, persisted)
      return persisted
    }
  } catch {
    // 读盘失败不打断主流程，走 create
  }

  const created = create?.()
  if (created) {
    contents.set(token, created)
    return created
  }
  return undefined
}
