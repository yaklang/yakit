import { useMemo, type FC } from 'react'
import ChatCard from '../ChatCard'
import { TaskErrorIcon, TaskInProgressIcon, TaskSkippedIcon, TaskSuccessIcon } from '../../aiTree/icon'
import ModalInfo from '../ModelInfo'
import { AITaskStatus, AITaskStatusType } from '@/pages/ai-re-act/hooks/grpcApi'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineChevronsDownUpIcon, OutlineChevronsUpDownIcon, OutlineListOneIcon } from '@/assets/icon/outline'
import { useBoolean } from 'ahooks'
import styles from './ConcurrentStreamCard.module.scss'
import ConcurrentStreamContent from './ConcurrentStreamContent/ConcurrentStreamContent'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import type { ChatTaskNodeGroup, ReActChatElement, ReActChatTaskElementSub } from '@/pages/ai-re-act/hooks/aiRender'

const getStatusIcon = (status?: AITaskStatusType) => {
  switch (status) {
    case AITaskStatus.success:
      return <TaskSuccessIcon />
    case AITaskStatus.inProgress:
      return <TaskInProgressIcon />
    case AITaskStatus.error:
      return <TaskErrorIcon />
    case AITaskStatus.skipped:
      return <TaskSkippedIcon />
    default:
      return null
  }
}

const ConcurrentStreamCard: FC<{
  elements: ReActChatTaskElementSub[]
  hasNext?: boolean
  session: string
  token: string
  chatType: ReActChatElement['chatType']
}> = ({ session, elements, chatType, token, hasNext }) => {
  // 展开收起
  const [expand, { toggle: expandToggle }] = useBoolean(true)
  // 全屏
  const [fullScreen, { toggle: fullScreenToggle }] = useBoolean(false)
  const { fetchChatDataStore } = useChatIPCDispatcher().chatIPCEvents
  const raw = fetchChatDataStore()?.getContentMap({
    session,
    chatType,
    mapKey: token,
  }) as ChatTaskNodeGroup | undefined

  const modalInfo = useMemo(() => {
    return { time: raw?.Timestamp, title: raw?.AIModelName, icon: raw?.AIService }
  }, [raw?.AIModelName, raw?.AIService, raw?.Timestamp])
  console.log('elements:', { elements, raw })
  return (
    <ChatCard
      className="concurrent-stream-card"
      titleIcon={getStatusIcon(raw?.data?.status)}
      titleText={raw?.data?.taskName}
      titleExtra={<>{modalInfo && <ModalInfo {...modalInfo} />}</>}
      titleMore={
        <>
          <Tooltip title={fullScreen ? '退出全屏' : '全屏'}>
            <YakitButton
              size="small"
              type="text"
              icon={<OutlineListOneIcon />}
              onClick={fullScreenToggle}
              className={styles['expand-btn']}
            />
          </Tooltip>
          <Tooltip title={expand ? '收起' : '展开'}>
            <YakitButton
              size="small"
              type="text"
              icon={expand ? <OutlineChevronsDownUpIcon /> : <OutlineChevronsUpDownIcon />}
              onClick={expandToggle}
              className={styles['expand-btn']}
            />
          </Tooltip>
        </>
      }
    >
      {expand && (
        <div>
          <div className={styles['goal']}>{raw?.data.goal}</div>
          <div className={styles['content']}>
            <ConcurrentStreamContent elements={elements} />
          </div>
        </div>
      )}
    </ChatCard>
  )
}
export default ConcurrentStreamCard
