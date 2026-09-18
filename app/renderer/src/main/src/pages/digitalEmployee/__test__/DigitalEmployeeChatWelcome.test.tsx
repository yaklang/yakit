import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIForge: vi.fn() }))
vi.mock('@/pages/ai-agent/template/template', () => ({
  AIChatTextarea: React.forwardRef(({ defaultMentions, submitDisabled, onSubmit }: any, ref) => (
    <div>
      <textarea aria-label="对话内容" />
      <span data-testid="default-forge">{defaultMentions?.[0]?.mentionName || 'none'}</span>
      <button disabled={submitDisabled} onClick={() => onSubmit({ qs: '分析告警', mentionList: defaultMentions })}>
        发送消息
      </button>
    </div>
  )),
}))

import { grpcQueryAIForge } from '@/pages/ai-agent/grpc'
import { DigitalEmployeeProvider } from '../DigitalEmployeeContext'
import { DigitalEmployeeChatWelcome } from '../DigitalEmployeeChatWelcome'
import { createDigitalEmployeeRoleTag } from '../roleAssignment'

describe('DigitalEmployeeChatWelcome', () => {
  afterEach(() => {
    cleanup()
    vi.mocked(grpcQueryAIForge).mockReset()
  })

  it('shows the input while loading, then submits with the default agent without requiring a click', async () => {
    let resolveAgents!: (value: any) => void
    vi.mocked(grpcQueryAIForge).mockReturnValue(
      new Promise((resolve) => {
        resolveAgents = resolve
      }) as never,
    )
    const onSubmit = vi.fn()
    render(
      <DigitalEmployeeProvider enabled>
        <DigitalEmployeeChatWelcome onSubmit={onSubmit} />
      </DigitalEmployeeProvider>,
    )
    expect(screen.getByRole('textbox', { name: '对话内容' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled()
    resolveAgents({
      Data: [
        {
          Id: 1,
          ForgeName: 'threat-primary',
          ForgeVerboseName: '默认威胁专家',
          Tag: [createDigitalEmployeeRoleTag('threat-analyst')],
        },
      ],
      Total: 1,
    })
    await waitFor(() => expect(screen.getByRole('button', { name: '发送消息' })).toBeEnabled())
    expect(screen.getByTestId('default-forge')).toHaveTextContent('默认威胁专家')
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        mentionList: [expect.objectContaining({ mentionName: '默认威胁专家', mentionType: 'forge', lock: true })],
      }),
    )
  })

  it('keeps the input visible without allowing submission for an empty role or a failed request', async () => {
    vi.mocked(grpcQueryAIForge).mockRejectedValue(new Error('offline'))
    const onSubmit = vi.fn()
    render(
      <DigitalEmployeeProvider enabled>
        <DigitalEmployeeChatWelcome onSubmit={onSubmit} />
      </DigitalEmployeeProvider>,
    )
    const retry = await screen.findByRole('button', { name: '重新加载' })
    expect(screen.getByRole('textbox', { name: '对话内容' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled()
    vi.mocked(grpcQueryAIForge).mockResolvedValue({ Data: [], Total: 0 } as never)
    fireEvent.click(retry)
    await screen.findByText('该角色暂时没有已分配的智能体')
    expect(screen.getByRole('textbox', { name: '对话内容' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
