import React, { useEffect } from 'react'
import styles from './AuxWindowApp.module.scss'
import EngineConsole from '@/auxWindow/pages/EngineConsole/EngineConsole'
import AiChatLog from '@/auxWindow/pages/AiChatLog/AiChatLog'
import AIConcurrentStream from '@/auxWindow/pages/AIConcurrentStream/AIConcurrentStream'
import { AuxWindowRoute } from '@/auxWindow/routes/routes'

const getQueryParam = (param: string) => new URLSearchParams(window.location.search).get(param)

interface AuxWindowPageProps {
  windowId: string
}

const auxRouteMap: Record<AuxWindowRoute, React.FC<AuxWindowPageProps>> = {
  [AuxWindowRoute.EngineConsole]: EngineConsole,
  [AuxWindowRoute.AiChatLog]: AiChatLog,
  [AuxWindowRoute.AiConcurrentStream]: AIConcurrentStream,
}

const isAuxWindowRoute = (route: string): route is AuxWindowRoute => {
  return Object.values(AuxWindowRoute).includes(route as AuxWindowRoute)
}

const AuxWindowApp: React.FC = () => {
  const windowId = getQueryParam('windowId') || ''
  const route = getQueryParam('route') || ''
  const title = getQueryParam('title') || 'Yakit'

  useEffect(() => {
    document.title = title
  }, [title])

  if (!windowId) {
    return <div className={styles['aux-window-error']}>缺少 windowId</div>
  }

  if (!isAuxWindowRoute(route)) {
    return <div className={styles['aux-window-error']}>未知 route: {route}</div>
  }

  const Page = auxRouteMap[route]
  return <Page windowId={windowId} />
}

export default AuxWindowApp
