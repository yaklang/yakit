import React, { useEffect, useState } from 'react'
import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import { useDigitalEmployee } from './DigitalEmployeeContext'
import { DigitalEmployeeSelectPage } from './DigitalEmployeeSelectPage'

export interface DigitalEmployeeGateProps {
  children?: React.ReactNode
}

export const DigitalEmployeeGate: React.FC<DigitalEmployeeGateProps> = ({ children }) => {
  const { confirmed, confirmSelection } = useDigitalEmployee()
  const [pendingRoute, setPendingRoute] = useState<YakitRoute>()

  const openQuickNavigation = (route: YakitRoute) => {
    setPendingRoute(route)
    if (!confirmSelection()) setPendingRoute(undefined)
  }

  useEffect(() => {
    if (!confirmed || !pendingRoute) return
    emiter.emit('menuOpenPage', JSON.stringify({ route: pendingRoute }))
    setPendingRoute(undefined)
  }, [confirmed, pendingRoute])

  return confirmed ? <>{children}</> : <DigitalEmployeeSelectPage onQuickNavigation={openQuickNavigation} />
}
