import React, { Suspense, lazy, startTransition, useEffect, useMemo, useState } from 'react'
import { yakitAuxWindow } from '@/services/electronBridge'
import ChatIPCContext from '@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent'
import ConcurrentStreamSkeleton from '@/auxWindow/components/ConcurrentStreamSkeleton/ConcurrentStreamSkeleton'
import {
  type ConcurrentStreamFramePayload,
  isConcurrentStreamFrame,
} from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import { buildConcurrentStreamContext } from './buildConcurrentStreamContext'
import { fetchConcurrentStreamContents } from './fetchConcurrentStreamContents'
import styles from './AIConcurrentStream.module.scss'

const ConcurrentStreamCard = lazy(() => import('@/pages/ai-agent/components/ConcurrentStreamCard/ConcurrentStreamCard'))
const AITaskDefaultGroupCard = lazy(
  () => import('@/pages/ai-agent/components/AITaskDefaultGroupCard/AITaskDefaultGroupCard'),
)

const { ipcRenderer } = window.require('electron')

interface AIConcurrentStreamProps {
  windowId: string
}

const AIConcurrentStream: React.FC<AIConcurrentStreamProps> = ({ windowId }) => {
  const [frame, setFrame] = useState<ConcurrentStreamFramePayload | null>(null)
  const [contentVersion, setContentVersion] = useState(0)
  const [contentEntries, setContentEntries] = useState<Array<[string, AIChatQSData]> | null>(null)
  const [loadingContents, setLoadingContents] = useState(false)

  useEffect(() => {
    if (!windowId) return

    const applyFrame = (payload: Record<string, unknown>) => {
      if (!isConcurrentStreamFrame(payload)) return
      startTransition(() => {
        setFrame(payload)
        setContentEntries(null)
        setContentVersion((v) => v + 1)
      })
    }

    const offInit = yakitAuxWindow.onInit((msg) => {
      if (msg.windowId !== windowId) return
      applyFrame(msg.payload)
    })

    const offPush = yakitAuxWindow.onPush((msg) => {
      if (msg.windowId !== windowId) return
      applyFrame(msg.payload)
    })

    yakitAuxWindow.ready(windowId)

    return () => {
      offInit()
      offPush()
    }
  }, [windowId])

  useEffect(() => {
    if (!frame || contentVersion === 0) return

    let cancelled = false
    setLoadingContents(true)

    fetchConcurrentStreamContents(frame)
      .then((entries) => {
        if (!cancelled) setContentEntries(entries)
      })
      .catch(() => {
        if (!cancelled) setContentEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoadingContents(false)
      })

    return () => {
      cancelled = true
    }
  }, [frame, contentVersion])

  const contextValue = useMemo(() => {
    if (!frame || !contentEntries) return null
    return buildConcurrentStreamContext({ ...frame, contentEntries })
  }, [contentEntries, frame])

  const isTaskDefaultGroup = useMemo(() => {
    if (!frame || !contentEntries) return false
    const root = contentEntries.find(([key]) => key === frame.token)?.[1]
    return root?.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP
  }, [contentEntries, frame])

  const cardKey = `${frame?.session}:${frame?.token}:${frame?.chatType}`

  const requestRefresh = () => {
    if (!frame) return
    ipcRenderer.send('request-ai-concurrent-stream-refresh', {
      type: 'openAIConcurrentStream',
      data: {
        session: frame.session,
        token: frame.token,
        chatType: frame.chatType,
      },
    })
  }

  if (!frame || loadingContents || !contextValue) {
    return <ConcurrentStreamSkeleton variant="page" />
  }

  return (
    <ChatIPCContext.Provider value={contextValue}>
      <div className={styles.page}>
        <div className={styles.divider} />
        <div className={styles.wrapper}>
          <Suspense fallback={<ConcurrentStreamSkeleton variant="card" />}>
            {isTaskDefaultGroup ? (
              <AITaskDefaultGroupCard
                key={cardKey}
                isChildWindow
                onRefresh={requestRefresh}
                session={frame.session}
                token={frame.token}
                chatType={frame.chatType}
                elements={frame.elements}
              />
            ) : (
              <ConcurrentStreamCard
                key={cardKey}
                isChildWindow
                onRefresh={requestRefresh}
                session={frame.session}
                token={frame.token}
                chatType={frame.chatType}
                elements={frame.elements}
              />
            )}
          </Suspense>
        </div>
      </div>
    </ChatIPCContext.Provider>
  )
}

export default AIConcurrentStream
