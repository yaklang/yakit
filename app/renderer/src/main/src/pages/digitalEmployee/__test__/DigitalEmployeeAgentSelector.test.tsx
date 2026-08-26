import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIForge: vi.fn() }))

import { grpcQueryAIForge } from '@/pages/ai-agent/grpc'
import { DigitalEmployeeProvider, useDigitalEmployee } from '../DigitalEmployeeContext'
import { DigitalEmployeeAgentSelector } from '../DigitalEmployeeWorkspace'
import { createDigitalEmployeeRoleTag } from '../roleAssignment'

describe('DigitalEmployeeAgentSelector', () => {
  afterEach(() => {
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
    expect(screen.queryByText('应急处置智能体')).not.toBeInTheDocument()
    expect(screen.getByTestId('selected-agent')).toHaveTextContent('none')

    fireEvent.click(threatAgent)

    await waitFor(() => expect(screen.getByTestId('selected-agent')).toHaveTextContent('threat-primary'))
    expect(threatAgent).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('当前使用')).toBeInTheDocument()
  })
})
