import { aiToolForUI, grpcPagingToUI, int64ToSafeNumber } from '../grpcAdapters'
import type { GrpcOutput } from '@/services/ipc'
import { ipc } from '@/services/ipc'
import type { APIFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import type {
  AITool,
  DeleteAIToolRequest,
  GetAIToolListRequest,
  GetAIToolListResponse,
  ToggleAIToolFavoriteRequest,
  ToggleAIToolFavoriteResponse,
} from '../type/aiTool'
import { genDefaultPagination } from '@/pages/invoker/schema'

export const grpcGetAIToolList: APIFunc<GetAIToolListRequest, GetAIToolListResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetAIToolList', params)
      .then((res) =>
        resolve({
          ...res,
          Tools: res.Tools.map(aiToolForUI),
          Pagination: grpcPagingToUI(res.Pagination),
          Total: int64ToSafeNumber(res.Total),
        }),
      )
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetAIToolList 失败:' + err)
        reject(err)
      })
  })
}

export const grpcGetAIToolById: APIFunc<string | number, AITool | null> = (toolId, hiddenError) => {
  return new Promise((resolve, reject) => {
    if (!toolId) {
      if (!hiddenError) yakitNotify('error', `获取AITool详情失败: id(${toolId})数据异常`)
      reject(new Error(`获取AITool详情失败: id(${toolId})数据异常`))
      return
    }
    const query: GetAIToolListRequest = {
      Query: '',
      ToolName: '',
      Pagination: genDefaultPagination(1),
      OnlyFavorites: false,
      ToolID: toolId,
    }
    ipc
      .invoke('grpc', 'GetAIToolList', query)
      .then((res) => {
        if (res && res.Tools && res.Tools.length > 0) {
          resolve(aiToolForUI(res.Tools[0]))
        } else {
          resolve(null)
        }
      })
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetAIToolByName 失败:' + err)
        reject(err)
      })
  })
}

export const grpcToggleAIToolFavorite: APIFunc<ToggleAIToolFavoriteRequest, GrpcOutput<'ToggleAIToolFavorite'>> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'ToggleAIToolFavorite', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcToggleAIToolFavorite 失败:' + err)
        reject(err)
      })
  })
}

export const grpcDeleteAITool: APIFunc<DeleteAIToolRequest, GrpcOutput<'DeleteAITool'>> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteAITool', { ...params, ToolNames: params.ToolNames ? [params.ToolNames] : [] })
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcDeleteAITool 失败:' + err)
        reject(err)
      })
  })
}
