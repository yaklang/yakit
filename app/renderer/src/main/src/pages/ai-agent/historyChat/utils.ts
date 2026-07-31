import { AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import {
  AIClearImageParams,
  handleClearAIImage,
} from '../components/aiMilkdownInput/aiCustomFile/hooks/useDeleteAIImageByNode'
import { grpcDeleteAISession } from '../grpc'
import { DeleteAISessionRequest } from '../type/aiChat'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import type { YakitRouteType } from '@/enums/yakitRoute'

export interface HandAIHistoryChatRemoveParams {
  /** 删除grpc数据 */
  grpcDeleteAISessionParams: DeleteAISessionRequest
  /** 删除图片数据 */
  handleClearAIImageParams: AIClearImageParams
  /** 删除 Controller 内存中的 session（含双索引与业务池） */
  deleteSessionsParams: {
    sessionIds: string[]
    sources: AISource[]
    route: YakitRouteType
    pageId: string
  }
}
/**
 * @description 删除历史会话数据
 * 1.删除grpc数据
 * 2.删除图片数据
 * 3.删除store缓存数据
 * 4.删除indexdb
 */
export const handAIHistoryChatRemove = async (params: HandAIHistoryChatRemoveParams) => {
  try {
    const { grpcDeleteAISessionParams, handleClearAIImageParams, deleteSessionsParams } = params

    // 必须等待 session-end（含 5 秒 fallback）完成，才删除后端历史。
    // sessionId 是全局唯一的，显式目标集合已与本次 gRPC 删除条件对齐，不再按当前 page 截断。
    await globalSessionEngine.stopExecutingSessionsAndWait(deleteSessionsParams.sessionIds)
    await grpcDeleteAISession(grpcDeleteAISessionParams, true)
    handleClearAIImage(handleClearAIImageParams)
    globalSessionEngine.deleteSessions(deleteSessionsParams)
  } catch (_) {}
}
