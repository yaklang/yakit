import { useEffect, useMemo, useState } from "react"
import { useMemoizedFn } from "ahooks"
import { randomString } from "@/utils/randomUtil"
import { GlobalProxyRulesConfig, grpcGetGlobalProxyRulesConfig, grpcSetGlobalProxyRulesConfig } from "@/apiUtils/grpc"
import { useI18nNamespaces } from "@/i18n/useI18nNamespaces"

/** @name 代理下拉选项类型 */
export interface ProxyOption {
  /** 显示标签 */
  label: string
  /** 选项值（规则组ID或代理节点ID/URL） */
  value: string
  /** 是否禁用 */
  disabled?: boolean
}

/** @name 解析URL返回结果类型 */
interface ParsedUrlResult {
  /** 解析后的URL */
  Url: string
  /** 用户名 */
  UserName: string
  /** 密码 */
  Password: string
}

/** @name 代理配置值类型 */
export interface ProxyValue {
  /** 代理节点URL列表（逗号分隔） */
  proxyEndpoints: string
  /** 代理规则ID列表（逗号分隔） */
  ProxyRuleIds: string
}

/** @name useProxy Hook 返回值类型 */
export interface UseProxyReturn {
  /** 代理路由下拉选项（包含规则组和代理节点） */
  proxyRouteOptions: ProxyOption[]
  /** 根据选择获取代理配置值 */
  getProxyValue: (selection: string[]) => ProxyValue
  /** 当前代理配置 */
  proxyConfig: GlobalProxyRulesConfig
  /** 比较并返回节点URL */
  comparePointUrl: (findKey: string) => string
  /** 保存代理配置 */
  saveProxyConfig: (config: GlobalProxyRulesConfig, cb?: () => void) => Promise<void>
  /** 检查并添加新的代理节点 */
  checkProxyEndpoints: (proxy?: string[]) => void
  /** 代理节点下拉选项（仅代理节点） */
  proxyPointsOptions: ProxyOption[]
}

// 全局配置缓存
let globalProxyConfig: GlobalProxyRulesConfig = { Endpoints: [], Routes: [] }
// 订阅回调列表
const subscribers: Set<() => void> = new Set()
// 请求缓存：防止重复请求
let fetchPromise: Promise<void> | null = null
// 是否已初始化
let isInitialized = false

/**
 * @name 更新全局配置并通知所有订阅者
 * @param config 新的代理配置
 */
const updateGlobalConfig = (config: GlobalProxyRulesConfig): void => {
  globalProxyConfig = config
  isInitialized = true
  subscribers.forEach(cb => cb())
}

/**
 * @name 使用 URL 对象解析URL
 * @description 解析代理URL，提取协议、用户名、密码等信息
 * @param url 待解析的URL字符串
 * @returns 包含解析后的URL、用户名和密码的对象
 */
export const parseUrl = (url: string): ParsedUrlResult => {
  try {
    const { username = '', password = '', protocol = '', host = '', pathname = '', search = '', hash = '' } = new URL(url)
    const path = pathname === '/' ? '' : pathname, 
      isSocks = protocol.includes('socks4') || protocol.includes("socks5")
    const Url = isSocks ? `${protocol}${path}${search}${hash}` : `${protocol}//${host}${path}${search}${hash}`
    return { Url, UserName: username, Password: password }
  } catch (error) {
    // 如果解析失败，返回原始 URL 和空的用户名密码
    return { Url: url, UserName: '', Password: '' }
  }
}

/**
 * @name 代理配置管理Hook
 * @description 用于管理全局代理配置，包括代理节点和规则组的增删改查
 * @returns {UseProxyReturn} 包含代理配置相关的状态和方法
 */
export const useProxy = (): UseProxyReturn => {
  const [proxyConfig, setProxyConfig] = useState<GlobalProxyRulesConfig>(globalProxyConfig)
  const { t, i18n } = useI18nNamespaces(["mitm"])

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
   * @name 查找节点返回对应的URL
   * @description 根据节点ID查找对应的代理URL，如果包含认证信息则拼接用户名密码
   * @param findKey 节点ID或URL
   * @returns {string} 完整的代理URL（可能包含认证信息）
   */
  const comparePointUrl = useMemoizedFn((findKey: string): string => {
    const findPoint = proxyConfig.Endpoints.find(({ Id }) => Id === findKey)
    if (!!findPoint) {
      const { Url, UserName, Password } = findPoint
      if (UserName && Password) {
        const protocolMatch = Url.match(/^((?:https?|socks[45]):\/\/)(.*)$/)
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
   * @name 获取代理配置值
   * @description 根据选择的ID列表，找出对应的启用节点URL和规则组ID
   * @param selection 选中的ID数组（可能包含节点ID/URL和规则组ID）
   * @returns {ProxyValue} 包含代理节点URL列表和规则组ID列表
   */
  const getProxyValue = useMemoizedFn((selection: string[]): ProxyValue => {
    const normalizedSelection = selection.map((item) => `${item}`.trim()).filter((item) => item.length > 0)
    const proxyEndpoints = normalizedSelection.filter((item) => !item.startsWith('route') && !proxyConfig.Endpoints.find(({ Id }) => Id === item)?.Disabled)
      .map((id) => comparePointUrl(id)).join(',')
    const ProxyRuleIds = normalizedSelection
      .filter((item) => item.startsWith("route") && !proxyConfig.Routes.find(({ Id }) => Id === item)?.Disabled)
      .join(",")

    return {
      proxyEndpoints,
      ProxyRuleIds
    }
  })

  /**
   * @name 代理路由和节点下拉选项
   * @description 生成包含规则组和代理节点的下拉选项，区分显示并标注禁用状态
   * @returns {ProxyOption[]} 代理下拉选项数组
   */
  const proxyRouteOptions = useMemo((): ProxyOption[] => {
    const { Routes = [], Endpoints = [] } = proxyConfig
    return [
      ...Routes.map(({ Name, Id, Disabled }) => ({
        label: `${t("MITMRuleFromModal.rule_group")}: ${Name}${Disabled ? `(${t("ProxyConfig.disabled")})` : ""}`,
        value: Id,
        disabled: Disabled
      })),
      ...Endpoints.map(({ Url, Id, Disabled }) => ({
        label: `${t("ProxyConfig.Points")}: ${Url}${Disabled ? `(${t("ProxyConfig.disabled")})` : ""}`,
        value: Id,
        disabled: Disabled
      }))
    ]
  }, [proxyConfig, t])

  /**
   * @name 代理节点下拉选项
   * @description 生成仅包含代理节点的下拉选项（不包含规则组）
   * @returns {ProxyOption[]} 代理节点下拉选项数组
   */
  const proxyPointsOptions = useMemo((): ProxyOption[] => {
    const { Endpoints = [] } = proxyConfig
    return Endpoints.map(({ Url, Disabled }) => ({
      label: Disabled ? `${Url} (${t("ProxyConfig.disabled")})` : Url,
      value: Url,
      disabled: Disabled
    }))

  }, [proxyConfig, t])


  /**
   * @name 获取代理配置
   * @description 从后端获取全局代理配置并更新本地状态，带请求去重机制
   * @returns {Promise<void>}
   */
  const fetchProxyConfig = useMemoizedFn(async (): Promise<void> => {
    // 如果已有请求在进行中，复用该 Promise
    if (fetchPromise) {
      return fetchPromise
    }

    // 创建新的请求 Promise
    fetchPromise = (async () => {
      try {
        const config = await grpcGetGlobalProxyRulesConfig()
        if (config) {
          updateGlobalConfig(config)
        }
      } finally {
        // 请求完成后清除缓存，允许后续的主动刷新
        fetchPromise = null
      }
    })()

    return fetchPromise
  })

  /**
   * @name 保存代理配置
   * @description 保存代理配置到后端，保存成功后重新获取配置并执行回调
   * @param config 新的代理配置对象
   * @param cb 保存成功后的回调函数（可选）
   * @returns {Promise<void>}
   */
  const saveProxyConfig = useMemoizedFn(async (config: GlobalProxyRulesConfig, cb?: () => void): Promise<void> => {
    await grpcSetGlobalProxyRulesConfig(config)
    fetchProxyConfig()
    cb?.()
  })

  /**
   * @name 检查并添加新代理节点
   * @description 检查传入的代理URL是否为新节点，如果是则自动添加到配置中
   * @param proxy 代理URL数组（可选）
   * @returns {void}
   */
  const checkProxyEndpoints = useMemoizedFn((proxy?: string[]): void => {
    if (!proxy?.length) return
    const newEndpoints = proxy.filter((item) => !item.startsWith('route') && proxyConfig.Endpoints.every(({ Id, Url }) => ![Id, Url].includes(item)))
    if (newEndpoints.length) {
      const config = {
        ...proxyConfig,
        Endpoints: [
          ...proxyConfig.Endpoints,
          ...newEndpoints.map((url) => {
            const { Url, UserName, Password } = parseUrl(url)
            return { Name: Url, Url, Id: `ep-${randomString(8)}`, UserName, Password }
          })
        ]
      }
      saveProxyConfig(config)
    }
  })

  useEffect(() => {
    !isInitialized && fetchProxyConfig()
  }, [])

  return {
    proxyRouteOptions,
    getProxyValue,
    proxyConfig,
    comparePointUrl,
    saveProxyConfig,
    checkProxyEndpoints,
    proxyPointsOptions
  }
}


