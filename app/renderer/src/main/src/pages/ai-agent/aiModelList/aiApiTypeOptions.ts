/** 独立模块，避免 utils ↔ AIModelForm ↔ NewThirdPartyApplicationConfig 循环依赖 */

export const AI_API_TYPE_OPTIONS = [
  {
    label: 'OpenAI(兼容性好 chat/completions )',
    value: 'chat_completions',
  },
  {
    label: 'OpenAI Responses(新格式)',
    value: 'responses',
  },
] as const

export type AIAPIType = (typeof AI_API_TYPE_OPTIONS)[number]['value']

export const DEFAULT_AI_API_TYPE: AIAPIType = 'chat_completions'

export const normalizeAIAPIType = (value?: string): AIAPIType => {
  return AI_API_TYPE_OPTIONS.findIndex((ele) => ele.value === value) !== -1 ? (value as AIAPIType) : DEFAULT_AI_API_TYPE
}
