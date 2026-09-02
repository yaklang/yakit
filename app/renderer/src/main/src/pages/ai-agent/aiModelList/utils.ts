import type { APIFunc, APINoRequestFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import type {
  AddLocalModelRequest,
  ClearAllModelsRequest,
  DeleteLocalModelRequest,
  DownloadLocalModelRequest,
  GetAllStartedLocalModelsResponse,
  InstallLlamaServerRequest,
  IsLlamaServerReadyResponse,
  IsLocalModelReadyRequest,
  IsLocalModelReadyResponse,
  GeneralResponse,
  StartLocalModelRequest,
  UpdateLocalModelRequest,
  StartedLocalModelInfo,
  LocalModelConfig,
  StopLocalModelRequest,
  IsForcedSetAIModalRequest,
  GetAIModelAvailableTotalResponse,
} from '../type/aiModel'
import omit from 'lodash/omit'
import type { ThirdPartyApplicationConfig } from '@/components/configNetwork/ConfigNetworkPage'
import type { KVPair } from '@/models/kv'
import { genDefaultPagination, type PaginationSchema } from '@/pages/invoker/schema'
import type { GetThirdPartyAppConfigTemplateResponse } from '@/components/configNetwork/NewThirdPartyApplicationConfig'
import { type AIModelPolicyEnum, defaultAIGlobalConfig } from '../defaultConstant'
import type { TFunction } from '@/i18n/useI18nNamespaces'
export { AI_API_TYPE_OPTIONS, DEFAULT_AI_API_TYPE, normalizeAIAPIType, type AIAPIType } from './aiApiTypeOptions'
export { getModelName } from './modelName'

const { ipcRenderer } = window.require('electron')

/**
 * 模型名称是否是memfit开头
 */
export const isMemfitStart = (name: string) => {
  return name?.startsWith('memfit-')
}

/**
 * 模型名称列表展示排序：memfit- 开头的名称展示在前面，其余在后（稳定排序，组内保持原相对顺序）。
 * 供模型编辑表单与聊天模型选择器的模型名称下拉共用。
 */
export const sortMemfitNameFirst = (names: string[]): string[] => {
  // 单趟分拣，memfit 组在前、其余在后，组内保持原相对顺序
  const memfit: string[] = []
  const others: string[] = []
  for (const name of names) {
    if (isMemfitStart(name)) memfit.push(name)
    else others.push(name)
  }
  return [...memfit, ...others]
}

/**
 * 模型名称是否为 -free 结尾
 */
export const isFreeEnd = (name: string) => {
  return name?.endsWith('-free')
}

export const grpcGetSupportedLocalModels: APINoRequestFunc<LocalModelConfig[]> = (hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('GetSupportedLocalModels')
      .then((res) => {
        const models = res.Models || []
        resolve(models)
      })
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetSupportedLocalModels 失败:' + err)
        reject(err)
      })
  })
}

export const grpcIsLlamaServerReady: APINoRequestFunc<IsLlamaServerReadyResponse> = (hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('IsLlamaServerReady')
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcIsLlamaServerReady 失败:' + err)
        reject(err)
      })
  })
}

export const grpcInstallLlamaServer: APIFunc<InstallLlamaServerRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    const token = params.token
    const value = omit(params, 'token')
    ipcRenderer
      .invoke('InstallLlamaServer', value, token)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcInstallLlamaServer 失败:' + err)
        reject(err)
      })
  })
}
export const grpcDownloadLocalModel: APIFunc<DownloadLocalModelRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    const token = params.token
    const value = omit(params, 'token')
    ipcRenderer
      .invoke('DownloadLocalModel', value, token)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcDownloadLocalModel 失败:' + err)
        reject(err)
      })
  })
}
export const grpcCancelInstallLlamaServer: APIFunc<string, null> = (token, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('cancel-InstallLlamaServer', token)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcCancelInstallLlamaServer 失败:' + err)
        reject(err)
      })
  })
}

export const grpcCancelDownloadLocalModel: APIFunc<string, null> = (token, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('cancel-DownloadLocalModel', token)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcCancelDownloadLocalModel 失败:' + err)
        reject(err)
      })
  })
}

export const grpcIsLocalModelReady: APIFunc<IsLocalModelReadyRequest, IsLocalModelReadyResponse> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('IsLocalModelReady', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcIsLocalModelReady 失败:' + err)
        reject(err)
      })
  })
}

export const grpcStartLocalModel: APIFunc<StartLocalModelRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    const token = params.token
    const value = omit(params, 'token')
    ipcRenderer
      .invoke('StartLocalModel', value, token)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcStartLocalModel 失败:' + err)
        reject(err)
      })
  })
}

export const grpcCancelStartLocalModel: APIFunc<string, null> = (token, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('cancel-StartLocalModel', token)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcCancelStartLocalModel 失败:' + err)
        reject(err)
      })
  })
}

export const grpcStopLocalModel: APIFunc<StopLocalModelRequest, GeneralResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('StopLocalModel', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcStopLocalModel 失败:' + err)
        reject(err)
      })
  })
}

/**获取线上和本地已启动的AI模型 */
export const getAIModelAvailableInfo: APINoRequestFunc<GetAIModelAvailableTotalResponse> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    try {
      let onlineModelsTotal: number = 0
      const localModelsTotal: number = 0
      let onlineModels: AIGlobalConfig = { ...defaultAIGlobalConfig }
      const localModels: StartedLocalModelInfo[] = []
      const config = await grpcGetAIGlobalConfig()
      if (config) {
        const intelligentModelsTotal = config.IntelligentModels?.length || 0
        const lightweightModelsTotal = config.LightweightModels?.length || 0
        const visionModelsTotal = config.VisionModels?.length || 0
        onlineModelsTotal = intelligentModelsTotal + lightweightModelsTotal + visionModelsTotal

        onlineModels = config
      }
      // const localModelsRes = await grpcGetAllStartedLocalModels()
      // if (!!localModelsRes) {
      //     localModels = localModelsRes.Models.filter((ele) => ele.ModelType === AILocalModelTypeEnum.AIChat) || []
      // }
      resolve({ onlineModelsTotal, localModelsTotal, onlineModels, localModels })
    } catch (error) {
      if (!hiddenError) yakitNotify('error', 'getAIModelList 失败:' + error)
      reject(error)
    }
  })
}

/**新增本地AI Model */
export const grpcAddLocalModel: APIFunc<AddLocalModelRequest, GeneralResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('AddLocalModel', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcAddLocalModel 失败:' + err)
        reject(err)
      })
  })
}

/**删除本地AI Model */
export const grpcDeleteLocalModel: APIFunc<DeleteLocalModelRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('DeleteLocalModel', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcDeleteLocalModel 失败:' + err)
        reject(err)
      })
  })
}
/**更新本地AI Model */
export const grpcUpdateLocalModel: APIFunc<UpdateLocalModelRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('UpdateLocalModel', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcUpdateLocalModel 失败:' + err)
        reject(err)
      })
  })
}
/**获取所有启动的chat模型列表 */
export const grpcGetAllStartedLocalModels: APINoRequestFunc<GetAllStartedLocalModelsResponse> = (hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('GetAllStartedLocalModels')
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetAllStartedLocalModels 失败:' + err)
        reject(err)
      })
  })
}

/**ai 线上列表排序 */
export const reorderApplicationConfig = (list: ThirdPartyApplicationConfig[], startIndex: number, endIndex: number) => {
  const result = [...list]
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

/**清空本地ai model */
export const grpcClearAllModels: APIFunc<ClearAllModelsRequest, GeneralResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('ClearAllModels', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcClearAllModels 失败:' + err)
        reject(err)
      })
  })
}

const openedAIModalMap = new Map<string, boolean>()

export const isForcedSetAIModal: APIFunc<
  IsForcedSetAIModalRequest & { pageKey?: string; isOpen?: boolean; t?: TFunction },
  null
> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    const { noDataCall, haveDataCall, mountContainer = null, pageKey = 'global', isOpen = true, t } = params

    getAIModelAvailableInfo(hiddenError)
      .then((res) => {
        const noModel = res.localModelsTotal === 0 && res.onlineModelsTotal === 0
        if (noModel) {
          // 每个 tab / 页面只弹一次
          if (!openedAIModalMap.get(pageKey)) {
            openedAIModalMap.set(pageKey, true)
            isOpen &&
              t &&
              import('./aiModelSelect/AIModelSelect').then(({ onOpenConfigModal }) => {
                onOpenConfigModal(mountContainer, t)
              })
          }
          noDataCall?.(res)
        } else {
          haveDataCall?.(res)
        }

        resolve(null)
      })
      .catch(reject)
  })
}

// 配置成功 / 删除配置时调用
export const resetForcedAIModalFlag = (pageKey?: string) => {
  if (pageKey) {
    openedAIModalMap.delete(pageKey)
  } else {
    openedAIModalMap.clear()
  }
}
export interface ListAiModelResponse {
  ModelName: string[]
}
export interface ListAiModelRequest {
  Config: string
}
/**获取模型名称列表 */
export const grpcListAiModel: APIFunc<ListAiModelRequest, ListAiModelResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('ListAiModel', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcListAiModel 失败:' + err)
        reject(err)
      })
  })
}
export interface AIGlobalConfig {
  Enabled: boolean
  /**调用模式 */
  RoutingPolicy: AIModelPolicyEnum
  /**禁用降级轻量模型 */
  DisableFallback: boolean
  DefaultModelId: string
  GlobalWeight: number
  /**高质模型 */
  IntelligentModels: AIModelConfig[]
  /**轻量模型 */
  LightweightModels: AIModelConfig[]
  /**视觉模式 */
  VisionModels: AIModelConfig[]
  /**ai 全局命令 */
  AIPresetPrompt: string
  /** 自定义 plan 提示词 */
  AIPlanPrompt: string
}
export type AIModelTypeFileName = keyof Pick<AIGlobalConfig, 'IntelligentModels' | 'LightweightModels' | 'VisionModels'>
export interface AIModelConfig {
  ProviderId: string
  Provider: ThirdPartyApplicationConfig
  ModelName: string
  ExtraParams: KVPair[]
  IsOnline?: boolean
  /**探测到的扩展思考强度（如 ["xhigh","max"]）；为空且 EffortProbed=true 表示探测过但不支持 */
  ProbedExtendedEfforts?: string[]
  /**是否已对 xhigh/max 做过探测 */
  EffortProbed?: boolean
}

export interface ServerAIGlobalConfig {
  IntelligentModels?: AIModelConfig[]
  LightweightModels?: AIModelConfig[]
  VisionModels?: AIModelConfig[]
}

/**获取ai 全局配置 */
export const grpcGetAIGlobalConfig: APINoRequestFunc<AIGlobalConfig> = (hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('GetAIGlobalConfig')
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetAIGlobalConfig 失败:' + err)
        reject(err)
      })
  })
}

/**设置ai 全局配置 */
export const grpcSetAIGlobalConfig: APIFunc<AIGlobalConfig, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('SetAIGlobalConfig', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcSetAIGlobalConfig 失败:' + err)
        reject(err)
      })
  })
}

export interface QueryAIProvidersResponse {
  Pagination: PaginationSchema
  Providers: AIProvider[]
  Total: number
}
export interface AIProvider {
  Id: string
  Config: ThirdPartyApplicationConfig
}
export interface QueryAIProvidersRequest {
  Filter?: AIProviderFilter
  Pagination?: PaginationSchema
}
export interface AIProviderFilter {
  Ids?: string[]
  AIType: string[]
}
const grpcQueryAIProvider: APIFunc<QueryAIProvidersRequest, QueryAIProvidersResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('QueryAIProvider', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcQueryAIProvider 失败:' + err)
        reject(err)
      })
  })
}
export const grpcQueryAIProviderAll: APIFunc<string, QueryAIProvidersResponse> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    if (!params) {
      reject('AIType 不能为空')
      return
    }
    const query: QueryAIProvidersRequest = {
      Filter: {
        AIType: [params],
      },
      Pagination: {
        ...genDefaultPagination(-1),
      },
    }
    grpcQueryAIProvider(query, hiddenError)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcQueryAIProviderAll 失败:' + err)
        reject(err)
      })
  })
}

export const grpcGetAIThirdPartyAppConfigTemplate: APINoRequestFunc<GetThirdPartyAppConfigTemplateResponse> = (
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('GetAIThirdPartyAppConfigTemplate')
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetAIThirdPartyAppConfigTemplate 失败:' + err)
        reject(err)
      })
  })
}

export interface AIConfigHealthCheckRequest {
  Config: ThirdPartyApplicationConfig
  Content: string
}

export interface AIConfigHealthCheckResponse {
  FirstByteCostMs: number
  TotalCostMs: number
  RawRequest: string
  ResponseStatusCode: number
  ResponseContent: string
  ErrorMessage: string
  RawResponse: string
  RecommendConfig: ThirdPartyApplicationConfig
  Success: boolean
}

export const grpcAIConfigHealthCheck: APIFunc<AIConfigHealthCheckRequest, AIConfigHealthCheckResponse> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('AIConfigHealthCheck', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcAIConfigHealthCheck 失败:' + err)
        reject(err)
      })
  })
}

export interface ProbeReasoningEffortRequest {
  Config: ThirdPartyApplicationConfig
  Model: string
}

export interface ProbeReasoningEffortResponse {
  XhighSupported: boolean
  MaxSupported: boolean
  XhighErrorMessage: string
  MaxErrorMessage: string
}

/**探测模型是否支持 xhigh/max 扩展思考强度 */
export const grpcProbeReasoningEffort: APIFunc<ProbeReasoningEffortRequest, ProbeReasoningEffortResponse> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('ProbeReasoningEffort', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcProbeReasoningEffort 失败:' + err)
        reject(err)
      })
  })
}
