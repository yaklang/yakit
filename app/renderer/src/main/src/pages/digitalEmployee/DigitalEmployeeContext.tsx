import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { grpcQueryAIForge } from '@/pages/ai-agent/grpc'
import { AIForge } from '@/pages/ai-agent/type/forge'
import { DIGITAL_EMPLOYEES, DigitalEmployeeDefinition, getDigitalEmployeeForgeId } from './config'
import { findForgeById } from './resolver'

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
  const [employees, setEmployees] = useState<DigitalEmployee[]>(createInitialEmployees)
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
    setEmployees((prev) => prev.map((employee) => ({ ...employee, status: 'loading' })))

    const resolved = await Promise.all(
      DIGITAL_EMPLOYEES.map(async (employee): Promise<DigitalEmployee> => {
        try {
          const forgeId = getDigitalEmployeeForgeId(employee)
          const result = await grpcQueryAIForge(
            {
              Pagination: {
                Page: 1,
                Limit: 1,
                OrderBy: 'updated_at',
                Order: 'desc',
              },
              Filter: {
                Id: forgeId,
              },
            },
            true,
          )
          const forge = findForgeById(result.Data || [], forgeId)
          return {
            ...employee,
            forge,
            status: forge ? 'ready' : 'missing',
          }
        } catch (requestError) {
          return {
            ...employee,
            status: 'error',
          }
        }
      }),
    )

    if (requestVersion !== requestVersionRef.current) return
    setEmployees(resolved)
    setLoading(false)

    if (resolved.every((employee) => employee.status === 'error')) {
      setError('技能库暂时不可用，请确认引擎已连接后重试')
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
