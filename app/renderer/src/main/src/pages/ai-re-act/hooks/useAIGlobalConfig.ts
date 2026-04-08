import { useCreation, useMemoizedFn } from 'ahooks'
import { useEffect, useRef, useState } from 'react'
import { AIGlobalConfig, grpcGetAIGlobalConfig, grpcSetAIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { shallow } from 'zustand/shallow'

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
  /** 设置 */
  setAIGlobalConfig: (data: Partial<AIGlobalConfig>) => Promise<void>
  /** 获取最新的值,不会设置全局变量中的值,会设置ref */
  getLastAIGlobalConfig: () => Promise<AIGlobalConfig>
}
function useAIGlobalConfig(): [UseAIGlobalConfigData, UseAIGlobalConfigEvents]

function useAIGlobalConfig() {
  const { aiGlobalConfig, isInit, setConfig } = useAIGlobalConfigStore(
    (s) => ({
      isInit: s.isInit,
      setConfig: s.setAIGlobalConfig,
      aiGlobalConfig: s.aiGlobalConfig,
    }),
    shallow,
  )
  const [queryLoading, setQueryLoading] = useState<boolean>(false)
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
          setConfig(config)
          getAIGlobalConfig()
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
          aiGlobalConfigRef.current = res
          resolve(res)
        })
        .catch(reject)
    })
  })
  const data: UseAIGlobalConfigData = useCreation(() => {
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
    }
  }, [])

  return [data, event] as const
}

export default useAIGlobalConfig
