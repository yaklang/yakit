import { YakitSideTabProps } from '@/components/yakitSideTab/YakitSideTabType'

export interface AITaskContentProps {
  tabBarExtraContent: YakitSideTabProps['tabBarExtraContent']
  /** tabs 数量变化（用于调整时间线/自由对话宽度） */
  onTabsChange?: (tabsLength: number) => void
}
