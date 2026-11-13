import type { AIModelConfig, ProbeReasoningEffortResponse } from '@/pages/ai-agent/aiModelList/utils'

export interface AIReasoningEffortSelectProps {
  className?: string
  disabled?: boolean
  /** 当前思考档位探测的加载状态 */
  probing?: boolean
  /** 当前模型的探测响应，用于展示各档位的错误提示。 */
  probeResponse?: ProbeReasoningEffortResponse
  /** 模型选择面板当前编辑的模型草稿 */
  model?: AIModelConfig
  /** 与模型选择共用草稿，关闭模型面板时统一保存 */
  onChange: (mutate: (model: AIModelConfig) => AIModelConfig) => void
}
