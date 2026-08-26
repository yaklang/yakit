import React from 'react'
import { YakitRoute } from '@/enums/yakitRoute'
import { useDigitalEmployee } from './DigitalEmployeeContext'
import { DigitalEmployeeSelectPage } from './DigitalEmployeeSelectPage'
import { requestDigitalEmployeeQuickNavigation } from './quickNavigation'

export interface DigitalEmployeeGateProps {
  children?: React.ReactNode
}

export const DigitalEmployeeGate: React.FC<DigitalEmployeeGateProps> = ({ children }) => {
  const { confirmed, confirmSelection } = useDigitalEmployee()

  const openQuickNavigation = (route: YakitRoute) => {
    if (!confirmSelection()) return
    requestDigitalEmployeeQuickNavigation(route)
  }

  return confirmed ? <>{children}</> : <DigitalEmployeeSelectPage onQuickNavigation={openQuickNavigation} />
}
