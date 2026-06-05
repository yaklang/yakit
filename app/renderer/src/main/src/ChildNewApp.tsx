import React, { useEffect, useMemo, useState } from 'react'
import OpenPacketNewWindow from './components/OpenPacketNewWindow/OpenPacketNewWindow'
import styles from './ChildNewApp.module.scss'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { coordinate } from './pages/globalVariable'
import { YakitSpin } from './components/yakitUI/YakitSpin/YakitSpin'
import TitleBar from './components/BaseTitleBar'
import { RightBugAuditResult, YakitRiskDetails } from './pages/risks/YakitRiskTable/YakitRiskTable'
import ChatIPCContext, { defaultDispatcherOfChatIPC } from './pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent'
import { ChatDataStore } from './pages/ai-agent/store/ChatDataStore'
import { defaultChatIPCData } from './pages/ai-agent/defaultConstant'
import { cloneDeep } from 'lodash'
import ConcurrentStreamCard from './pages/ai-agent/components/ConcurrentStreamCard/ConcurrentStreamCard'

const { ipcRenderer } = window.require('electron')

interface ParentWindowData {
  type: string
  data: any
}
interface ChildNewAppProps {}
const ChildNewApp: React.FC<ChildNewAppProps> = (props) => {
  const [parentWinData, setParentWinData] = useState<ParentWindowData>()
  const requestLatestParentData = useMemoizedFn(() => {
    if (parentWinData?.type === 'openAIConcurrentStream') {
      ipcRenderer.send('request-ai-concurrent-stream-refresh', parentWinData)
      return
    }

    ipcRenderer.send('request-parent-data')
  })

  const concurrentStreamContextValue = useMemo(() => {
    if (parentWinData?.type !== 'openAIConcurrentStream') return null

    const { session, contentEntries } = parentWinData.data as {
      session: string
      contentEntries: Array<[string, any]>
    }

    const chatDataStore = new ChatDataStore()
    chatDataStore.create(session)

    contentEntries.forEach(([mapKey, content]) => {
      const chatData = chatDataStore.get(session)
      if (!chatData) return
      if (content.chatType === 'task') {
        chatData.taskChat.contents.set(mapKey, content)
      } else {
        chatData.casualChat.contents.set(mapKey, content)
      }
    })

    return {
      store: {
        chatIPCData: cloneDeep(defaultChatIPCData),
        reviewInfo: undefined,
        planReviewTreeKeywordsMap: new Map(),
        reviewExpand: false,
      },
      dispatcher: {
        ...defaultDispatcherOfChatIPC,
        chatIPCEvents: {
          ...defaultDispatcherOfChatIPC.chatIPCEvents,
          fetchChatDataStore: () => chatDataStore,
        },
      },
    }
  }, [parentWinData])
  useEffect(() => {
    requestLatestParentData()
    ipcRenderer.on('get-parent-window-data', (e, data) => {
      setParentWinData(data as ParentWindowData)
    })
    return () => {
      setParentWinData(undefined)
      ipcRenderer.removeAllListeners('get-parent-window-data')
    }
  }, [requestLatestParentData])
  // 全局记录鼠标坐标位置(为右键菜单提供定位)
  const handleMouseMove = useDebounceFn(
    useMemoizedFn((e: MouseEvent) => {
      const { screenX, screenY, clientX, clientY, pageX, pageY } = e

      coordinate.screenX = screenX
      coordinate.screenY = screenY
      coordinate.clientX = clientX
      coordinate.clientY = clientY
      coordinate.pageX = pageX
      coordinate.pageY = pageY
    }),
    { wait: 50 },
  ).run
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [handleMouseMove])

  const childNewAppEle = useMemo(() => {
    if (parentWinData) {
      switch (parentWinData.type) {
        case 'openPacketNewWindow':
          return <OpenPacketNewWindow data={parentWinData.data} />
        case 'openRiskNewWindow':
          return (
            <YakitRiskDetails
              info={parentWinData.data}
              className={styles['child-risk-wrapper']}
              detailClassName={styles['child-risk-details-wrapper']}
              boxStyle={{ flex: 1 }}
            />
          )
        case 'openSSARiskNewWindow':
          return <RightBugAuditResult info={parentWinData.data} boxStyle={{ height: '100%' }} />
        case 'openAIConcurrentStream':
          return (
            concurrentStreamContextValue && (
              <ChatIPCContext.Provider value={concurrentStreamContextValue}>
                <div className={styles['concurrent-stream-divider']} />
                <div className={styles['concurrent-stream-wrapper']}>
                  <ConcurrentStreamCard
                    isChildWindow
                    onRefresh={requestLatestParentData}
                    session={parentWinData.data.session}
                    token={parentWinData.data.token}
                    chatType={parentWinData.data.chatType}
                    elements={parentWinData.data.elements}
                  />
                </div>
              </ChatIPCContext.Provider>
            )
          )
      }
    }
    return null
  }, [concurrentStreamContextValue, parentWinData, requestLatestParentData])

  return (
    <div className={styles['child-new-app-wrapper']}>
      <TitleBar />
      <div className={styles['child-new-app-content']}>{childNewAppEle}</div>
    </div>
  )
}

export default ChildNewApp
