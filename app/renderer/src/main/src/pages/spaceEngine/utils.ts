import { int64ToSafeNumber } from '@/utils/int64'
import type { GrpcOutput } from '@/services/ipc'
import { ipc } from '@/services/ipc'
import type { APINoRequestFunc } from '@/apiUtils/type'
import type {
  GlobalNetworkConfig,
  HandleAIConfigProps,
  ThirdPartyApplicationConfig,
} from '@/components/configNetwork/ConfigNetworkPage'
import type { GetThirdPartyAppConfigTemplateResponse } from '@/components/configNetwork/NewThirdPartyApplicationConfig'
import type { SpaceEngineStartParams, SpaceEngineStatus } from '@/models/SpaceEngine'
import type { PcapMetadata } from '@/models/Traffic'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'

const tOriginal = i18n.getFixedT(null, 'spaceEngine')
export interface GetSpaceEngineStatusProps {
  Type: string
}
/**
 * @description 获取空间引擎状态
 */
export const apiGetSpaceEngineStatus: (params: GetSpaceEngineStatusProps) => Promise<SpaceEngineStatus> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetSpaceEngineStatus', { ...params })
      .then((res) => resolve({ ...res, Used: int64ToSafeNumber(res.Used), Remain: int64ToSafeNumber(res.Remain) }))
      .catch((e: any) => {
        yakitNotify('error', tOriginal('SpaceEnginePage.getSpaceEngineError') + e)
        reject(e)
      })
  })
}
/**
 * @description 校验引擎状态，根据前端传的值
 */
export const apiGetSpaceEngineAccountStatus: (params: ThirdPartyApplicationConfig) => Promise<SpaceEngineStatus> = (
  params,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetSpaceEngineAccountStatusV2', { ...params })
      .then((res) => resolve({ ...res, Used: int64ToSafeNumber(res.Used), Remain: int64ToSafeNumber(res.Remain) }))
      .catch((e: any) => {
        yakitNotify('error', tOriginal('SpaceEnginePage.verifyEngineFailed') + e)
        reject(e)
      })
  })
}
/** Translate only numeric form controls; wire IDs remain decimal strings. */
export const networkConfigForUI = (value: GrpcOutput<'GetGlobalNetworkConfig'>): GlobalNetworkConfig => ({
  ...value,
  MinTlsVersion: int64ToSafeNumber(value.MinTlsVersion),
  MaxTlsVersion: int64ToSafeNumber(value.MaxTlsVersion),
  AppConfigs: value.AppConfigs.map((config) => ({
    ...config,
    MaxTokens: config.MaxTokens === undefined ? undefined : int64ToSafeNumber(config.MaxTokens),
    TopK: config.TopK === undefined ? undefined : int64ToSafeNumber(config.TopK),
  })),
})

/**获取全局配置 */
export const apiGetGlobalNetworkConfig = async (): Promise<GlobalNetworkConfig> => {
  try {
    return networkConfigForUI(await ipc.invoke('grpc', 'GetGlobalNetworkConfig', {}))
  } catch (error) {
    yakitNotify('error', tOriginal('SpaceEnginePage.getGlobalNetworkConfigError') + error)
    throw error
  }
}

/**设置全局配置；RPC 返回 Empty，调用方通过 Promise 完成状态判断是否已保存。 */
export const apiSetGlobalNetworkConfig = async (params: GlobalNetworkConfig): Promise<void> => {
  try {
    await ipc.invoke('grpc', 'SetGlobalNetworkConfig', params)
  } catch (error) {
    yakitNotify('error', tOriginal('SpaceEnginePage.setGlobalNetworkConfigError') + error)
    throw error
  }
}

/**读取当前配置后更新指定字段 */
export const apiUpdateGlobalNetworkConfig = async (params: Partial<GlobalNetworkConfig>): Promise<void> => {
  const config = await apiGetGlobalNetworkConfig()
  await apiSetGlobalNetworkConfig({ ...config, ...params })
}

/** 获取第三方应用配置模板 */
export const apiGetThirdPartyAppConfigTemplate: APINoRequestFunc<GetThirdPartyAppConfigTemplateResponse> = (
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetThirdPartyAppConfigTemplate', {})
      .then(resolve)
      .catch((e) => {
        if (hiddenError) yakitNotify('error', tOriginal('SpaceEnginePage.getThirdPartyAppConfigTemplateError') + e)
        reject(e)
      })
  })
}

/**
 *@description 传入第三方配置和ai排序，得到最新的数据
 * @param {HandleAIConfigProps} config
 * @param {HandleAIConfigProps} data
 * @returns {HandleAIConfigProps|null} 全局配置
 */
export const handleAIConfig = (
  config: HandleAIConfigProps,
  data: ThirdPartyApplicationConfig,
): HandleAIConfigProps | null => {
  if (!config || !data) return null
  const existedResult: ThirdPartyApplicationConfig[] = config?.AppConfigs || []
  let newAiApiPriority: string[] = config?.AiApiPriority || []
  const index = (config?.AppConfigs || []).findIndex((i) => i.Type === data.Type)
  if (index === -1) {
    existedResult.push(data)
    const existedAIPriority = existedResult.map((i) => i.Type)
    const setAIPriority: string[] = []
    const noSetAIPriority: string[] = []
    config?.AiApiPriority.forEach((ele) => {
      if (existedAIPriority.includes(ele)) {
        setAIPriority.push(ele)
      } else {
        noSetAIPriority.push(ele)
      }
    })
    newAiApiPriority = [...setAIPriority, ...noSetAIPriority]
  } else {
    existedResult[index] = {
      ...existedResult[index],
      ...data,
    }
  }
  const params: HandleAIConfigProps = {
    AppConfigs: existedResult,
    AiApiPriority: newAiApiPriority,
  }
  return params
}
/** GetPcapMetadata */
export const apiGetPcapMetadata: () => Promise<PcapMetadata> = () => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetPcapMetadata', {})
      .then(resolve)
      .catch((e: any) => {
        yakitNotify('error', tOriginal('SpaceEnginePage.getPcapMetadataError') + e)
        reject(e)
      })
  })
}

/**
 * @description 空间引擎 执行接口
 */
export const apiFetchPortAssetFromSpaceEngine: (
  params: SpaceEngineStartParams,
  open: (params: import('@/services/ipc').GrpcInput<'FetchPortAssetFromSpaceEngine'>) => Promise<unknown>,
) => Promise<null> = (params, open) => {
  return new Promise((resolve, reject) => {
    console.log('准备发送到后端的参数:', { ...params })
    open({ ...params })
      .then(() => {
        yakitNotify('info', tOriginal('SpaceEnginePage.taskStartSuccessBrief'))
        resolve(null)
      })
      .catch((e: any) => {
        yakitNotify('error', tOriginal('SpaceEnginePage.executeError') + e)
        reject(e)
      })
  })
}
