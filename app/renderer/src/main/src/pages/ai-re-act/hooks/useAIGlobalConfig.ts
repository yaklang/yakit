import { useCreation, useMemoizedFn } from 'ahooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AIGlobalConfig, grpcGetAIGlobalConfig, grpcSetAIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { shallow } from 'zustand/shallow'
import { cloneDeep } from 'lodash'

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
function useAIGlobalConfig(): [UseAIGlobalConfigData, UseAIGlobalConfigEvents]

function useAIGlobalConfig() {
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
    isInit && getAIGlobalConfig()
  }, [isInit])
  /** 刷新，会设置全局变量中的值和ref */
  const getAIGlobalConfig = useMemoizedFn((isShowLoading?: boolean) => {
    const showLoading = isShowLoading !== false
    showLoading && setQueryLoading(true)
    grpcGetAIGlobalConfig()
      .then((res) => {
        setConfig(res)
        aiGlobalConfigRef.current = res
        const total =
          (res.IntelligentModels?.length || 0) + (res.LightweightModels?.length || 0) + (res.VisionModels?.length || 0)
        setTotal(total)
      })
      .finally(() => {
        showLoading &&
          setTimeout(() => {
            setQueryLoading(false)
          }, 200)
      })
  })

  const setAIGlobalConfig = useMemoizedFn((data: Partial<AIGlobalConfig>) => {
    return new Promise<void>((resolve, reject) => {
      const config: AIGlobalConfig = {
        ...aiGlobalConfig,
        ...data,
      }
      setUpdateLoading(true)
      grpcSetAIGlobalConfig(config)
        .then(() => {
          aiGlobalConfigRef.current = cloneDeep(config)
          setConfig({ ...config })
          getAIGlobalConfig(false)
          resolve()
        })
        .catch(reject)
        .finally(() => {
          setTimeout(() => {
            setUpdateLoading(false)
          }, 200)
        })
    })
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
