import { useEffect, useMemo, type FC } from 'react'
import ChatCard from '../ChatCard'
import ModalInfo from '../ModelInfo'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineChevronsDownUpIcon,
  OutlineChevronsUpDownIcon,
  OutlineListOneIcon,
  OutlineRefreshIcon,
} from '@/assets/icon/outline'
import { useBoolean } from 'ahooks'
import styles from './ConcurrentStreamCard.module.scss'
import ConcurrentStreamContent from './ConcurrentStreamContent/ConcurrentStreamContent'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import type {
  AIChatQSData,
  ChatTaskNodeGroup,
  ReActChatElement,
  ReActChatTaskElementSub,
} from '@/pages/ai-re-act/hooks/aiRender'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import { getAIStatusPresentation } from '../../utils/AIStatusUtils'

const { ipcRenderer } = window.require('electron')

const childWindowStyle = {
  height: '100%',
  backgroundColor: 'var(--Colors-Use-Basic-Background)',
}
const childContentWindowStyle = {
  flex: 1,
}

const ConcurrentStreamCard: FC<{
  elements: ReActChatTaskElementSub[]
  session: string
  token: string
  chatType: ReActChatElement['chatType']
  isChildWindow?: boolean
  onRefresh?: () => void
}> = ({ session, elements, chatType, token, isChildWindow, onRefresh }) => {
  // 展开收起
  const [expand, { toggle: expandToggle, setFalse: collapseExpand }] = useBoolean(true)
  const { fetchChatDataStore } = useChatIPCDispatcher().chatIPCEvents
  const raw = fetchChatDataStore()?.getContentMap({
    session,
    chatType,
    mapKey: token,
  }) as ChatTaskNodeGroup | undefined

  const [icon, bgColor] = useMemo(() => {
    return getAIStatusPresentation(raw?.data?.status)
  }, [raw?.data?.status])

  const childWindowPayload = useMemo(() => {
    const store = fetchChatDataStore()
    const contentEntries: Array<[string, AIChatQSData]> = []

    const rootContent = store?.getContentMap({
      session,
      chatType,
      mapKey: token,
    })

    if (rootContent) {
      contentEntries.push([token, rootContent])
    }

    const collectEntries = (items: ReActChatTaskElementSub[]) => {
      items.forEach((item) => {
        const content = store?.getContentMap({
          session,
          chatType: item.chatType,
          mapKey: item.token,
        })

        if (content) {
          contentEntries.push([item.token, content])
        }

        if (item.kind === 'group') {
          collectEntries(item.children)
        }
      })
    }

    collectEntries(elements)

    return {
      session,
      token,
      chatType,
      elements,
      contentEntries,
    }
  }, [chatType, elements, fetchChatDataStore, session, token])

  const modalInfo = useMemo(() => {
    return { time: raw?.Timestamp, title: raw?.AIModelName, icon: raw?.AIService }
  }, [raw?.AIModelName, raw?.AIService, raw?.Timestamp])

  useEffect(() => {
    // 子窗口没有展开按钮，不能在状态变化时自动收起
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

      openAIConcurrentStream(childWindowPayload)
    }

    ipcRenderer.on('refresh-ai-concurrent-stream', handleRefresh)

    return () => {
      ipcRenderer.removeListener('refresh-ai-concurrent-stream', handleRefresh)
    }
  }, [chatType, childWindowPayload, isChildWindow, session, token])

  return (
    <ChatCard
      className="concurrent-stream-card"
      titleIcon={icon}
      titleText={<div className={styles['task-name']}>{raw?.data?.taskName}</div>}
      titleExtra={<>{modalInfo && <ModalInfo {...modalInfo} />}</>}
      style={isChildWindow ? childWindowStyle : { background: bgColor, padding: '10px 8px' }}
      childStyle={isChildWindow ? childContentWindowStyle : undefined}
      titleMore={
        isChildWindow ? (
          <Tooltip title="刷新">
            <YakitButton
              size="middle"
              type="text"
              icon={<OutlineRefreshIcon />}
              onClick={onRefresh}
              className={styles['expand-btn']}
            />
          </Tooltip>
        ) : (
          <>
            <Tooltip title="新窗口打开">
              <YakitButton
                size="small"
                type="text"
                icon={<OutlineListOneIcon />}
                onClick={() => openAIConcurrentStream(childWindowPayload)}
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
        )
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
