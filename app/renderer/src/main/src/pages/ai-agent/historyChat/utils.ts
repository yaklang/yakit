import {
  type AIClearImageParams,
  handleClearAIImage,
} from '../components/aiMilkdownInput/aiCustomFile/hooks/useDeleteAIImageByNode'
import { grpcDeleteAISession } from '../grpc'
import type { DeleteAISessionRequest } from '../type/aiChat'
import { globalSessionEngine, type DeleteSessionsParams } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
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
}
/**
 * @description 删除历史会话数据（本方法只编排入参，关闭与本地删除由 deleteSessions 完成）
 * 1.关闭执行中会话并清除 store / IDB
 * 2.删除grpc数据
 * 3.删除图片数据
 */
export const handAIHistoryChatRemove = async (params: HandAIHistoryChatRemoveParams) => {
  try {
    const { grpcDeleteAISessionParams, handleClearAIImageParams, deleteSessionsParams } = params

    await globalSessionEngine.deleteSessions(deleteSessionsParams)
    await grpcDeleteAISession(grpcDeleteAISessionParams, true)
    handleClearAIImage(handleClearAIImageParams)
  } catch (_) {}
}
