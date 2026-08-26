import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { grpcQueryAIForge } from '@/pages/ai-agent/grpc'
import type { AIForge } from '@/pages/ai-agent/type/forge'
import { DIGITAL_EMPLOYEES, DigitalEmployeeDefinition } from './config'
import { getDigitalEmployeeRoleId } from './roleAssignment'

export type DigitalEmployeeResolveStatus = 'ready'

export interface DigitalEmployee extends DigitalEmployeeDefinition {
  status: DigitalEmployeeResolveStatus
}

interface DigitalEmployeeContextValue {
  employees: DigitalEmployee[]
  agents: AIForge[]
  roleAgents: AIForge[]
  unassignedAgents: AIForge[]
  selectedEmployee?: DigitalEmployee
  selectedAgent?: AIForge
  confirmed: boolean
  loading: boolean
  error?: string
  selectionVersion: number
  selectEmployee: (id: string) => void
  confirmSelection: () => boolean
  switchEmployee: (id: string) => boolean
  selectAgent: (id: number) => boolean
  selectAgentByForgeName: (forgeName?: string) => boolean
  retry: () => void
}

const createEmployees = (): DigitalEmployee[] => {
  return DIGITAL_EMPLOYEES.map((employee) => ({ ...employee, status: 'ready' }))
}

const EMPLOYEES = createEmployees()
const DEFAULT_EMPLOYEE_ID = DIGITAL_EMPLOYEES[0]?.id
const FORGE_PAGE_SIZE = 100

const queryForgePage = (page: number) => {
  return grpcQueryAIForge(
    {
      Pagination: {
        Page: page,
        Limit: FORGE_PAGE_SIZE,
        OrderBy: 'id',
        Order: 'asc',
      },
    },
    true,
  )
}

const queryAllForges = async () => {
  const firstPage = await queryForgePage(1)
  const pageCount = Math.ceil(firstPage.Total / FORGE_PAGE_SIZE)
  const remainingPages =
    pageCount > 1
      ? await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => queryForgePage(index + 2)))
      : []
  const forgeMap = new Map<number, AIForge>()
  ;[firstPage, ...remainingPages].forEach((response) => {
    ;(response.Data || []).forEach((forge) => forgeMap.set(forge.Id, forge))
  })
  return [...forgeMap.values()].sort((a, b) => a.Id - b.Id)
}

const DigitalEmployeeContext = createContext<DigitalEmployeeContextValue>({
  employees: EMPLOYEES,
  agents: [],
  roleAgents: [],
  unassignedAgents: [],
  selectedEmployee: EMPLOYEES[0],
  selectedAgent: undefined,
  confirmed: false,
  loading: false,
  error: undefined,
  selectionVersion: 0,
  selectEmployee: () => {},
  confirmSelection: () => false,
  switchEmployee: () => false,
  selectAgent: () => false,
  selectAgentByForgeName: () => false,
  retry: () => {},
})

export interface DigitalEmployeeProviderProps {
  enabled: boolean
  children: React.ReactNode
}

export const DigitalEmployeeProvider: React.FC<DigitalEmployeeProviderProps> = ({ enabled, children }) => {
  const [agents, setAgents] = useState<AIForge[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>(DEFAULT_EMPLOYEE_ID)
  const [selectedAgentId, setSelectedAgentId] = useState<number>()
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [selectionVersion, setSelectionVersion] = useState(0)
  const requestVersionRef = useRef(0)

  const resolveAgents = async () => {
    const requestVersion = ++requestVersionRef.current
    setLoading(true)
    setError(undefined)

    try {
      const resolved = await queryAllForges()
      if (requestVersion !== requestVersionRef.current) return
      setAgents(resolved)
      setSelectedAgentId((currentId) =>
        currentId && resolved.some((agent) => agent.Id === currentId) ? currentId : undefined,
      )
    } catch (requestError) {
      if (requestVersion !== requestVersionRef.current) return
      setAgents([])
      setSelectedAgentId(undefined)
      setError('智能体列表暂时不可用，请确认引擎已连接后重试')
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) return
    resolveAgents()
  }, [enabled])

  const selectedEmployee = useMemo(() => {
    return EMPLOYEES.find((employee) => employee.id === selectedId)
  }, [selectedId])

  const selectedAgent = useMemo(() => {
    return agents.find((agent) => agent.Id === selectedAgentId)
  }, [agents, selectedAgentId])

  const roleAgents = useMemo(() => {
    if (!selectedId) return []
    return agents.filter((agent) => getDigitalEmployeeRoleId(agent) === selectedId)
  }, [agents, selectedId])

  const unassignedAgents = useMemo(() => {
    return agents.filter((agent) => !getDigitalEmployeeRoleId(agent))
  }, [agents])

  const selectEmployee = (id: string) => {
    if (!EMPLOYEES.some((employee) => employee.id === id)) return
    if (id !== selectedId) setSelectedAgentId(undefined)
    setSelectedId(id)
  }

  const confirmSelection = () => {
    if (!selectedEmployee) return false
    setConfirmed(true)
    return true
  }

  const switchEmployee = (id: string) => {
    const employee = EMPLOYEES.find((item) => item.id === id)
    if (!employee) return false
    if (id !== selectedId) {
      setSelectedAgentId(undefined)
      setSelectionVersion((version) => version + 1)
    }
    setSelectedId(id)
    setConfirmed(true)
    return true
  }

  const selectAgent = (id: number) => {
    const agent = agents.find((item) => item.Id === id)
    if (!agent || getDigitalEmployeeRoleId(agent) !== selectedId) return false
    if (agent.Id !== selectedAgentId) {
      setSelectedAgentId(agent.Id)
      setSelectionVersion((version) => version + 1)
    }
    return true
  }

  const selectAgentByForgeName = (forgeName?: string) => {
    if (!forgeName) return false
    const agent = agents.find((item) => item.ForgeName === forgeName)
    const roleId = getDigitalEmployeeRoleId(agent)
    if (!agent || !roleId) return false
    const selectionChanged = selectedId !== roleId || selectedAgentId !== agent.Id
    setSelectedId(roleId)
    setSelectedAgentId(agent.Id)
    setConfirmed(true)
    if (selectionChanged) setSelectionVersion((version) => version + 1)
    return true
  }

  const value = useMemo<DigitalEmployeeContextValue>(
    () => ({
      employees: EMPLOYEES,
      agents,
      roleAgents,
      unassignedAgents,
      selectedEmployee,
      selectedAgent,
      confirmed,
      loading,
      error,
      selectionVersion,
      selectEmployee,
      confirmSelection,
      switchEmployee,
      selectAgent,
      selectAgentByForgeName,
      retry: resolveAgents,
    }),
    [
      agents,
      roleAgents,
      unassignedAgents,
      selectedEmployee,
      selectedAgent,
      confirmed,
      loading,
      error,
      selectionVersion,
    ],
  )

  return <DigitalEmployeeContext.Provider value={value}>{children}</DigitalEmployeeContext.Provider>
}

export const useDigitalEmployee = () => {
  return useContext(DigitalEmployeeContext)
}
