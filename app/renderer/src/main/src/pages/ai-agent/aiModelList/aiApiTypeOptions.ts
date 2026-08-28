/** 独立模块，避免 utils ↔ AIModelForm ↔ NewThirdPartyApplicationConfig 循环依赖 */
import { type TFunction } from '@/i18n/useI18nNamespaces'

const AI_API_TYPE_VALUES = ['chat_completions', 'responses'] as const

export type AIAPIType = (typeof AI_API_TYPE_VALUES)[number]

export const AI_API_TYPE_OPTIONS: (t: TFunction) => { label: string; value: AIAPIType }[] = (t) => [
  {
    label: t('ConfigNetworkPage.apiTypeChatCompletions'),
    value: 'chat_completions',
  },
  {
    label: t('ConfigNetworkPage.apiTypeResponses'),
    value: 'responses',
  },
]

export const DEFAULT_AI_API_TYPE: AIAPIType = 'chat_completions'

export const normalizeAIAPIType = (value?: string): AIAPIType => {
  return AI_API_TYPE_VALUES.findIndex((ele) => ele === value) !== -1 ? (value as AIAPIType) : DEFAULT_AI_API_TYPE
}
