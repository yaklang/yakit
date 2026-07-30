import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIForge: vi.fn() }))

import { DigitalEmployeeSelectPage } from '../DigitalEmployeeSelectPage'
import * as DigitalEmployeeContext from '../DigitalEmployeeContext'
import { DIGITAL_EMPLOYEES } from '../config'

describe('DigitalEmployeeSelectPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all employees with the first employee selected by default', () => {
    const switchEmployee = vi.fn(() => true)
    const confirmSelection = vi.fn(() => true)
    const employees = DIGITAL_EMPLOYEES.map((employee) => ({
      ...employee,
      status: 'ready' as const,
    }))

    vi.spyOn(DigitalEmployeeContext, 'useDigitalEmployee').mockReturnValue({
      employees,
      selectedEmployee: employees[0],
      confirmed: false,
      loading: false,
      selectionVersion: 0,
      selectEmployee: vi.fn(),
      confirmSelection,
      switchEmployee,
      retry: vi.fn(),
    })

    const { container } = render(<DigitalEmployeeSelectPage />)
    const employeeCards = container.querySelectorAll('[aria-pressed]')
    const selectedStateOverlays = container.querySelectorAll('img[src*="senso-card-selected-overlay"]')
    const employeeBadgeIcons = container.querySelectorAll('[aria-pressed] > span[aria-hidden="true"] svg')
    const quickNavigationIcons = container.querySelectorAll('section[aria-label="快速导航"] svg')

    expect(employeeCards).toHaveLength(8)
    expect(employeeBadgeIcons).toHaveLength(8)
    expect(quickNavigationIcons).toHaveLength(6)
    expect(employeeCards[0].querySelectorAll('img')).toHaveLength(1)
    expect(screen.getByText('当前选择')).toBeInTheDocument()
    expect(employeeCards[0]).toHaveAttribute('aria-pressed', 'true')
    expect(employeeCards[1]).toHaveAttribute('aria-pressed', 'false')
    expect(selectedStateOverlays).toHaveLength(0)
    expect(screen.getAllByText('选择 TA / 进入')).toHaveLength(8)

    DIGITAL_EMPLOYEES.forEach((employee) => {
      expect(screen.getByText(employee.name)).toBeInTheDocument()
      expect(screen.getByText(employee.cardDescription)).toBeInTheDocument()
    })

    fireEvent.click(employeeCards[1])
    expect(switchEmployee).toHaveBeenCalledWith(DIGITAL_EMPLOYEES[1].id)

    const confirmButton = screen.getByRole('button', { name: '确认选择，开启智能安全工作' })
    expect(confirmButton).toBeEnabled()
    fireEvent.click(confirmButton)
    expect(confirmSelection).toHaveBeenCalledTimes(1)
  })

  it('allows the selected employee to enter before Forge resolution completes', () => {
    const ContextProbe = () => {
      const { selectedEmployee, confirmed, confirmSelection } = DigitalEmployeeContext.useDigitalEmployee()
      return (
        <button type="button" onClick={confirmSelection}>
          {confirmed ? '已进入' : selectedEmployee?.name}
        </button>
      )
    }

    render(
      <DigitalEmployeeContext.DigitalEmployeeProvider enabled={false}>
        <ContextProbe />
      </DigitalEmployeeContext.DigitalEmployeeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: DIGITAL_EMPLOYEES[0].name }))
    expect(screen.getByRole('button', { name: '已进入' })).toBeInTheDocument()
  })

  it('increments the selection version when switching employees', () => {
    const ContextProbe = () => {
      const { employees, selectedEmployee, selectionVersion, switchEmployee } =
        DigitalEmployeeContext.useDigitalEmployee()

      return (
        <button type="button" onClick={() => switchEmployee(employees[1].id)}>
          {selectedEmployee?.name}:{selectionVersion}
        </button>
      )
    }

    render(
      <DigitalEmployeeContext.DigitalEmployeeProvider enabled={false}>
        <ContextProbe />
      </DigitalEmployeeContext.DigitalEmployeeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: `${DIGITAL_EMPLOYEES[0].name}:0` }))
    expect(screen.getByRole('button', { name: `${DIGITAL_EMPLOYEES[1].name}:1` })).toBeInTheDocument()
  })
})
