import { useEffect, useMemo, useState } from "react"
import { useMemoizedFn } from "ahooks"
import { randomString } from "@/utils/randomUtil"
import { GlobalProxyRulesConfig, grpcGetGlobalProxyRulesConfig, grpcSetGlobalProxyRulesConfig } from "@/apiUtils/grpc"

// 全局配置缓存
let globalProxyConfig: GlobalProxyRulesConfig = { Endpoints: [], Routes: [] }
// 订阅回调列表
const subscribers: Set<() => void> = new Set()

// 更新全局配置并通知所有订阅者
const updateGlobalConfig = (config: GlobalProxyRulesConfig) => {
  globalProxyConfig = config
  subscribers.forEach(cb => cb())
}

/**
 * 获取代理配置的hook
 * 返回 proxyRouteOptions proxyConfig saveProxyConfig checkProxyEndpoints使用
 */
export const useProxy = () => {
  const [proxyConfig, setProxyConfig] = useState<GlobalProxyRulesConfig>(globalProxyConfig)

  // 订阅全局配置变化
  useEffect(() => {
    const handleUpdate = () => {
      setProxyConfig(globalProxyConfig)
    }
    subscribers.add(handleUpdate)
    return () => {
      subscribers.delete(handleUpdate)
    }
  }, [])

  /**
   * 查找节点返回对应的Url 有些可能是新增Url就是他的Id
   * @param findKey pointId
   * @returns string 
   */
  const comparePointUrl = useMemoizedFn((findKey) => {
    const findPoint = proxyConfig.Endpoints.find(({ Id }) => Id === findKey)
    if (!!findPoint) {
      const { Url, UserName, Password } = findPoint
      if (UserName && Password) {
        const protocolMatch = Url.match(/^(https?:\/\/)(.*)$/)
        if (protocolMatch) {
          const protocol = protocolMatch[1]
          const domain = protocolMatch[2]
          return `${protocol}${UserName}:${Password}@${domain}`
        }
      }
      return Url
    } else {
      return findKey
    }
  })

  /**
   * 找出对应的节点（节点已经从id转成url）和规则
   * @param selection  string[]
   * @returns { proxyEndpoints:string  ProxyRuleIds: string }
   */
  const getProxyValue = useMemoizedFn((selection) => {
    const normalizedSelection = selection.map((item) => `${item}`.trim()).filter((item) => item.length > 0)
    const proxyEndpoints = normalizedSelection.filter((item) => !item.startsWith('route'))
      .map((value) => comparePointUrl(value)).join(',')
    const ProxyRuleIds = normalizedSelection.filter((item) => item.startsWith('route')).join(',')

    return {
      proxyEndpoints,
      ProxyRuleIds
    }
  })

  /**
   * 代理下拉框 区分规则组和代理节点
   * @returns Array<{ label, value }>: 
   */
  const proxyRouteOptions = useMemo(() => {
    const { Routes = [], Endpoints = [] } = proxyConfig
    return [
      ...Routes.map(({ Name, Id }) => ({
        label: `规则组: ${Name}`,
        value: Id
      })),
      ...Endpoints.map(({ Url, Id, }) => ({
        label: `代理节点: ${Url}`,
        value: Id
      }))
    ]
  }, [proxyConfig])

  /**
   * 获取代理配置
   */
  const fetchProxyConfig = useMemoizedFn(async () => {
    const config = await grpcGetGlobalProxyRulesConfig()
    if (config) {
      updateGlobalConfig(config)
    }
  })

  /**
   * 修改代理配置
   * @param config 代理配置
   * @param cb 完成回调(可选)
   */
  const saveProxyConfig = useMemoizedFn(async (config: GlobalProxyRulesConfig, cb?: () => void) => {
    await grpcSetGlobalProxyRulesConfig(config)
    fetchProxyConfig()
    cb?.()
  })

  /**
   * 检查是否有新增代理节点 如果有新增的代理配置 则存配置项
   * @param proxy 代理配置数组
   */
  const checkProxyEndpoints = useMemoizedFn((proxy?: string[]) => {
    if (!proxy?.length) return
    const newEndpoints = proxy.filter((item) => !item.startsWith('route') && proxyConfig.Endpoints.every(({ Id, Url }) => ![Id, Url].includes(item)))
    if (newEndpoints.length) {
      const config = {
        ...proxyConfig,
        Endpoints: [
          ...proxyConfig.Endpoints,
          ...newEndpoints.map((Url) => ({ Name: Url, Url, Id: `ep-${randomString(8)}`, UserName: '', Password: '' }))
        ]
      }
      saveProxyConfig(config)
    }
  })

  useEffect(() => {
    fetchProxyConfig()
  }, [])

  return {
    proxyRouteOptions,
    getProxyValue,
    proxyConfig,
    comparePointUrl,
    saveProxyConfig,
    checkProxyEndpoints
  }
}


