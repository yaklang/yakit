import { FC, useMemo, forwardRef, memo, useRef } from 'react'
import styles from './TimelineCard.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import classNames from 'classnames'
import { formatTime } from '@/utils/timeUtil'
import { Virtuoso, Components, ItemProps, ListProps } from 'react-virtuoso'
import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import useVirtuosoAutoScroll from '@/pages/ai-re-act/hooks/useVirtuosoAutoScroll'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { OutlineInformationcircleIcon } from '@/assets/icon/outline'
import { useMemoizedFn, useSize } from 'ahooks'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import useAIAgentStore from '../../useContext/useStore'
import useChatIPCStore from '../../useContext/ChatIPCContent/useStore'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import useLoadHistory from '@/pages/ai-re-act/hooks/useLoadHistory'

const TYPE_COLOR_MAP: Record<string, 'info' | 'white' | 'danger'> = {
  user_input: 'info',
  user_interaction: 'info',
  tool_result: 'white',
  text: 'white',
  raw: 'danger',
}

const TimelineRow = memo(
  ({ item, containerHeight }: { item: AIAgentGrpcApi.TimelineItem; containerHeight?: number }) => {
    const status = TYPE_COLOR_MAP[item.type] || 'white'
    const maxHeight = containerHeight ? containerHeight * 0.7 : 300

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
            overlayClassName={styles['timeline-popover']}
            overlayStyle={{ paddingLeft: 4 }}
            placement="right"
            content={<div style={{ maxHeight, overflowY: 'auto' }}>{item.content}</div>}
          >
            <div className={styles['icon-wrapper']}>
              <OutlineInformationcircleIcon />
            </div>
          </YakitPopover>
        </div>

        <div className={styles['timeline-card-body']}>{item.content || ''}</div>
      </div>
    )
  },
)

TimelineRow.displayName = 'TimelineRow'

const VirtuosoItemContainer = forwardRef<HTMLDivElement, ItemProps<AIAgentGrpcApi.TimelineItem>>(
  ({ children, style, ...props }, ref) => {
    return (
      <div {...props} ref={ref} style={style} className={styles['item-wrapper']}>
        <div className={styles['item-inner']}>{children}</div>
      </div>
    )
  },
)

VirtuosoItemContainer.displayName = 'VirtuosoItemContainer'

const VirtuosoListContainer = forwardRef<HTMLDivElement, ListProps>(({ children, style, ...props }, ref) => {
  return (
    <div {...props} ref={ref} style={style} className={styles['virtuoso-item-list']}>
      {children}
    </div>
  )
})

VirtuosoListContainer.displayName = 'VirtuosoListContainer'

const TYPE = 'timelineID'

const TimelineCard: FC = () => {
  const { activeChat } = useAIAgentStore()
  const {
    reActTimelines,
    // historyState: { timelinesLoading },
    requestHistoryState: { timelinesLoading },
  } = useChatIPCStore().chatIPCData
  const { handleLoadMoreHistory, handleHasMoreHistory } = useChatIPCDispatcher().chatIPCEvents
  const { virtuosoRef, handleTotalListHeightChanged, setScrollerRef, setIsAtBottomRef } = useVirtuosoAutoScroll({
    total: reActTimelines.length,
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const size = useSize(containerRef)

  const { firstItemIndex, handleLoadMore } = useLoadHistory({
    loading: timelinesLoading,
    dataLength: reActTimelines.length,
    SessionID: activeChat?.SessionID || '',
    fetchHasMore: () => handleHasMoreHistory('timelines'),
    loadMore: () => handleLoadMoreHistory('timelines'),
  })

  const components = useMemo<Components<AIAgentGrpcApi.TimelineItem>>(
    () => ({
      Item: VirtuosoItemContainer,
      List: VirtuosoListContainer,
      Footer: () => (reActTimelines.length > 0 ? <div className={styles['arrow']} /> : null),
    }),
    [reActTimelines.length],
  )

  const itemContent = useMemoizedFn((_: number, item: AIAgentGrpcApi.TimelineItem) => (
    <TimelineRow item={item} containerHeight={size?.height} />
  ))

  return (
    <div
      className={classNames(styles['timeline-card-wrapper'], {
        [styles['timeline-card-empty']]: reActTimelines.length === 0,
      })}
      ref={containerRef}
    >
      <YakitSpin spinning={timelinesLoading}>
        <Virtuoso
          ref={virtuosoRef}
          firstItemIndex={firstItemIndex}
          data={reActTimelines}
          components={components}
          scrollerRef={setScrollerRef}
          totalListHeightChanged={handleTotalListHeightChanged}
          atBottomStateChange={setIsAtBottomRef}
          initialTopMostItemIndex={reActTimelines.length > 0 ? reActTimelines.length - 1 : 0}
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
}
export default TimelineCard
