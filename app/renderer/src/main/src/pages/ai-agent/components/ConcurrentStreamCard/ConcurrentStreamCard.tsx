import { useEffect, useMemo, type FC } from 'react'
import ChatCard from '../ChatCard'
import ModalInfo from '../ModelInfo'
import { useBoolean } from 'ahooks'
import styles from './ConcurrentStreamCard.module.scss'
import ConcurrentStreamContent from './ConcurrentStreamContent/ConcurrentStreamContent'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import type { ChatListRenderType, ChatTaskNodeGroup, ReActChatTaskElementSub } from '@/pages/ai-re-act/hooks/aiRender'
import { getAIStatusPresentation } from '../../utils/AIStatusUtils'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import { CHILD_CONTENT_WINDOW_STYLE } from './constants'
import { useVectorStripeBg } from './hooks/useVectorStripeBg'
import { useConcurrentStreamCardStyle } from './hooks/useConcurrentStreamCardStyle'
import { useConcurrentStreamPayload } from './hooks/useConcurrentStreamPayload'
import ConcurrentStreamCardActions from './ConcurrentStreamCardActions/ConcurrentStreamCardActions'

const { ipcRenderer } = window.require('electron')

const ConcurrentStreamCard: FC<{
  elements: ReActChatTaskElementSub[]
  session: string
  token: string
  chatType: ChatListRenderType
  isChildWindow?: boolean
  onRefresh?: () => void
}> = ({ session, elements, chatType, token, isChildWindow, onRefresh }) => {
  const [expand, { toggle: expandToggle, setFalse: collapseExpand }] = useBoolean(true)
  const { fetchChatDataStore, fetchCurrentTaskPlanID } = useChatIPCDispatcher().chatIPCEvents

  const raw = fetchChatDataStore()?.getContentMap({
    session,
    chatType,
    mapKey: token,
  }) as ChatTaskNodeGroup | undefined

  const presentation = useMemo(() => getAIStatusPresentation(raw?.data?.status), [raw?.data?.status])
  const vectorBg = useVectorStripeBg(presentation.stripeColor)
  const childWindowPayload = useConcurrentStreamPayload({ session, token, chatType, elements })

  // 非进行中任务自动收起
  useEffect(() => {
    if (isChildWindow) return
    if (!raw?.data?.status) return
    if (raw.data.status !== 'processing') {
      collapseExpand()
    }
  }, [collapseExpand, isChildWindow, raw?.data?.status])

  // 监听子窗口刷新事件
  useEffect(() => {
    if (isChildWindow) return

    const handleRefresh = (_event, params) => {
      if (params?.type !== 'openAIConcurrentStream') return

      const refreshData = params.data
      if (refreshData?.session !== session || refreshData?.token !== token || refreshData?.chatType !== chatType) {
        return
      }

      openAIConcurrentStream(childWindowPayload)
    }

    ipcRenderer.on('refresh-ai-concurrent-stream', handleRefresh)

    return () => {
      ipcRenderer.removeListener('refresh-ai-concurrent-stream', handleRefresh)
    }
  }, [chatType, childWindowPayload, isChildWindow, session, token])

  const modalInfo = useMemo(() => {
    return { time: raw?.Timestamp, title: raw?.AIModelName, icon: raw?.AIService }
  }, [raw?.AIModelName, raw?.AIService, raw?.Timestamp])

  const coordinatorId = fetchCurrentTaskPlanID()?.coordinatorId
  const taskIndex = raw?.data?.taskIndex
  const showContinueTask = !!raw && !!coordinatorId && taskIndex != null
  const showCancelTask = raw?.data?.status === 'processing' && taskIndex != null
  const showStripeBg = !expand && !isChildWindow && !!vectorBg

  const cardStyle = useConcurrentStreamCardStyle({
    bgColor: presentation.bgColor,
    vectorBg,
    showStripe: showStripeBg,
    isChildWindow,
  })

  return (
    <ChatCard
      className="concurrent-stream-card"
      titleIcon={presentation.icon}
      titleText={<div className={styles['task-name']}>{raw?.data?.taskName}</div>}
      titleExtra={modalInfo && <ModalInfo {...modalInfo} />}
      style={cardStyle}
      childStyle={isChildWindow ? CHILD_CONTENT_WINDOW_STYLE : undefined}
      onClickTitle={() => {
        !isChildWindow && expandToggle()
      }}
      titleMore={
        <ConcurrentStreamCardActions
          isChildWindow={isChildWindow}
          expand={expand}
          onExpandToggle={expandToggle}
          onRefresh={onRefresh}
          childWindowPayload={childWindowPayload}
          showContinueTask={showContinueTask}
          showCancelTask={showCancelTask}
          coordinatorId={coordinatorId}
          taskIndex={taskIndex}
        />
      }
    >
      {expand && (
        <div className={isChildWindow ? styles['concurrent-stream-content'] : undefined}>
          <div className={styles['goal']}>{raw?.data.goal}</div>
          <div
            className={styles['content']}
            hidden={elements.length === 0}
            style={isChildWindow ? { flex: 1, maxHeight: 'inherit', height: 0 } : undefined}
          >
            <ConcurrentStreamContent session={session} elements={elements} isChildWindow={isChildWindow} />
          </div>
        </div>
      )}
    </ChatCard>
  )
}

export default ConcurrentStreamCard
