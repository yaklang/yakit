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
    source: AISource
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
    // 1.删除grpc数据
    await grpcDeleteAISession(grpcDeleteAISessionParams, true)
    // 2.删除图片数据
    handleClearAIImage(handleClearAIImageParams)
    // 3.删除store缓存数据
    globalSessionEngine.deleteSessions(deleteSessionsParams)
    // TODO - 4.删除indexdb
  } catch (error) {}
}
