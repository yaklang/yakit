import { memo, useEffect, useMemo, type FC } from 'react'
import { useBoolean, useCreation, useMemoizedFn } from 'ahooks'
import styles from './ConcurrentStreamCard.module.scss'
import { AIChatQSDataTypeEnum, ChatTaskDefaultGroup, type ChatTaskNodeGroup } from '@/pages/ai-re-act/hooks/aiRender'
import { getAIStatusPresentation } from '../../utils/AIStatusUtils'
import { useVectorStripeBg } from './hooks/useVectorStripeBg'
import { useConcurrentStreamCardStyle } from './hooks/useConcurrentStreamCardStyle'
import { useCurrentStore, useCurrentRawData, useCurrentMeta } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import type {
  ConcurrentStreamCardHeardWrapperProps,
  ConcurrentStreamCardListWrapperProps,
  ConcurrentStreamCardTipProps,
} from './type'
import classNames from 'classnames'
import ConcurrentStreamCardHeard from './concurrentStreamCardHeard/ConcurrentStreamCardHeard'
import ConcurrentStreamContent from './ConcurrentStreamContent/ConcurrentStreamContent'
import { useConcurrentStreamRefreshListener } from './concurrentStream/useConcurrentStreamRefreshListener'

const ConcurrentStreamCard: FC<{
  token: string
  isChildWindow: boolean
}> = memo(({ token, isChildWindow }) => {
  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  const renderNum = useStore(store, (state) => state.tasks[token]?.renderNum)

  const [expand, { toggle: expandToggle, setFalse: collapseExpand }] = useBoolean(
    isChildWindow || rawData.contents.get(token)?.chatType !== 'reAct',
  )

  const raw = useCreation(() => {
    if (!rawData) return null
    const itemData = rawData.contents.get(token)
    if (!itemData) return null
    return { ...itemData } as ChatTaskNodeGroup | ChatTaskDefaultGroup | undefined
  }, [renderNum])

  useEffect(() => {
    if (isChildWindow) return
    if (!raw?.data?.status) return
    if (raw.data.status !== 'processing') {
      collapseExpand()
    }
  }, [isChildWindow, raw?.data?.status])

  useConcurrentStreamRefreshListener(token, !isChildWindow)

  const presentation = useMemo(() => getAIStatusPresentation(raw?.data?.status), [raw?.data?.status])

  const vectorBg = useVectorStripeBg(presentation.stripeColor)
  const showStripeBg = !expand && !isChildWindow && !!vectorBg

  // TODO - 使用className来控制样式，避免使用style
  const cardStyle = useConcurrentStreamCardStyle({
    bgColor: presentation.bgColor,
    vectorBg,
    showStripe: showStripeBg,
    isChildWindow,
  })

  return (
    <div className={classNames(styles['chat-card'], 'concurrent-stream-card')} style={cardStyle}>
      <ConcurrentStreamCardHeardWrapper
        token={token}
        isChildWindow={isChildWindow}
        expand={expand}
        expandToggle={expandToggle}
      />
      {expand && (
        <>
          <ConcurrentStreamCardTip token={token} />
          <ConcurrentStreamCardListWrapper token={token} />
        </>
      )}
    </div>
  )
})

export default ConcurrentStreamCard

const ConcurrentStreamCardHeardWrapper: FC<ConcurrentStreamCardHeardWrapperProps> = memo((props) => {
  const { token, isChildWindow, expand, expandToggle } = props
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const metaData = useCurrentMeta()

  const renderNum = useStore(store, (state) => state.tasks[token]?.renderNum)

  const raw = useCreation(() => {
    if (!rawData) return undefined
    const itemData = rawData.contents.get(token)
    if (!itemData) return undefined
    switch (itemData.type) {
      case AIChatQSDataTypeEnum.TASK_NODE_GROUP:
        return itemData

      default:
        return undefined
    }
  }, [renderNum])

  const onClickTitle = useMemoizedFn(() => {
    if (!isChildWindow) expandToggle()
  })
  return (
    <ConcurrentStreamCardHeard
      coordinatorId={metaData.currentTaskPlanID?.coordinatorId}
      token={token}
      isChildWindow={isChildWindow}
      expand={expand}
      expandToggle={expandToggle}
      onClickTitle={onClickTitle}
      rowData={raw}
    />
  )
})

const ConcurrentStreamCardTip: FC<ConcurrentStreamCardTipProps> = memo((props) => {
  const { token } = props
  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  const renderNum = useStore(store, (state) => state.tasks[token]?.renderNum)

  const goal = useCreation(() => {
    const itemData = rawData.contents.get(token)
    if (!itemData) return null
    switch (itemData.type) {
      case AIChatQSDataTypeEnum.TASK_NODE_GROUP:
        return itemData?.data?.goal || ''

      default:
        return ''
    }
  }, [renderNum])
  return <div className={styles['goal']}>{goal}</div>
})
const ConcurrentStreamCardListWrapper: FC<ConcurrentStreamCardListWrapperProps> = memo((props) => {
  const { token } = props
  const store = useCurrentStore()
  const childrenTokens = useStore(store, (state) => state.tasks[token]?.childrenTokens || [])

  return <ConcurrentStreamContent isChildWindow={false} childrenTokens={childrenTokens} />
})
