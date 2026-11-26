import type { PublicRouteMenuProps } from '@/routes/newRoute'
import type { configManagementTabType } from '@/store'
import type { SoftMode } from '@/store/softMode'

export interface FirstTabRouteMenuProps {
  softMode: SoftMode
  onSelect?: () => void
}

/** 跳转项。配置管理的三个页签共用一个路由，用 optionKey 区分 */
export interface FirstTabRouteItem extends PublicRouteMenuProps {
  optionKey?: string
  configTab?: configManagementTabType
}
