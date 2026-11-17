import { useCreation, useMemoizedFn } from 'ahooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type AIGlobalConfig,
  type ServerAIGlobalConfig,
  grpcGetAIGlobalConfig,
  grpcSetAIGlobalConfig,
} from '@/pages/ai-agent/aiModelList/utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { AIModelTypeInterFileNameEnum } from '@/pages/ai-agent/defaultConstant'
import { shallow } from 'zustand/shallow'
import { cloneDeep } from 'lodash'
import type { API } from '@/services/swagger/resposeType'

/** 与 getFileNameByModelType 对应的配置字段；直接用常量避免动态 import 整份 AIModelForm */
const AI_MODEL_CONFIG_KEYS = [
  AIModelTypeInterFileNameEnum.IntelligentModels,
  AIModelTypeInterFileNameEnum.LightweightModels,
  AIModelTypeInterFileNameEnum.VisionModels,
] as const

let saveQueue: Promise<unknown> = Promise.resolve()
let saveEpoch = 0
let onlineSyncEpoch = 0
let onlineModelsRevision = 0

/** int64/double 为空字符串时，SetAIGlobalConfig 无法序列化 */
const fixEmptyNumber = (config: AIGlobalConfig): AIGlobalConfig => {
  const next = cloneDeep(config)
  next.GlobalWeight = next.GlobalWeight || 0
  const numberFields = ['MaxTokens', 'Temperature', 'TopP', 'TopK', 'FrequencyPenalty'] as const
  for (const key of AI_MODEL_CONFIG_KEYS) {
    next[key] = (next[key] || []).map((model) => {
      const provider = model.Provider ? { ...model.Provider } : model.Provider
      if (provider) {
        for (const field of numberFields) {
          if ((provider[field] as unknown) === '') delete provider[field]
        }
      }
      return {
        ...model,
        ProviderId: model.ProviderId || '0',
        Provider: provider,
        ExtraParams: model.ExtraParams || [],
      }
    })
  }
  return next
}

/** All online-model writes share the local settings queue, including logout. */
const replaceOnlineAIModels = (
  data: API.SystemConfigList[],
  isCurrent: () => boolean,
  previousOrder?: AIGlobalConfig,
) => {
  const epoch = ++saveEpoch
  const task = saveQueue.then(async () => {
    if (!isCurrent()) return
    const current = await grpcGetAIGlobalConfig()
    if (!isCurrent()) return
    const aiConfig = data.find((item) => item.configName === 'AI')
    const server: ServerAIGlobalConfig & { Enabled?: boolean } =
      aiConfig?.isOpen && aiConfig.content ? JSON.parse(aiConfig.content) : {}
    if (!server || typeof server !== 'object' || Array.isArray(server)) throw new Error('Invalid enterprise AI config')
    const next = cloneDeep(current)
    for (const key of AI_MODEL_CONFIG_KEYS) {
      const models = server.Enabled === false ? [] : server[key] || []
      if (!Array.isArray(models)) throw new Error('Invalid enterprise AI model list')
      for (const model of models) {
        if (!model?.Provider || !model.ModelName) throw new Error('Invalid enterprise AI model')
        if (
          model.Provider.Headers?.some(
            (header) =>
              header.Value?.includes('{{user.') ||
              ('ValueSource' in header && header.ValueSource && header.ValueSource !== 'static'),
          )
        ) {
          throw new Error('企业模型 Header 尚未解析，请升级企业服务端 / unresolved enterprise AI header')
        }
      }
      const available = [
        ...(current[key] || []).filter((model) => !model.IsOnline),
        // Web provider IDs are not local engine IDs and may be non-numeric.
        ...models.map((model) => ({ ...model, ProviderId: '0', IsOnline: true })),
      ]
      // Preserve routing priority while replacing the old user's provider values.
      const ordered = (previousOrder?.[key] || current[key] || []).flatMap((old) => {
        const index = available.findIndex(
          (model) => model.ModelName === old.ModelName && !!model.IsOnline === !!old.IsOnline,
        )
        return index < 0 ? [] : available.splice(index, 1)
      })
      next[key] = [...ordered, ...available]
    }
    if (!isCurrent()) return
    const snapshot = fixEmptyNumber(next)
    await grpcSetAIGlobalConfig(snapshot)
    ++onlineModelsRevision
    if (isCurrent() && epoch === saveEpoch) useAIGlobalConfigStore.getState().setAIGlobalConfig(snapshot)
    return current
  })
  saveQueue = task.catch(() => undefined)
  return task
}

/** Invalidate outstanding downloads before clearing persisted user-specific models. */
export const clearOnlineAIGlobalConfig = () => {
  ++onlineSyncEpoch
  return replaceOnlineAIModels([], () => true)
}

/** Downloads are session-scoped: a response arriving after logout must never be applied. */
export const syncOnlineAIGlobalConfig = async (
  fetchConfig: () => Promise<API.SystemConfigResponse>,
  isSameSession: () => boolean,
): Promise<API.SystemConfigList[] | undefined> => {
  const epoch = ++onlineSyncEpoch
  const isCurrent = () => epoch === onlineSyncEpoch && isSameSession()
  try {
    const previous = await replaceOnlineAIModels([], isCurrent)
    if (!isCurrent()) return
    const response = await fetchConfig()
    if (!isCurrent()) return
    const data = response.data || []
    await replaceOnlineAIModels(data, isCurrent, previous)
    return isCurrent() ? data : undefined
  } catch (error) {
    if (isCurrent()) throw error
  }
}

interface UseAIGlobalConfigData {
  aiGlobalConfig: AIGlobalConfig
  queryLoading: boolean
  updateLoading: boolean
  aiGlobalConfigRef: React.MutableRefObject<AIGlobalConfig | undefined>
  /** 模型总数 */
  total: number
}
interface UseAIGlobalConfigEvents {
  /** 刷新，会设置全局变量中的值和ref */
  onRefresh: (isShowLoading?: boolean) => void
  /** 设置到数据库和全局变量中 */
  setAIGlobalConfig: (data: Partial<AIGlobalConfig>) => Promise<void>
  /** 获取最新的值,不会设置全局变量中的值,会设置ref */
  getLastAIGlobalConfig: () => Promise<AIGlobalConfig>
  /** 设置到全局变量中 */
  setConfigStore: (data: AIGlobalConfig) => void
}
interface UseAIGlobalConfigParams {
  isShowLoading?: boolean
}
function useAIGlobalConfig(params?: UseAIGlobalConfigParams): [UseAIGlobalConfigData, UseAIGlobalConfigEvents]

/** TODO - 待优化:每次使用这个hooks都会刷新一下数据 */
function useAIGlobalConfig(params) {
  const { isShowLoading } = params || {}
  const { aiGlobalConfig, isInit, setConfig, setQueryLoading, queryLoading } = useAIGlobalConfigStore(
    (s) => ({
      isInit: s.isInit,
      setConfig: s.setAIGlobalConfig,
      aiGlobalConfig: s.aiGlobalConfig,
      queryLoading: s.queryLoading, // 提升到全局，是为了避免外界父组件调用子组件的刷新，拿不到最新的loading
      setQueryLoading: s.setQueryLoading,
    }),
    shallow,
  )
  const [updateLoading, setUpdateLoading] = useState<boolean>(false)
  const [total, setTotal] = useState<number>(0)

  const aiGlobalConfigRef = useRef<AIGlobalConfig>()

  useEffect(() => {
    isInit && getAIGlobalConfig(isShowLoading !== false)
  }, [isInit])
  /** 刷新，会设置全局变量中的值和ref */
  const applyFetchedConfig = useMemoizedFn((res: AIGlobalConfig, applyEpoch?: number) => {
    if (applyEpoch !== undefined && applyEpoch !== saveEpoch) return
    setConfig(res)
    aiGlobalConfigRef.current = res
    setTotal(
      (res.IntelligentModels?.length || 0) + (res.LightweightModels?.length || 0) + (res.VisionModels?.length || 0),
    )
  })

  const getAIGlobalConfig = useMemoizedFn((isShowLoading?: boolean) => {
    const epoch = saveEpoch
    const showLoading = isShowLoading !== false
    showLoading && setQueryLoading(true)
    // 刷新在保存期间触发时，先等当前写入完成，避免读到旧数据库配置。
    saveQueue
      .then(() => grpcGetAIGlobalConfig())
      .then((res) => applyFetchedConfig(res, epoch))
      .catch(() => undefined)
      .finally(() => {
        showLoading &&
          setTimeout(() => {
            setQueryLoading(false)
          }, 200)
      })
  })

  const setAIGlobalConfig = useMemoizedFn(async (data: Partial<AIGlobalConfig>): Promise<void> => {
    const epoch = ++saveEpoch
    const onlineRevision = onlineModelsRevision
    const next: AIGlobalConfig = {
      ...useAIGlobalConfigStore.getState().aiGlobalConfig,
      ...data,
    }
    let snapshot = fixEmptyNumber(next)
    aiGlobalConfigRef.current = snapshot
    setConfig(snapshot)
    setUpdateLoading(true)

    const task = saveQueue.then(async () => {
      // A queued settings save may have captured the previous account's models.
      // Retain the latest downloaded identity if an online write completed first.
      if (onlineRevision !== onlineModelsRevision) {
        snapshot = cloneDeep(snapshot)
        const current = await grpcGetAIGlobalConfig()
        for (const key of AI_MODEL_CONFIG_KEYS) {
          const available = [
            ...(snapshot[key] || []).filter((model) => !model.IsOnline),
            ...(current[key] || []).filter((model) => model.IsOnline),
          ]
          const ordered = (snapshot[key] || []).flatMap((old) => {
            const index = available.findIndex(
              (model) => model.ModelName === old.ModelName && !!model.IsOnline === !!old.IsOnline,
            )
            return index < 0 ? [] : available.splice(index, 1)
          })
          snapshot[key] = [...ordered, ...available]
        }
      }
      await grpcSetAIGlobalConfig(snapshot)
      if (epoch === saveEpoch) applyFetchedConfig(snapshot, epoch)
    })
    saveQueue = task.catch(() => undefined)
    try {
      await task
    } catch (err) {
      if (epoch === saveEpoch) {
        grpcGetAIGlobalConfig()
          .then((res) => applyFetchedConfig(res, epoch))
          .catch(() => undefined)
      }
      throw err
    } finally {
      setTimeout(() => {
        setUpdateLoading(false)
      }, 200)
    }
  })

  /** 获取最新的值,不会设置全局变量中的值,会设置ref */
  const getLastAIGlobalConfig = useMemoizedFn(() => {
    return new Promise<AIGlobalConfig>((resolve, reject) => {
      grpcGetAIGlobalConfig()
        .then((res) => {
          aiGlobalConfigRef.current = cloneDeep(res)
          resolve(res)
        })
        .catch(reject)
    })
  })

  /** 设置到全局变量中 */
  const setConfigStore = useMemoizedFn((data: AIGlobalConfig) => {
    setConfig(data)
    aiGlobalConfigRef.current = cloneDeep(data)
  })

  const data: UseAIGlobalConfigData = useMemo(() => {
    return {
      aiGlobalConfig,
      queryLoading,
      updateLoading,
      aiGlobalConfigRef,
      total,
    }
  }, [aiGlobalConfig, queryLoading, updateLoading, aiGlobalConfigRef, total])

  const event: UseAIGlobalConfigEvents = useCreation(() => {
    return {
      onRefresh: (isShowLoading) => getAIGlobalConfig(isShowLoading),
      setAIGlobalConfig: (res) => setAIGlobalConfig(res),
      getLastAIGlobalConfig: () => getLastAIGlobalConfig(),
      setConfigStore: (res) => setConfigStore(res),
    }
  }, [])

  return [data, event] as const
}

export default useAIGlobalConfig
