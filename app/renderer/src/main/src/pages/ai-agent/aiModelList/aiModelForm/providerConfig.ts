import type { ThirdPartyApplicationConfig } from '@/components/configNetwork/ConfigNetworkPage'
import type { KVPair } from '@/models/kv'

export const YAK_SCRIPT_PROVIDER = 'yak-script'
const YAK_SCRIPT_FIELDS = ['script', 'script_timeout_seconds'] as const

export const isYakScriptField = (key: string) => YAK_SCRIPT_FIELDS.some((field) => field === key)

export const getYakScriptFormValues = (params: KVPair[] = []) => {
  const values = Object.fromEntries(params.map(({ Key, Value }) => [Key, Value]))
  return {
    script: values.script ?? '',
    script_timeout_seconds: Number(values.script_timeout_seconds || 240),
  }
}

export const buildProviderExtraParams = (values: {
  Type?: string
  ExtraParams?: KVPair[]
  script?: string
  script_timeout_seconds?: number
}): KVPair[] => {
  if (values.Type !== YAK_SCRIPT_PROVIDER) return values.ExtraParams ?? []
  const params = (values.ExtraParams ?? []).filter(({ Key }) => !isYakScriptField(Key))
  YAK_SCRIPT_FIELDS.forEach((Key) => {
    const value = values[Key]
    if (value !== undefined && value !== null && value !== '') params.push({ Key, Value: String(value) })
  })
  return params
}

/**
 * 将 Provider 配置转换为 ListAiModel 接口所需的 Config JSON 字符串。
 * 统一所有 ListAiModel 调用点的字段映射，避免新增 proto 字段时遗漏。
 */
export const providerToListAiModelConfig = (provider?: ThirdPartyApplicationConfig): string | undefined => {
  // 脚本模型的名称由用户填写；脚本 ABI 没有模型发现接口。
  if (!provider || provider.Type === YAK_SCRIPT_PROVIDER) return undefined
  return JSON.stringify({
    Type: provider.Type ?? '',
    api_key: provider.APIKey ?? '',
    api_type: provider.APIType ?? '',
    domain: provider.Domain ?? '',
    no_https: provider.NoHttps ?? false,
    proxy: provider.Proxy ?? '',
    base_url: provider.BaseURL ?? '',
    endpoint: provider.Endpoint ?? '',
    enable_endpoint: !!provider.EnableEndpoint,
    Headers: provider.Headers ?? [],
  })
}
