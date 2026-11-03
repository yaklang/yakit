import type { FC } from 'react'
import { OutlineBrainCircuitIcon, OutlineFlagIcon } from '@/assets/icon/outline'
import { OutlineViewGridIcon } from '@/components/yakChat/icon'

export type ModeOptionKey = 'plan' | 'multiAgent' | 'goal'
export const ModeOptionList: { key: ModeOptionKey; label: string; icon: FC }[] = [
  { key: 'plan', label: 'Plan', icon: OutlineBrainCircuitIcon },
  { key: 'multiAgent', label: 'Multi-Agent', icon: OutlineViewGridIcon },
  { key: 'goal', label: 'Goal', icon: OutlineFlagIcon },
]
