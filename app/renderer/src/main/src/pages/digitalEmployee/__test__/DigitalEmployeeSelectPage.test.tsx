import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIForge: vi.fn() }))

import { DigitalEmployeeSelectPage } from '../DigitalEmployeeSelectPage'
import * as DigitalEmployeeContext from '../DigitalEmployeeContext'
import { DIGITAL_EMPLOYEES } from '../config'
import { grpcQueryAIForge } from '@/pages/ai-agent/grpc'
import type { AIForge } from '@/pages/ai-agent/type/forge'

describe('DigitalEmployeeSelectPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.mocked(grpcQueryAIForge).mockReset()
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
    const actionArrowGroups = container.querySelectorAll('[aria-pressed] .card-action-arrows')
    const quickNavigationIcons = container.querySelectorAll('section[aria-label="快速导航"] svg')

    expect(employeeCards).toHaveLength(DIGITAL_EMPLOYEES.length)
    expect(employeeBadgeIcons).toHaveLength(DIGITAL_EMPLOYEES.length)
    expect(actionArrowGroups).toHaveLength(DIGITAL_EMPLOYEES.length)
    actionArrowGroups.forEach((group) => expect(group.querySelectorAll('svg')).toHaveLength(3))
    expect(quickNavigationIcons).toHaveLength(6)
    expect(employeeCards[0].querySelectorAll('img')).toHaveLength(1)
    expect(screen.getByText('当前选择')).toBeInTheDocument()
    expect(employeeCards[0]).toHaveAttribute('aria-pressed', 'true')
    expect(employeeCards[1]).toHaveAttribute('aria-pressed', 'false')
    expect(selectedStateOverlays).toHaveLength(0)
    expect(screen.getAllByText('选择 TA / 进入')).toHaveLength(DIGITAL_EMPLOYEES.length)
    expect(screen.queryByRole('navigation', { name: '数字员工翻页' })).not.toBeInTheDocument()

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

  it('renders additional employee cards from context without an eight-card limit', () => {
    const extraEmployee = {
      ...DIGITAL_EMPLOYEES[0],
      id: 'extra-employee',
      order: DIGITAL_EMPLOYEES.length + 1,
      name: '扩展数字员工',
    }
    const employees = [...DIGITAL_EMPLOYEES, extraEmployee].map((employee) => ({
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
      confirmSelection: vi.fn(() => true),
      switchEmployee: vi.fn(() => true),
      retry: vi.fn(),
    })

    const { container } = render(<DigitalEmployeeSelectPage />)

    expect(container.querySelectorAll('[aria-pressed]')).toHaveLength(DIGITAL_EMPLOYEES.length + 1)
    expect(screen.getByText('扩展数字员工')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '数字员工翻页' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /切换到第 \d+ 页/ })).toHaveLength(2)
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByRole('button', { name: '切换到第 2 页' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()
  })

  it('renders exactly one employee for each Forge returned by the backend', async () => {
    const forges: AIForge[] = DIGITAL_EMPLOYEES.map((employee, index) => ({
      Id: 101 + index,
      ForgeName: `forge-${employee.order}`,
      ForgeVerboseName: employee.name,
      ForgeType: 'config' as const,
    }))
    forges[0] = {
      ...forges[0],
      ForgeVerboseName: '后端更新的智能体名称',
      Description: '后端更新的智能体描述',
      Tag: ['后端标签一', '后端标签二'],
    }
    forges.push({
      Id: 109,
      ForgeName: 'ssa_project_scan_check',
      ForgeVerboseName: 'SSA项目检查',
      ForgeType: 'config',
    })
    vi.mocked(grpcQueryAIForge).mockResolvedValue({
      Pagination: { Page: 1, Limit: 100 },
      Data: forges,
      Total: forges.length,
    } as never)

    const ContextProbe = () => {
      const { employees } = DigitalEmployeeContext.useDigitalEmployee()
      return (
        <div>
          <span data-testid="employee-count">{employees.length}</span>
          {employees.map((employee) => (
            <span
              key={employee.id}
              data-employee-id={employee.id}
              data-portrait={employee.portrait}
              data-forge-id={employee.forge?.Id}
              data-description={employee.cardDescription}
              data-skills={employee.skills.join(',')}
            >
              {employee.name}
            </span>
          ))}
        </div>
      )
    }

    render(
      <DigitalEmployeeContext.DigitalEmployeeProvider enabled>
        <ContextProbe />
      </DigitalEmployeeContext.DigitalEmployeeProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('employee-count')).toHaveTextContent('9'))
    expect(screen.getByText('后端更新的智能体名称')).toHaveAttribute('data-forge-id', '101')
    expect(screen.getByText('后端更新的智能体名称')).toHaveAttribute('data-employee-id', DIGITAL_EMPLOYEES[0].id)
    expect(screen.getByText('后端更新的智能体名称')).toHaveAttribute('data-description', '后端更新的智能体描述')
    expect(screen.getByText('后端更新的智能体名称')).toHaveAttribute('data-skills', '后端标签一,后端标签二')
    expect(screen.getByText('后端更新的智能体名称')).toHaveAttribute('data-portrait', DIGITAL_EMPLOYEES[0].portrait)
    expect(screen.getByText('SSA项目检查')).toHaveAttribute('data-forge-id', '109')
    expect(screen.getByText('SSA项目检查')).toHaveAttribute('data-portrait', DIGITAL_EMPLOYEES[0].portrait)
    expect(grpcQueryAIForge).toHaveBeenCalledTimes(1)
    expect(grpcQueryAIForge).toHaveBeenCalledWith(
      expect.objectContaining({ Pagination: expect.objectContaining({ Page: 1, Limit: 100 }) }),
      true,
    )
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
