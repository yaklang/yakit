import {
  type AIClearImageParams,
  handleClearAIImage,
} from '../components/aiMilkdownInput/aiCustomFile/hooks/useDeleteAIImageByNode'
import { grpcDeleteAISession } from '../grpc'
import { grpcQueryAIReActSchedules } from '../aiScheduledTasks/utils'
import type { DeleteAISessionRequest } from '../type/aiChat'
import { globalSessionEngine, type DeleteSessionsParams } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
export { DeleteSessionsAISourceEnum, type DeleteSessionsAISourceType } from './deleteSource'

export interface HandAIHistoryChatRemoveParams {
  /** 删除grpc数据 */
  grpcDeleteAISessionParams: DeleteAISessionRequest
  /** 删除图片数据 */
  handleClearAIImageParams: AIClearImageParams
  /**
   * 关闭并删除 Controller 侧 session（停流 / 内存池 / IDB）
   * - 单条 / 按天：sessionIds + source
   * - 清空：sessionIds 空 + source 列表（不用 deleteAll）
   */
  deleteSessionsParams: DeleteSessionsParams
  /** 预检定时任务关联时使用的精确会话 ID 列表（如清空场景需补齐路由级会话） */
  scheduleSessionIds?: string[]
}

/** 用户在删除确认弹窗中取消时抛出；调用方据此跳过失败报错与回滚后的提示 */
export class AISessionDeleteCancelledError extends Error {}

/**
 * 删除前预检：查询绑定这些会话的活跃 continue_session 定时任务，
 * 有绑定则弹确认（列出任务名），无绑定直接放行；
 * 返回 true 表示继续删除；false 仅表示用户取消。
 * 预检查询失败（如旧引擎未提供该接口）时降级放行删除，报错不展示给用户。
 * 定时任务：最多同时运行3个
 */
const confirmScheduleImpact = async (sessionIds: string[]): Promise<boolean> => {
  let response
  try {
    response = await grpcQueryAIReActSchedules(
      {
        Pagination: { Page: 1, Limit: 3, OrderBy: 'created_at', Order: 'desc' },
        Filter: {
          Status: ['active'],
          TargetModes: ['continue_session'],
          ...(sessionIds.length > 0 ? { TargetSessionIDs: sessionIds } : {}),
        },
      },
      true,
    )
  } catch {
    // 查询失败（如旧引擎无该接口）不阻断删除历史会话，降级放行
    return true
  }
  const attachedSchedules = response.Data || []
  const attachedScheduleCount = Number(response.Total || attachedSchedules.length)
  if (attachedScheduleCount <= 0) return true

  const names = attachedSchedules
    .slice(0, 3)
    .map((item) => item.Name)
    .join('、')
  return new Promise<boolean>((resolve) => {
    const m = YakitModalConfirm({
      type: 'white',
      width: 420,
      bodyStyle: { padding: '0 24px' },
      title: (modalT) => modalT('AIScheduledTasks.deleteChatConfirmTitle'),
      content: (modalT) =>
        modalT('AIScheduledTasks.deleteChatConfirmContent', {
          count: attachedScheduleCount,
          names,
        }),
      onOkText: (modalT) => modalT('AIScheduledTasks.deleteChatConfirmOK'),
      onCancelText: (modalT) => modalT('AIScheduledTasks.cancel'),
      okButtonProps: { colors: 'danger', size: 'large' },
      cancelButtonProps: { size: 'large' },
      onOk: () => {
        resolve(true)
        m.destroy()
      },
      onCancel: () => resolve(false),
    })
  })
}

/**
 * @description 删除历史会话数据（本方法只编排入参，关闭与本地删除由 deleteSessions 完成）
 * 0.预检：会话被活跃 continue_session 定时任务绑定时弹确认，取消则抛 AISessionDeleteCancelledError
 * 1.关闭执行中会话并清除 store / IDB
 * 2.删除grpc数据
 * 3.删除图片数据
 */
export const handAIHistoryChatRemove = async (params: HandAIHistoryChatRemoveParams) => {
  // 下面的 await 故意不包 try/catch：预检取消（AISessionDeleteCancelledError）与删除过程中的真实错误
  // 都必须向上抛给调用方（HistoryChatList / HistoryChat），由其回滚本地列表并决定是否提示；
  // 若在此吞错，用户取消后调用方会误认为删除成功而错误更新本地会话列表。
  const { grpcDeleteAISessionParams, handleClearAIImageParams, deleteSessionsParams } = params
  const sessionIds = params.scheduleSessionIds ?? deleteSessionsParams.sessionIds ?? []
  const confirmed = await confirmScheduleImpact(sessionIds)
  if (!confirmed) throw new AISessionDeleteCancelledError('AI session deletion cancelled')

  await globalSessionEngine.deleteSessions(deleteSessionsParams)
  await grpcDeleteAISession(grpcDeleteAISessionParams, true)
  handleClearAIImage(handleClearAIImageParams)
}
