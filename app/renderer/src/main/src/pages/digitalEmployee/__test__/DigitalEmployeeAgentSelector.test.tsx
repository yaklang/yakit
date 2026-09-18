import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIForge: vi.fn() }))

import { grpcQueryAIForge } from '@/pages/ai-agent/grpc'
import { DigitalEmployeeProvider, useDigitalEmployee } from '../DigitalEmployeeContext'
import { DigitalEmployeeAgentSelector } from '../DigitalEmployeeWorkspace'
import { createDigitalEmployeeRoleTag } from '../roleAssignment'

describe('DigitalEmployeeAgentSelector', () => {
  afterEach(() => {
    cleanup()
    vi.mocked(grpcQueryAIForge).mockReset()
  })

  it('shows only agents assigned to the selected role and records the selected agent', async () => {
    vi.mocked(grpcQueryAIForge).mockResolvedValue({
      Pagination: { Page: 1, Limit: 100 },
      Data: [
        {
          Id: 1,
          ForgeName: 'threat-primary',
          ForgeVerboseName: '威胁研判智能体',
          ForgeType: 'config',
          Tag: ['研判', createDigitalEmployeeRoleTag('threat-analyst')],
        },
        {
          Id: 2,
          ForgeName: 'incident-primary',
          ForgeVerboseName: '应急处置智能体',
          ForgeType: 'config',
          Tag: [createDigitalEmployeeRoleTag('incident-responder')],
        },
      ],
      Total: 2,
    } as never)

    const SelectedAgentProbe = () => {
      const { selectedAgent } = useDigitalEmployee()
      return <span data-testid="selected-agent">{selectedAgent?.ForgeName || 'none'}</span>
    }

    render(
      <DigitalEmployeeProvider enabled>
        <DigitalEmployeeAgentSelector />
        <SelectedAgentProbe />
      </DigitalEmployeeProvider>,
    )

    const threatAgent = await screen.findByRole('button', { name: /威胁研判智能体/ })
    expect(screen.getByRole('region', { name: /智能体列表，共1个/ })).toHaveAttribute('tabindex', '0')
    expect(screen.queryByText('应急处置智能体')).not.toBeInTheDocument()
    expect(screen.getByTestId('selected-agent')).toHaveTextContent('threat-primary')

    fireEvent.click(threatAgent)

    await waitFor(() => expect(screen.getByTestId('selected-agent')).toHaveTextContent('threat-primary'))
    expect(threatAgent).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('当前使用')).toBeInTheDocument()
  })

  it('searches locally without changing selection and clears the search when switching roles', async () => {
    vi.mocked(grpcQueryAIForge).mockResolvedValue({
      Data: [
        {
          Id: 1,
          ForgeName: 'threat-primary',
          ForgeVerboseName: '威胁分析',
          Tag: [createDigitalEmployeeRoleTag('threat-analyst')],
        },
        {
          Id: 2,
          ForgeName: 'xdr-helper',
          ForgeVerboseName: '告警助手',
          Description: '关联分析事件',
          Tag: ['日志审计', createDigitalEmployeeRoleTag('threat-analyst')],
        },
        {
          Id: 3,
          ForgeName: 'incident-primary',
          ForgeVerboseName: '应急处置',
          Tag: [createDigitalEmployeeRoleTag('incident-responder')],
        },
      ],
      Total: 3,
    } as never)
    const Controls = () => {
      const { selectedAgent, switchEmployee } = useDigitalEmployee()
      return (
        <>
          <span data-testid="selection">{selectedAgent?.ForgeName || 'none'}</span>
          <button onClick={() => switchEmployee('incident-responder')}>切换应急</button>
        </>
      )
    }
    render(
      <DigitalEmployeeProvider enabled>
        <DigitalEmployeeAgentSelector />
        <Controls />
      </DigitalEmployeeProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: /告警助手/ }))
    const input = screen.getByRole('textbox', { name: '搜索当前角色的智能体' })
    for (const keyword of [' XDR ', '告警助手', '关联分析', '日志审计']) {
      fireEvent.change(input, { target: { value: keyword } })
      expect(screen.getByRole('button', { name: /告警助手/ })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByRole('button', { name: /威胁分析/ })).not.toBeInTheDocument()
    }
    fireEvent.change(input, { target: { value: '没有这个智能体' } })
    expect(screen.getByText('没有找到匹配的智能体')).toBeInTheDocument()
    expect(screen.getByTestId('selection')).toHaveTextContent('xdr-helper')
    fireEvent.click(screen.getByRole('button', { name: '清空搜索' }))
    expect(screen.getByRole('button', { name: /威胁分析/ })).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'senso-role:' } })
    expect(screen.getByText('没有找到匹配的智能体')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '切换应急' }))
    expect(input).toHaveValue('')
    expect(screen.getByRole('button', { name: /应急处置/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('selection')).toHaveTextContent('incident-primary')
    expect(grpcQueryAIForge).toHaveBeenCalledTimes(1)
  })

  it('keeps a manual selection on refresh and chooses a fallback when that agent disappears', async () => {
    const first = { Id: 10, ForgeName: 'first', Tag: [createDigitalEmployeeRoleTag('threat-analyst')] }
    const second = { Id: 20, ForgeName: 'second', Tag: [createDigitalEmployeeRoleTag('threat-analyst')] }
    vi.mocked(grpcQueryAIForge).mockResolvedValue({ Data: [second, first], Total: 2 } as never)
    const Controls = () => {
      const { selectedAgent, retry } = useDigitalEmployee()
      return (
        <>
          <span data-testid="selection">{selectedAgent?.ForgeName || 'none'}</span>
          <button onClick={retry}>刷新列表</button>
        </>
      )
    }
    render(
      <DigitalEmployeeProvider enabled>
        <DigitalEmployeeAgentSelector />
        <Controls />
      </DigitalEmployeeProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('selection')).toHaveTextContent('first'))
    fireEvent.click(screen.getByRole('button', { name: /second/ }))
    const newer = { ...first, Id: 1, ForgeName: 'new-first' }
    vi.mocked(grpcQueryAIForge).mockResolvedValue({ Data: [newer, first, second], Total: 3 } as never)
    fireEvent.click(screen.getByRole('button', { name: '刷新列表' }))
    await screen.findByRole('button', { name: /new-first/ })
    expect(screen.getByTestId('selection')).toHaveTextContent('second')
    vi.mocked(grpcQueryAIForge).mockResolvedValue({ Data: [newer, first], Total: 2 } as never)
    fireEvent.click(screen.getByRole('button', { name: '刷新列表' }))
    await waitFor(() => expect(screen.getByTestId('selection')).toHaveTextContent('new-first'))
  })
})
