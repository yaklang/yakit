import React, { createContext, useContext, useMemo } from 'react'
import { useSSAProjectTable, SSAProjectTableState, UseSSAProjectTableOptions } from './useSSAProjectTable'

export type IRifySSAProjectContextValue = SSAProjectTableState & {
  onFinish?: () => void
}

const IRifySSAProjectContext = createContext<IRifySSAProjectContextValue | null>(null)

export const IRifySSAProjectProvider: React.FC<{
  children: React.ReactNode
  onFinish?: () => void
  tableOptions?: Pick<UseSSAProjectTableOptions, 'projectPool'>
}> = ({ children, onFinish, tableOptions }) => {
  const table = useSSAProjectTable({ variant: 'irify', ...tableOptions })
  const value = useMemo(() => ({ ...table, onFinish }), [table, onFinish])
  return <IRifySSAProjectContext.Provider value={value}>{children}</IRifySSAProjectContext.Provider>
}

export const useIRifySSAProjectTable = (): IRifySSAProjectContextValue => {
  const ctx = useContext(IRifySSAProjectContext)
  if (!ctx) {
    throw new Error('useIRifySSAProjectTable must be used within IRifySSAProjectProvider')
  }
  return ctx
}
