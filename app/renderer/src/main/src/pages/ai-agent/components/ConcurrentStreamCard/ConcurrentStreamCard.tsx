import { useEffect, useMemo, type FC } from 'react'
import ChatCard from '../ChatCard'
import ModalInfo from '../ModelInfo'
import { useBoolean, useCreation, useMemoizedFn } from 'ahooks'
import styles from './ConcurrentStreamCard.module.scss'
import ConcurrentStreamContent from './ConcurrentStreamContent/ConcurrentStreamContent'
import {
  AIChatQSDataTypeEnum,
  ChatTaskDefaultGroup,
  type ChatTaskNodeGroup,
  type ChatListRenderType,
  type ReActChatTaskElementSub,
} from '@/pages/ai-re-act/hooks/aiRender'
import { getAIStatusPresentation } from '../../utils/AIStatusUtils'
import { CHILD_CONTENT_WINDOW_STYLE } from './constants'
import { useVectorStripeBg } from './hooks/useVectorStripeBg'
import { useConcurrentStreamCardStyle } from './hooks/useConcurrentStreamCardStyle'
import ConcurrentStreamCardActions from './ConcurrentStreamCardActions/ConcurrentStreamCardActions'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useConcurrentStreamRefreshListener } from './concurrentStream/useConcurrentStreamRefreshListener'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'
import { yakitNotify } from '@/utils/notification'
import { useCurrentStore, useCurrentRawData, useCurrentMeta } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'

const ConcurrentStreamCard: FC<{
  elements: ReActChatTaskElementSub[]
  session: string
  token: string
  chatType: ChatListRenderType
  isChildWindow?: boolean
  onRefresh?: () => void
}> = ({ session, elements, chatType, token, isChildWindow, onRefresh }) => {
  const [expand, { toggle: expandToggle, setFalse: collapseExpand }] = useBoolean(isChildWindow || chatType !== 'reAct')

  const { t } = useI18nNamespaces(['aiAgent'])

  const store = useCurrentStore()
  const renderNum = useStore(store, (state) => state.items[token].renderNum)
  const rawData = useCurrentRawData()
  const metaData = useCurrentMeta()

  const raw = useCreation(() => {
    if (!rawData) return null
    const itemData = rawData.contents.get(token)
    if (!itemData) return null
    return { ...itemData } as ChatTaskNodeGroup | ChatTaskDefaultGroup | undefined
  }, [renderNum])

  // 是否是默认任务分组
  const isTaskDefaultGroup = raw?.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP
  const presentation = useMemo(() => getAIStatusPresentation(raw?.data?.status), [raw?.data?.status])
  const vectorBg = useVectorStripeBg(presentation.stripeColor)

  const titleText = useMemo(() => {
    if (isTaskDefaultGroup) {
      return t('ConcurrentStreamCard.systemInfo')
    }
    return raw?.data?.taskName || ''
  }, [isTaskDefaultGroup, raw?.data?.taskName, t])

  const framePayload = useMemo(
    () => ({
      session,
      token,
      chatType,
      elements,
      taskName: titleText,
    }),
    [chatType, elements, session, titleText, token],
  )

  useEffect(() => {
    if (isChildWindow) return
    if (!raw?.data?.status) return
    if (raw.data.status !== 'processing') {
      collapseExpand()
    }
  }, [collapseExpand, isChildWindow, raw?.data?.status])

  useConcurrentStreamRefreshListener(framePayload, session, token, chatType, !isChildWindow)

  const modalInfo = useMemo(() => {
    if (!raw) return undefined
    return { time: isTaskDefaultGroup ? 0 : raw.Timestamp, title: raw.AIModelName, icon: raw.AIService }
  }, [isTaskDefaultGroup, raw])

  const coordinatorId = metaData.currentTaskPlanID?.coordinatorId
  const taskIndex = raw?.data?.taskIndex
  const showContinueTask = !!raw && !!coordinatorId && taskIndex != null && !isChildWindow
  const showCancelTask = raw?.data?.status === 'processing' && taskIndex != null && !isChildWindow
  const showStripeBg = !expand && !isChildWindow && !!vectorBg

  const cardStyle = useConcurrentStreamCardStyle({
    bgColor: presentation.bgColor,
    vectorBg,
    showStripe: showStripeBg,
    isChildWindow,
  })

  const newElements = useMemo(() => {
    if (elements.length === 0) return elements
    return elements.filter((item) => item.type !== ('task-dependency-graph' as AIChatQSDataTypeEnum))
  }, [elements])

  const showDetails = useMemo(() => {
    if (isChildWindow) return false
    if (!raw) return false
    const status = raw?.data?.status
    return status === AITaskStatus.created || status === AITaskStatus.inProgress
  }, [raw?.data?.status])

  const onDetails = useMemoizedFn(() => {
    const data = raw?.data
    if (!data) return
    if (!data.taskId) {
      yakitNotify('error', 'taskId为空')
      return
    }
    emiter.emit(
      'actionAITaskContentTab',
      JSON.stringify({
        type: 'add',
        params: {
          key: data.taskId,
          label: data.taskName,
          goal: data.goal,
        },
      }),
    )
  })
  return (
    <ChatCard
      className="concurrent-stream-card"
      titleIcon={presentation.icon}
      titleText={<div className={styles['task-name']}>{titleText}</div>}
      titleExtra={modalInfo && <ModalInfo {...modalInfo} />}
      style={cardStyle}
      childStyle={isChildWindow ? CHILD_CONTENT_WINDOW_STYLE : undefined}
      onClickTitle={() => {
        if (!isChildWindow) expandToggle()
      }}
      titleMore={
        <ConcurrentStreamCardActions
          isChildWindow={isChildWindow}
          expand={expand}
          onExpandToggle={expandToggle}
          onRefresh={onRefresh}
          onDetails={onDetails}
          framePayload={framePayload}
          showContinueTask={showContinueTask}
          showCancelTask={showCancelTask}
          showDetails={showDetails}
          coordinatorId={coordinatorId}
          taskIndex={taskIndex}
        />
      }
    >
      {expand && (
        <div className={isChildWindow ? styles['concurrent-stream-content'] : undefined}>
          <div className={styles['goal']}>{raw?.data?.goal}</div>
          <div
            className={styles['content']}
            hidden={elements.length === 0}
            style={isChildWindow ? { flex: 1, maxHeight: 'inherit', height: 0 } : undefined}
          >
            <ConcurrentStreamContent session={session} elements={newElements} isChildWindow={isChildWindow} />
          </div>
        </div>
      )}
    </ChatCard>
  )
}

export default ConcurrentStreamCard
