import { type FC, useMemo, forwardRef, memo } from 'react'
import styles from './TimelineCard.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import classNames from 'classnames'
import { formatTime } from '@/utils/timeUtil'
import { Virtuoso, type Components, type ContextProp, type ItemProps, type ListProps } from 'react-virtuoso'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import useVirtuosoAutoScroll from '@/pages/ai-re-act/hooks/useVirtuosoAutoScroll'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { InformationCircleOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useMemoizedFn } from 'ahooks'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import useLoadHistory from '@/pages/ai-re-act/hooks/useLoadHistory'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { useStore } from 'zustand'
import {
  useVirtuosoInitialRender,
  useVirtuosoListReady,
  type VirtuosoReadyContext,
} from '@/pages/ai-agent/components/useVirtuosoInitialRender'

const TYPE_COLOR_MAP: Record<string, 'info' | 'white' | 'danger'> = {
  user_input: 'info',
  user_interaction: 'info',
  tool_result: 'white',
  text: 'white',
  raw: 'danger',
}

const TimelineRow = memo(({ item }: { item: AIAgentGrpcApi.TimelineItem }) => {
  const status = TYPE_COLOR_MAP[item.type] || 'white'

  return (
    <div className={classNames(styles['timeline-card'], styles[`timeline-card-${status}`])}>
      <div className={styles['timeline-card-header']}>
        <div className={styles['timeline-card-header-left']}>
          <div className={styles['timeline-card-header-hot']} />
          <span>{formatTime(item.timestamp)}</span>
          <YakitTag size="small" fullRadius color={status} className={styles['timeline-card-header-tag']}>
            <p className={styles['timeline-card-header-tag-text']}>{item.entry_type ?? item.type}</p>
          </YakitTag>
        </div>

        <YakitPopover
          classNames={{ root: styles['timeline-popover'] }}
          styles={{ root: { paddingLeft: 4 } }}
          placement="right"
          content={<div className={styles['timeline-popover-content']}>{item.content}</div>}
        >
          <div className={styles['icon-wrapper']}>
            <InformationCircleOutlined color="currentColor" />
          </div>
        </YakitPopover>
      </div>

      <div className={styles['timeline-card-body']}>{item.content || ''}</div>
    </div>
  )
})

TimelineRow.displayName = 'TimelineRow'

const VirtuosoItemContainer = forwardRef<
  HTMLDivElement,
  ItemProps<AIAgentGrpcApi.TimelineItem> & ContextProp<VirtuosoReadyContext>
>(({ children, style, context, ...props }, ref) => {
  return (
    <div {...props} ref={ref} style={style} className={styles['item-wrapper']}>
      <div className={styles['item-inner']}>{children}</div>
    </div>
  )
})

VirtuosoItemContainer.displayName = 'VirtuosoItemContainer'

const VirtuosoListContainer = forwardRef<HTMLDivElement, ListProps & ContextProp<VirtuosoReadyContext>>(
  ({ children, style, context, ...props }, ref) => {
    useVirtuosoListReady({ children, style, context })

    return (
      <div {...props} ref={ref} style={style} className={styles['virtuoso-item-list']}>
        {children}
      </div>
    )
  },
)

VirtuosoListContainer.displayName = 'VirtuosoListContainer'

const TimelineList: FC<{ sessionId: string }> = memo(({ sessionId }) => {
  const store = useCurrentStore()

  const reActTimelines = useStore(store, (state) => state.reActTimelines)
  const timelinesLoading = useStore(store, (state) => state.timelinesLoading)

  // 向上滚动加载历史 timeline
  const { firstItemIndex, handleLoadMore, isPrependingRef } = useLoadHistory({
    loading: timelinesLoading,
    dataLength: reActTimelines.length,
    SessionID: sessionId,
    fetchHasMore: () => globalSessionEngine.hasMoreTimeline(sessionId),
    loadMore: () => globalSessionEngine.loadTimelineHistory(sessionId),
  })
  const { virtuosoRef, handleTotalListHeightChanged, setScrollerRef, setIsAtBottomRef } = useVirtuosoAutoScroll({
    total: reActTimelines.length,
    isPrependingRef,
  })

  const { renderLoading, virtuosoContext, handleListHeightChanged, initialTopMostItemIndex } = useVirtuosoInitialRender(
    {
      dataLength: reActTimelines.length,
      onHeightChanged: handleTotalListHeightChanged,
    },
  )

  const components = useMemo<Components<AIAgentGrpcApi.TimelineItem, VirtuosoReadyContext>>(
    () => ({
      Item: VirtuosoItemContainer,
      List: VirtuosoListContainer,
      EmptyPlaceholder: () => (timelinesLoading ? null : <YakitEmpty />),
      Footer: () => (reActTimelines.length > 0 ? <div className={styles['arrow']} /> : null),
    }),
    [reActTimelines.length, timelinesLoading],
  )

  const itemContent = useMemoizedFn((_: number, item: AIAgentGrpcApi.TimelineItem) => <TimelineRow item={item} />)

  return (
    <div
      className={classNames(styles['timeline-card-wrapper'], {
        [styles['timeline-card-empty']]: reActTimelines.length === 0,
      })}
    >
      <YakitSpin spinning={timelinesLoading || renderLoading}>
        <Virtuoso
          ref={virtuosoRef}
          firstItemIndex={firstItemIndex}
          data={reActTimelines}
          context={virtuosoContext}
          components={components}
          scrollerRef={setScrollerRef}
          totalListHeightChanged={handleListHeightChanged}
          atBottomStateChange={setIsAtBottomRef}
          initialTopMostItemIndex={initialTopMostItemIndex}
          style={{ height: '100%', width: '100%' }}
          increaseViewportBy={{ top: 300, bottom: 300 }}
          atBottomThreshold={100}
          skipAnimationFrameInResizeObserver
          startReached={handleLoadMore}
          itemContent={itemContent}
        />
      </YakitSpin>
    </div>
  )
})

const TimelineCard: FC = memo(() => {
  const sessionId = useCurrentSessionId()
  return <TimelineList key={sessionId} sessionId={sessionId} />
})

export default TimelineCard
