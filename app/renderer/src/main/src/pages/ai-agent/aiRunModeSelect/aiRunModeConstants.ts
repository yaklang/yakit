import type React from 'react'
import { BoxesOutlined, BrainCircuitOutlined, Goal2Outlined } from '@yakit-libs/yakit-ui-icons/outline'

export type ModeOptionKey = 'plan' | 'multiAgent' | 'goal'

export const MODE_LABEL_KEY: Record<ModeOptionKey, string> = {
  plan: 'AIMilkdownModeSlash.plan',
  multiAgent: 'AIMilkdownModeSlash.multiAgent',
  goal: 'AIMilkdownModeSlash.goal',
}

export const ModeOptionList: {
  key: ModeOptionKey
  label: string
  icon: React.ComponentType<React.ComponentProps<typeof BoxesOutlined>>
}[] = [
  {
    key: 'plan',
    label: 'Plan',
    icon: BrainCircuitOutlined,
  },
  {
    key: 'multiAgent',
    label: 'Multi-Agent',
    icon: BoxesOutlined,
  },
  {
    key: 'goal',
    label: 'Goal',
    icon: Goal2Outlined,
  },
]
