import type { YakitSideTabProps } from '@/components/yakitSideTab/YakitSideTabType'
import type { MentionListControls } from '../type'

export interface RecentListOfMentionProps extends MentionListControls {
  query: string
  tabs: YakitSideTabProps['yakitTabs']
}
