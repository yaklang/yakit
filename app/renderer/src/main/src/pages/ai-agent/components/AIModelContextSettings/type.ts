import type { Ref } from 'react'
import type { AIModelContextSource } from '@/pages/ai-re-act/hooks/aiRender'

export interface AIModelContextDraft {
  tokens?: number | null
  disableAutoAdjust?: boolean
}

export interface AIModelContextSettingsRef {
  save: () => void
  reset: () => void
}

export interface AIModelContextSettingsProps {
  ref?: Ref<AIModelContextSettingsRef>
  source: AIModelContextSource
  open?: boolean
}
