import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { grpcQueryAIForge } from '@/pages/ai-agent/grpc'
import { AIForge } from '@/pages/ai-agent/type/forge'
import { DIGITAL_EMPLOYEES, DIGITAL_EMPLOYEE_PORTRAITS, DigitalEmployeeDefinition } from './config'

export type DigitalEmployeeResolveStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error'

export interface DigitalEmployee extends DigitalEmployeeDefinition {
  forge?: AIForge
  status: DigitalEmployeeResolveStatus
}

interface DigitalEmployeeContextValue {
  employees: DigitalEmployee[]
  selectedEmployee?: DigitalEmployee
  confirmed: boolean
  loading: boolean
  error?: string
  selectionVersion: number
  selectEmployee: (id: string) => void
  confirmSelection: () => boolean
  switchEmployee: (id: string) => boolean
  retry: () => void
}

const createInitialEmployees = (): DigitalEmployee[] => {
  return DIGITAL_EMPLOYEES.map((employee) => ({ ...employee, status: 'idle' }))
}

const DEFAULT_EMPLOYEE_ID = DIGITAL_EMPLOYEES[0]?.id
const FORGE_PAGE_SIZE = 100
const GENERATED_EMPLOYEE_ACCENTS = ['#237fea', '#735cff', '#13a8a8', '#178bd8']

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
  const responses = [firstPage, ...remainingPages]
  responses.forEach((response) => {
    const pageForges = response.Data || []
    pageForges.forEach((forge) => forgeMap.set(forge.Id, forge))
  })
  return [...forgeMap.values()].sort((a, b) => a.Id - b.Id)
}

const createGeneratedEmployee = (forge: AIForge, order: number): DigitalEmployee => {
  const displayName = forge.ForgeVerboseName?.trim() || forge.ForgeName || `智能体 ${forge.Id}`
  const description = forge.Description?.trim() || `${displayName}智能体`
  return {
    id: `forge-${forge.Id}`,
    order,
    name: displayName,
    forgeVerboseName: displayName,
    description,
    cardDescription: description,
    skills: forge.Tag?.length ? forge.Tag : [forge.ForgeType],
    portrait: DIGITAL_EMPLOYEE_PORTRAITS[(order - 1) % DIGITAL_EMPLOYEE_PORTRAITS.length],
    accent: GENERATED_EMPLOYEE_ACCENTS[(order - 1) % GENERATED_EMPLOYEE_ACCENTS.length],
    forge,
    status: 'ready',
  }
}

const DigitalEmployeeContext = createContext<DigitalEmployeeContextValue>({
  employees: createInitialEmployees(),
  selectedEmployee: createInitialEmployees()[0],
  confirmed: false,
  loading: false,
  error: undefined,
  selectionVersion: 0,
  selectEmployee: () => {},
  confirmSelection: () => false,
  switchEmployee: () => false,
  retry: () => {},
})

export interface DigitalEmployeeProviderProps {
  enabled: boolean
  children: React.ReactNode
}

export const DigitalEmployeeProvider: React.FC<DigitalEmployeeProviderProps> = ({ enabled, children }) => {
  const [employees, setEmployees] = useState<DigitalEmployee[]>(() => (enabled ? [] : createInitialEmployees()))
  const [selectedId, setSelectedId] = useState<string | undefined>(DEFAULT_EMPLOYEE_ID)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [selectionVersion, setSelectionVersion] = useState(0)
  const requestVersionRef = useRef(0)

  const resolveEmployees = async () => {
    const requestVersion = ++requestVersionRef.current
    setLoading(true)
    setError(undefined)
    setEmployees([])

    let resolved: DigitalEmployee[]
    let requestFailed = false
    try {
      const forges = await queryAllForges()
      resolved = forges.map((forge, index): DigitalEmployee => {
        const order = index + 1
        const employeeTemplate = DIGITAL_EMPLOYEES[index]
        const forgeEmployee = createGeneratedEmployee(forge, order)
        if (!employeeTemplate) return forgeEmployee
        return {
          ...forgeEmployee,
          id: employeeTemplate.id,
          portrait: employeeTemplate.portrait,
          accent: employeeTemplate.accent,
        }
      })
    } catch (requestError) {
      requestFailed = true
      resolved = []
    }

    if (requestVersion !== requestVersionRef.current) return
    setEmployees(resolved)
    setLoading(false)

    if (requestFailed) {
      setError('技能库暂时不可用，请确认引擎已连接后重试')
    } else if (resolved.length === 0) {
      setError('智能体广场暂无可用智能体')
    }
  }

  useEffect(() => {
    if (!enabled) return
    resolveEmployees()
  }, [enabled])

  const selectedEmployee = useMemo(() => {
    return employees.find((employee) => employee.id === selectedId)
  }, [employees, selectedId])

  const selectEmployee = (id: string) => {
    setSelectedId(id)
  }

  const confirmSelection = () => {
    if (!selectedEmployee) return false
    setConfirmed(true)
    setSelectionVersion((version) => version + 1)
    return true
  }

  const switchEmployee = (id: string) => {
    const employee = employees.find((item) => item.id === id)
    if (!employee) return false
    setSelectedId(id)
    setConfirmed(true)
    setSelectionVersion((version) => version + 1)
    return true
  }

  const value = useMemo<DigitalEmployeeContextValue>(
    () => ({
      employees,
      selectedEmployee,
      confirmed,
      loading,
      error,
      selectionVersion,
      selectEmployee,
      confirmSelection,
      switchEmployee,
      retry: resolveEmployees,
    }),
    [employees, selectedEmployee, confirmed, loading, error, selectionVersion],
  )

  return <DigitalEmployeeContext.Provider value={value}>{children}</DigitalEmployeeContext.Provider>
}

export const useDigitalEmployee = () => {
  return useContext(DigitalEmployeeContext)
}
