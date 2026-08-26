import React, { useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIForge: vi.fn() }))

import { DigitalEmployeeSelectPage } from '../DigitalEmployeeSelectPage'
import { DigitalEmployeeGate } from '../DigitalEmployeeGate'
import * as DigitalEmployeeContext from '../DigitalEmployeeContext'
import { DIGITAL_EMPLOYEES } from '../config'
import { YakitRoute } from '@/enums/yakitRoute'
import { grpcQueryAIForge } from '@/pages/ai-agent/grpc'
import type { AIForge } from '@/pages/ai-agent/type/forge'
import { consumeDigitalEmployeeQuickNavigation } from '../quickNavigation'
import { createDigitalEmployeeRoleTag } from '../roleAssignment'

describe('DigitalEmployeeSelectPage', () => {
  afterEach(() => {
    consumeDigitalEmployeeQuickNavigation()
    vi.restoreAllMocks()
    vi.mocked(grpcQueryAIForge).mockReset()
  })

  it('renders all employees with the first employee selected by default', () => {
    const switchEmployee = vi.fn(() => true)
    const confirmSelection = vi.fn(() => true)
    const onQuickNavigation = vi.fn()
    const employees = DIGITAL_EMPLOYEES.map((employee) => ({
      ...employee,
      status: 'ready' as const,
    }))

    vi.spyOn(DigitalEmployeeContext, 'useDigitalEmployee').mockReturnValue({
      employees,
      agents: [],
      roleAgents: [],
      unassignedAgents: [],
      selectedEmployee: employees[0],
      selectedAgent: undefined,
      confirmed: false,
      loading: false,
      selectionVersion: 0,
      selectEmployee: vi.fn(),
      confirmSelection,
      switchEmployee,
      selectAgent: vi.fn(() => true),
      selectAgentByForgeName: vi.fn(() => false),
      retry: vi.fn(),
    })

    const { container } = render(<DigitalEmployeeSelectPage onQuickNavigation={onQuickNavigation} />)
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
    const navigationItems = [
      ['智能体广场', YakitRoute.AI_Forge],
      ['知识库', YakitRoute.AI_REPOSITORY],
      ['记忆库', YakitRoute.AI_Memory],
      ['工具库', YakitRoute.AI_Tool],
      ['插件仓库', YakitRoute.Plugin_Hub],
      ['流量历史', YakitRoute.DB_HTTPHistory],
    ] as const
    navigationItems.forEach(([title]) => {
      fireEvent.click(screen.getByRole('button', { name: `打开${title}` }))
    })
    navigationItems.forEach(([, route], index) => {
      expect(onQuickNavigation).toHaveBeenNthCalledWith(index + 1, route)
    })
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

  it('uses the quick-navigation route after the default employee page is initialized', async () => {
    const setCurrentRoute = vi.fn()

    const MainContentProbe = () => {
      useEffect(() => {
        setCurrentRoute(YakitRoute.AI_Agent)
        const quickNavigationRoute = consumeDigitalEmployeeQuickNavigation()
        if (quickNavigationRoute) setCurrentRoute(quickNavigationRoute)
      }, [])
      return <div>主页面已挂载</div>
    }

    render(
      <DigitalEmployeeContext.DigitalEmployeeProvider enabled={false}>
        <DigitalEmployeeGate>
          <MainContentProbe />
        </DigitalEmployeeGate>
      </DigitalEmployeeContext.DigitalEmployeeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '打开知识库' }))

    await waitFor(() => expect(screen.getByText('主页面已挂载')).toBeInTheDocument())
    expect(setCurrentRoute).toHaveBeenNthCalledWith(1, YakitRoute.AI_Agent)
    expect(setCurrentRoute).toHaveBeenLastCalledWith(YakitRoute.AI_REPOSITORY)
    expect(consumeDigitalEmployeeQuickNavigation()).toBeUndefined()
  })

  it('keeps eight roles and groups multiple backend agents by their explicit role marker', async () => {
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
      Tag: ['后端标签一', '后端标签二', createDigitalEmployeeRoleTag(DIGITAL_EMPLOYEES[0].id)],
    }
    forges[1] = {
      ...forges[1],
      Tag: [createDigitalEmployeeRoleTag(DIGITAL_EMPLOYEES[0].id)],
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
      const { employees, agents, roleAgents, unassignedAgents } = DigitalEmployeeContext.useDigitalEmployee()
      return (
        <div>
          <span data-testid="employee-count">{employees.length}</span>
          <span data-testid="agent-count">{agents.length}</span>
          <span data-testid="role-agent-count">{roleAgents.length}</span>
          <span data-testid="unassigned-count">{unassignedAgents.length}</span>
        </div>
      )
    }

    render(
      <DigitalEmployeeContext.DigitalEmployeeProvider enabled>
        <ContextProbe />
      </DigitalEmployeeContext.DigitalEmployeeProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('agent-count')).toHaveTextContent('9'))
    expect(screen.getByTestId('employee-count')).toHaveTextContent(String(DIGITAL_EMPLOYEES.length))
    expect(screen.getByTestId('role-agent-count')).toHaveTextContent('2')
    expect(screen.getByTestId('unassigned-count')).toHaveTextContent('7')
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
