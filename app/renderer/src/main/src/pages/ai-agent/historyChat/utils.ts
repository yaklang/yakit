import {
  AIClearImageParams,
  handleClearAIImage,
} from '../components/aiMilkdownInput/aiCustomFile/hooks/useDeleteAIImageByNode'
import { grpcDeleteAISession } from '../grpc'
import { DeleteAISessionRequest } from '../type/aiChat'
import { globalSessionEngine, type DeleteSessionsParams } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
// 重新导出本地删除来源枚举/类型，保持既有导入路径（@/.../historyChat/utils）可用。
// 定义抽离至 deleteSource.ts（零运行时依赖），避免在单元测试中经本文件拉入 ahooks 等重型依赖。
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
