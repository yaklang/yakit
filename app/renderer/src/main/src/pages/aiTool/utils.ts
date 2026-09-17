import { aiToolForUI } from '../ai-agent/grpcAdapters'
import { ipc } from '@/services/ipc'
import type { APIFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import type { DbOperateMessage } from '../layout/mainOperatorContent/utils'
import type {
  AITool,
  AIToolGenerateMetadataRequest,
  AIToolGenerateMetadataResponse,
  SaveAIToolRequest,
  SaveAIToolV2Response,
  UpdateAIToolRequest,
} from '../ai-agent/type/aiTool'
export const isAITool = (value: AITool | DbOperateMessage): value is AITool => {
  return 'ID' in value
}

export const grpcSaveAITool: APIFunc<SaveAIToolRequest, AITool> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'SaveAIToolV2', params)
      .then((res) => {
        if (res.IsSuccess && res.AITool) {
          resolve(aiToolForUI(res.AITool))
        } else {
          if (!hiddenError) yakitNotify('error', 'grpcSaveAITool 失败: ' + res.Message)
          reject(res.Message)
        }
      })
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcSaveAITool 失败:' + err)
        reject(err)
      })
  })
}

export const grpcUpdateAITool: APIFunc<UpdateAIToolRequest, DbOperateMessage> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'UpdateAITool', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcUpdateAITool 失败:' + err)
        reject(err)
      })
  })
}

export const grpcAIToolGenerateMetadata: APIFunc<AIToolGenerateMetadataRequest, AIToolGenerateMetadataResponse> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'AIToolGenerateMetadata', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcAIToolGenerateMetadata 失败:' + err)
        reject(err)
      })
  })
}

export const grpcAIToolGenerateDescription: APIFunc<AIToolGenerateMetadataRequest, string> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    grpcAIToolGenerateMetadata(params)
      .then((response) => {
        resolve(response.Description || '')
      })
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcAIToolGenerateDescription 失败:' + err)
        reject(err)
      })
  })
}

export const grpcAIToolGenerateKeywords: APIFunc<AIToolGenerateMetadataRequest, string[]> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    grpcAIToolGenerateMetadata(params)
      .then((response) => {
        resolve(response.Keywords || [])
      })
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcAIToolGenerateKeywords 失败:' + err)
        reject(err)
      })
  })
}
