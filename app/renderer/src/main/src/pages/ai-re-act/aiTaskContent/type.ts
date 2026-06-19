import { YakitSideTabProps } from '@/components/yakitSideTab/YakitSideTabType'
import { ReactNode } from 'react'

export interface AITaskContentProps {
  tabBarExtraContent: YakitSideTabProps['tabBarExtraContent']
  emptyNode: ReactNode
}
