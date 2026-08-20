import type { MultipleNodeInfo } from '@/pages/layout/mainOperatorContent/MainOperatorContentType'
import type { YakitRoute } from '@/enums/yakitRoute'

export type MainOperatorEventProps = {
  /** 远程打开一个页面 */
  openPage: string
  /** 远程关闭一个页面 */
  closePage: string
  /**通过焦点关闭二级页面 */
  onRemoveSecondPageByFocus: string
  /**关闭二级页面前是否校验 */
  onCloseSubPageByJudge: string
  /**通过信息关闭二级页面 */
  onCloseSubPageByInfo: string
  /** 从顶部菜单打开一个页面 */
  menuOpenPage: string

  /**二级路由Tab数据变化 */
  secondMenuTabDataChange: string
  /**复制标签页（通用，按 route switch 分发到各页面的复制逻辑） */
  onDuplicateTabs: { item: MultipleNodeInfo; count: number; route: YakitRoute }
}
