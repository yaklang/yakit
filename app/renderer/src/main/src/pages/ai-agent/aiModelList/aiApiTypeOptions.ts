/** 独立模块，避免 utils ↔ AIModelForm ↔ NewThirdPartyApplicationConfig 循环依赖 */

export const AI_API_TYPE_OPTIONS = [
  {
    label: 'chat/completions（标准，兼容性好）',
    value: 'chat_completions',
  },
  {
    label: 'responses（OpenAI 新格式）',
    value: 'responses',
  },
] as const

export type AIAPIType = (typeof AI_API_TYPE_OPTIONS)[number]['value']

export const DEFAULT_AI_API_TYPE: AIAPIType = 'chat_completions'

export const normalizeAIAPIType = (value?: string): AIAPIType => {
  return AI_API_TYPE_OPTIONS.findIndex((ele) => ele.value === value) !== -1 ? (value as AIAPIType) : DEFAULT_AI_API_TYPE
}
