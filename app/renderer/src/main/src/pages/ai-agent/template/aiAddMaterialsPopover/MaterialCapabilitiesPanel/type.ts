import type { ReactElement } from 'react'
import type { AIEnabledCapability } from '@/pages/ai-re-act/hooks/grpcApi'
import type { MaterialSummaryGroup } from '../materialSummary/type'

export interface MaterialCapabilitiesPanelProps {
  initialEnabledCapabilities?: AIEnabledCapability[]
  onEnabledCapabilitiesChange?: (items: AIEnabledCapability[]) => void
  children: (group?: MaterialSummaryGroup) => ReactElement
}
