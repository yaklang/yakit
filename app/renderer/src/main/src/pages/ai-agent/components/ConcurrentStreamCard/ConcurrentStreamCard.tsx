import { useEffect, useMemo, type FC } from 'react'
import ChatCard from '../ChatCard'
import ModalInfo from '../ModelInfo'
import { useBoolean } from 'ahooks'
import styles from './ConcurrentStreamCard.module.scss'
import ConcurrentStreamContent from './ConcurrentStreamContent/ConcurrentStreamContent'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import {
  AIChatQSDataTypeEnum,
  ChatTaskDefaultGroup,
  type ChatTaskNodeGroup,
  type ReActChatElement,
  type ReActChatTaskElementSub,
} from '@/pages/ai-re-act/hooks/aiRender'
import { getAIStatusPresentation } from '../../utils/AIStatusUtils'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import { CHILD_CONTENT_WINDOW_STYLE } from './constants'
import { useVectorStripeBg } from './hooks/useVectorStripeBg'
import { useConcurrentStreamCardStyle } from './hooks/useConcurrentStreamCardStyle'
import ConcurrentStreamCardActions from './ConcurrentStreamCardActions/ConcurrentStreamCardActions'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const { ipcRenderer } = window.require('electron')

const ConcurrentStreamCard: FC<{
  elements: ReActChatTaskElementSub[]
  session: string
  token: string
  chatType: ReActChatElement['chatType']
  isChildWindow?: boolean
  onRefresh?: () => void
}> = ({ session, elements, chatType, token, isChildWindow, onRefresh }) => {
  const [expand, { toggle: expandToggle, setFalse: collapseExpand }] = useBoolean(true)
  const { fetchChatDataStore, fetchCurrentTaskPlanID } = useChatIPCDispatcher().chatIPCEvents

  const { t } = useI18nNamespaces(['aiAgent'])

  const raw = fetchChatDataStore()?.getContentMap({
    session,
    chatType,
    mapKey: token,
  }) as ChatTaskNodeGroup | ChatTaskDefaultGroup | undefined

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

  useEffect(() => {
    if (isChildWindow) return

    const handleRefresh = (_event, params) => {
      if (params?.type !== 'openAIConcurrentStream') return

      const refreshData = params.data
      if (refreshData?.session !== session || refreshData?.token !== token || refreshData?.chatType !== chatType) {
        return
      }

      openAIConcurrentStream(framePayload, { silent: true })
    }

    ipcRenderer.on('refresh-ai-concurrent-stream', handleRefresh)

    return () => {
      ipcRenderer.removeListener('refresh-ai-concurrent-stream', handleRefresh)
    }
  }, [chatType, framePayload, isChildWindow, session, token])

  const modalInfo = useMemo(() => {
    if (!raw) return undefined
    return { time: isTaskDefaultGroup ? 0 : raw.Timestamp, title: raw.AIModelName, icon: raw.AIService }
  }, [isTaskDefaultGroup, raw])

  const coordinatorId = fetchCurrentTaskPlanID()?.coordinatorId
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
          framePayload={framePayload}
          showContinueTask={showContinueTask}
          showCancelTask={showCancelTask}
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
