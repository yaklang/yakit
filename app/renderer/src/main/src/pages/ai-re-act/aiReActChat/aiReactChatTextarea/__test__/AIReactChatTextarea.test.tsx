import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { AIChatTextareaProps } from '@/pages/ai-agent/template/type'
import { AIInputFooterRightEnum } from '@/pages/ai-agent/template/type'
import type { PendingAIChat } from '../../../hooks/ChatMultiSessionController'
import { AIReactChatTextarea } from '../AIReactChatTextarea'

const agentStore = createStore<{ pendingChat?: Pick<PendingAIChat, 'status'> }>(() => ({}))

vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: function useAgentStoreMock() {
    return useStore(agentStore)
  },
}))
vi.mock('../../../hooks/useGetChatDataStoreKey', () => ({ default: () => 'ai-agent-chat' }))
vi.mock('@/pages/ai-agent/template/template', () => ({
  AIChatTextarea: React.forwardRef(function Textarea(
    { loading, onSubmit, footerRightTypes, inputFooterRight }: AIChatTextareaProps,
    _ref,
  ) {
    return (
      <div>
        <button disabled={loading} onClick={() => onSubmit?.({ qs: 'hello', sessionId: 'draft' })}>
          submit
        </button>
        {footerRightTypes?.map((item) => (typeof item === 'string' ? null : item.component))}
        {inputFooterRight}
      </div>
    )
  }),
}))

beforeEach(() => {
  agentStore.setState({ pendingChat: undefined })
})
afterEach(cleanup)

describe('AIReactChatTextarea pending state', () => {
  it.each(['bound', 'failed'] as const)('blocks submit during handshake and releases it when %s', (outcome) => {
    const handleSubmit = vi.fn()
    agentStore.setState({ pendingChat: { status: 'connecting' } })
    render(<AIReactChatTextarea handleSubmit={handleSubmit} externalParameters={{}} />)
    expect(screen.getByRole('button', { name: 'submit' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(handleSubmit).not.toHaveBeenCalled()

    act(() => agentStore.setState({ pendingChat: outcome === 'failed' ? { status: 'failed' } : undefined }))
    expect(screen.getByRole('button', { name: 'submit' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(handleSubmit).toHaveBeenCalledExactlyOnceWith({ qs: 'hello', sessionId: 'draft' })
  })

  it('keeps the custom footer and follow-up input available during a session', () => {
    render(
      <AIReactChatTextarea
        handleSubmit={vi.fn()}
        externalParameters={{
          footerRightTypes: [
            {
              type: AIInputFooterRightEnum.Custom,
              key: 'audit-style',
              component: (
                <button key="audit-style" type="button">
                  audit style
                </button>
              ),
            },
          ],
        }}
      />,
    )
    expect(screen.getByRole('button', { name: 'submit' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'audit style' })).toBeEnabled()
  })
})
