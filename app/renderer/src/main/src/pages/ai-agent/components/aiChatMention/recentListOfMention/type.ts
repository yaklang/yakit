import type { YakitSideTabProps } from '@/components/yakitSideTab/YakitSideTabType'
import type { MentionListControls } from '../type'
import type { AIDraftMaterials } from '../../../type/aiChat'

export interface RecentListOfMentionProps extends MentionListControls {
  query: string
  tabs: YakitSideTabProps['yakitTabs']
  data: AIDraftMaterials
}
