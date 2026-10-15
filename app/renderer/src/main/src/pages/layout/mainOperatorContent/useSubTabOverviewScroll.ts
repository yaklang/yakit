import { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { usePageInfo } from '@/store/pageInfo'
import type { MultipleNodeInfo } from './MainOperatorContentType'
import { scrollSubTabIntoView } from './subTabOverview'

export interface UseSubTabOverviewScrollProps {
  /** 一级页签 routeKey，用于订阅激活状态（失活时取消待执行定位） */
  pageRouteKey: string
  /** 惰性解析二级标签栏滚动容器（跳转时容器可能尚未挂载或暂无尺寸） */
  getContainer: () => HTMLElement | null | undefined
}

export interface SubTabJumpOptions {
  /** 目标二级页 id */
  pageId: string
  /** 当前二级页节点列表，用于校验目标与定位所在组 */
  subPage: MultipleNodeInfo[]
  /** 目标所在组处于折叠时先展开该组 */
  onUpdateGroup: (group: MultipleNodeInfo) => void
}

/**
 * 概览菜单跳转的定位调度：新跳转取消上一次任务、折叠组等 0.2s 宽度过渡动画后再定位、
 * 一级页签失活或卸载时取消定时器与滚动等待帧；显式跳转置一次性标记，
 * 供选中变化 effect 跳过默认尾部滚动，定位时序统一由跳转自身处理。
 */
export function useSubTabOverviewScroll(props: UseSubTabOverviewScrollProps) {
  const { pageRouteKey, getContainer } = props
  const pendingRef = useRef<{ timer?: ReturnType<typeof setTimeout>; cancelScroll?: () => void }>({})
  const skipTailScrollRef = useRef(false)

  const cancelPendingScroll = useMemoizedFn(() => {
    const pending = pendingRef.current
    if (pending.timer !== undefined) {
      clearTimeout(pending.timer)
      pending.timer = undefined
    }
    pending.cancelScroll?.()
    pending.cancelScroll = undefined
  })

  /** 消费一次性标记：本次选中变化是否来自概览显式跳转（应跳过默认尾部滚动） */
  const consumeSkipTailScroll = useMemoizedFn(() => {
    const skip = skipTailScrollRef.current
    skipTailScrollRef.current = false
    return skip
  })

  /** 概览菜单跳转入口；pageId 不在 subPage 中时返回 false 并保持原状 */
  const jumpToSubTab = useMemoizedFn(({ pageId, subPage, onUpdateGroup }: SubTabJumpOptions) => {
    // 取消上一次跳转尚未完成的定位
    cancelPendingScroll()
    const group = subPage.find((ele) => (ele.groupChildren || []).some((child) => child.id === pageId))
    if (!group && !subPage.some((ele) => ele.id === pageId)) return false
    skipTailScrollRef.current = true
    const scrollTargetIntoView = () => {
      pendingRef.current.timer = undefined
      pendingRef.current.cancelScroll = scrollSubTabIntoView(getContainer(), pageId)
    }
    if (group && !group.expand) {
      onUpdateGroup({ ...group, expand: true })
      // 组展开宽度有 0.2s 过渡动画，等动画结束后再定位
      pendingRef.current.timer = setTimeout(scrollTargetIntoView, 220)
      return true
    }
    scrollTargetIntoView()
    return true
  })

  // 一级页签切走后页体 display:none，继续等帧定位只会对宽度为 0 的容器空转；卸载（含页面被关闭）时同样取消
  const isPageActive = usePageInfo((s) => s.currentPageTabRouteKey === pageRouteKey)
  useEffect(() => {
    if (!isPageActive) cancelPendingScroll()
  }, [isPageActive])
  useEffect(() => cancelPendingScroll, [])

  return { jumpToSubTab, consumeSkipTailScroll, cancelPendingScroll }
}
