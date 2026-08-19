import {
  type AIClearImageParams,
  handleClearAIImage,
} from '../components/aiMilkdownInput/aiCustomFile/hooks/useDeleteAIImageByNode'
import { grpcDeleteAISession } from '../grpc'
import { grpcQueryAIReActSchedules } from '../grpc'
import type { DeleteAISessionRequest } from '../type/aiChat'
import { globalSessionEngine, type DeleteSessionsParams } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { Modal } from 'antd'
import i18n from '@/i18n/i18n'
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
  /** Exact sessions used only for scheduled-task dependency preflight. */
  scheduleSessionIds?: string[]
  /** Show the normal chat deletion confirmation when no active schedule is attached. */
  confirmDeletionWithoutSchedules?: boolean
}

export class AISessionDeleteCancelledError extends Error {}
/**
 * @description 删除历史会话数据（本方法只编排入参，关闭与本地删除由 deleteSessions 完成）
 * 1.关闭执行中会话并清除 store / IDB
 * 2.删除grpc数据
 * 3.删除图片数据
 */
export const handAIHistoryChatRemove = async (params: HandAIHistoryChatRemoveParams) => {
  const { grpcDeleteAISessionParams, handleClearAIImageParams, deleteSessionsParams } = params
  const sessionIds = params.scheduleSessionIds ?? deleteSessionsParams.sessionIds ?? []
  const response = await grpcQueryAIReActSchedules(
    {
      Pagination: { Page: 1, Limit: 3, OrderBy: 'created_at', Order: 'desc' },
      Filter: {
        Status: ['active'],
        ...(sessionIds.length > 0 ? { TargetSessionIDs: sessionIds } : {}),
        TargetModes: ['continue_session'],
      },
    },
    true,
  )
  const attachedSchedules = response.Data || []
  const attachedScheduleCount = Number(response.Total || attachedSchedules.length)
  if (attachedScheduleCount > 0 || params.confirmDeletionWithoutSchedules) {
    const names = attachedSchedules
      .slice(0, 3)
      .map((item) => item.Name)
      .join('、')
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title:
          attachedScheduleCount > 0
            ? i18n.t('aiAgent:ScheduledTasks.deleteChatConfirmTitle')
            : i18n.t('aiAgent:ScheduledTasks.deleteChatOnlyConfirmTitle'),
        content:
          attachedScheduleCount > 0
            ? i18n.t('aiAgent:ScheduledTasks.deleteChatConfirmContent', {
                count: attachedScheduleCount,
                names,
              })
            : i18n.t('aiAgent:ScheduledTasks.deleteChatOnlyConfirmContent'),
        okText:
          attachedScheduleCount > 0
            ? i18n.t('aiAgent:ScheduledTasks.deleteChatConfirmOK')
            : i18n.t('aiAgent:ScheduledTasks.deleteChatOnlyConfirmOK'),
        cancelText: i18n.t('aiAgent:ScheduledTasks.cancel'),
        okButtonProps: { danger: true },
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!confirmed) throw new AISessionDeleteCancelledError('AI session deletion cancelled')
  }

  await globalSessionEngine.deleteSessions(deleteSessionsParams)
  await grpcDeleteAISession(grpcDeleteAISessionParams, true)
  handleClearAIImage(handleClearAIImageParams)
}
