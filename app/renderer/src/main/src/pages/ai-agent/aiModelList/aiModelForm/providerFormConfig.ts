import { has, isNil } from 'lodash'
import type { ThirdPartyApplicationConfig } from '@/components/configNetwork/ConfigNetworkPage'
import type { AIThirdPartyApplicationConfig } from '@/components/configNetwork/NewAIThirdPartyApplicationConfig'
import { normalizeAIAPIType } from '../aiApiTypeOptions'
import { normalizeReasoningEffort } from './reasoningEffort'
import { YAK_SCRIPT_PROVIDER } from './providerConfig'
export const buildAIConfigHealthCheckConfig = (values): ThirdPartyApplicationConfig => {
  if (values.Type === YAK_SCRIPT_PROVIDER)
    return { Type: values.Type, Script: values.script, EnableNativeToolCalling: !!values.enable_native_tool_calling }
  const config: ThirdPartyApplicationConfig = {
    Type: values.Type || '',
    APIKey: values.api_key || '',
    Domain: values.domain || '',
    Proxy: values.proxy || '',
    NoHttps: !!values.no_https,
    APIType: values.api_type || '',
    ExtraParams: (values.ExtraParams ?? []).filter((item) => item.Key !== 'model'),
    BaseURL: values.base_url || '',
    Endpoint: values.endpoint || '',
    EnableEndpoint: !!values.enable_endpoint,
    Headers: values.Headers || [],
    /** 下面这些字段ai中没有 */
    // UserIdentifier: values.user_identifier || "",
    // UserSecret: values.user_secret || "",
    // Namespace: values.namespace || "",
    // WebhookURL: values.webhook_url || "",
  }

  const builtInFieldSet = new Set([
    'script',
    'enable_native_tool_calling',
    'ExtraParams',
    'model_type',
    '_ProbedExtendedEfforts',
    '_EffortProbed',
    'Type',
    'api_key',
    'user_identifier',
    'user_secret',
    'namespace',
    'domain',
    'proxy',
    'no_https',
    'api_type',
    'base_url',
    'endpoint',
    'enable_endpoint',
    'Headers',
    'webhook_url',
    'api_key_id', //测试不需要传这个给后端
  ])

  Object.entries(values).forEach(([key, value]) => {
    if (builtInFieldSet.has(key)) return
    if (value === undefined || value === null || value === '') return
    config.ExtraParams?.push({
      Key: key,
      Value: `${value}`,
    })
  })

  if (!config.ExtraParams?.length) {
    delete config.ExtraParams
  }

  return config
}

export const buildAIConfigHealthCheckFormValues = (config: ThirdPartyApplicationConfig) => {
  if (config.Type === YAK_SCRIPT_PROVIDER)
    return {
      Type: config.Type,
      script: config.Script ?? '',
      enable_native_tool_calling: !!config.EnableNativeToolCalling,
    }
  return {
    Type: config.Type ?? '',
    api_key: config.APIKey ?? '',
    api_type: normalizeAIAPIType(config.APIType ?? ''),
    domain: config.Domain ?? '',
    proxy: config.Proxy ?? '',
    no_https: config.NoHttps ?? false,
    base_url: config.BaseURL ?? '',
    endpoint: config.Endpoint ?? '',
    enable_endpoint: config.EnableEndpoint ?? false,
    Headers: config.Headers ?? [],
    ExtraParams: config.ExtraParams ?? [],
    EnableThinkingOpt: getEnableThinkingOpt(config),
    MaxTokens: config?.MaxTokens,
    Temperature: config?.Temperature,
    TopP: config?.TopP,
    TopK: config?.TopK,
    FrequencyPenalty: config?.FrequencyPenalty,
    ReasoningEffort: normalizeReasoningEffort(config?.ReasoningEffort),
  } as AIThirdPartyApplicationConfig
}
export const getEnableThinkingOpt = (config: ThirdPartyApplicationConfig) => {
  return has(config, 'EnableThinkingOpt') ? `${config.EnableThinkingOpt === true ? 'open' : 'close'}` : 'no-set'
}

export const parseEnableThinkingOptValue = (val: any): boolean | undefined => {
  if (isNil(val) || val === 'no-set') return undefined
  return val === 'open'
}

export const parseValidStringOption = (val: any): string | undefined => {
  if (isNil(val) || val === 'no-set') return undefined
  return val
}

export const parseValidNumberOption = (val: any): number | undefined => {
  if (isNil(val) || val === '') return undefined
  return Number(val)
}
// 常规数字字段
const numberFields: Array<keyof ThirdPartyApplicationConfig> = [
  'MaxTokens',
  'Temperature',
  'TopP',
  'TopK',
  'FrequencyPenalty',
]
type NumberFieldKey = (typeof numberFields)[number]
export const formValueToAIConfigProvider = (res) => {
  if (res.Type === YAK_SCRIPT_PROVIDER)
    return { Type: res.Type, Script: res.script, EnableNativeToolCalling: !!res.enable_native_tool_calling }
  const date: ThirdPartyApplicationConfig = {
    Type: res.Type,
    APIKey: res.api_key,
    APIType: normalizeAIAPIType(res.api_type),
    Domain: res.domain,
    Proxy: res.proxy,
    NoHttps: res.no_https,
    ExtraParams: (res.ExtraParams ?? []).filter((item) => item.Key !== 'model'),
    BaseURL: res.base_url,
    Endpoint: res.endpoint,
    EnableEndpoint: res.enable_endpoint,
    Headers: res.Headers,
    /** 下面这些字段ai中没有 */
    // UserIdentifier: "",
    // UserSecret: "",
    // Namespace: "",
    // WebhookURL: "",
    // Disabled: false
  }
  // 1. 单独处理特殊规则字段
  const enableThinkingOpt = parseEnableThinkingOptValue(res.EnableThinkingOpt)
  if (enableThinkingOpt !== undefined) date.EnableThinkingOpt = enableThinkingOpt

  const reasoningEffort = parseValidStringOption(res.ReasoningEffort)
  if (reasoningEffort !== undefined) date.ReasoningEffort = reasoningEffort

  const extraData: Partial<Record<NumberFieldKey, number>> = {}
  numberFields.forEach((key) => {
    const val = parseValidNumberOption(res[key])
    if (val !== undefined) {
      extraData[key] = val
    }
  })
  Object.assign(date, extraData)
  return date
}
