import type { ShowItemType } from '../BottomEditorDetails/BottomEditorDetailsType'
import type { ActiveProps } from '../RunnerFileTree/RunnerFileTreeType'
export interface LeftSideBarProps {
  fileTreeLoad: boolean
  onOpenEditorDetails: (v: ShowItemType) => void

  isUnShow: boolean
  setUnShow: (v: boolean) => void
  active: LeftSideType
  setActive: (v: LeftSideType) => void
  /** 左侧文件树 tab（含规则生成）变化，用于加宽左侧 */
  onFileTreeTabChange?: (tab: ActiveProps) => void
}

export type LeftSideType = 'audit' | 'search' | undefined
