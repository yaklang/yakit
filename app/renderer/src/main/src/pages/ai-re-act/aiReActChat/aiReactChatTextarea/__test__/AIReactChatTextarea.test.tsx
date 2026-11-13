import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { AIChatTextareaProps } from '@/pages/ai-agent/template/type'
import { AIInputFooterRightEnum } from '@/pages/ai-agent/template/type'
import type { PendingAIChat } from '../../../hooks/ChatMultiSessionController'
import { AITaskStatus } from '../../../hooks/grpcApi'
import { AIReactChatTextarea } from '../AIReactChatTextarea'

const agentStore = createStore<{ pendingChat?: Pick<PendingAIChat, 'status'> }>(() => ({}))
const chatStore = createStore(() => ({
  cancelChatLoading: false,
  currentChatStatus: { status: AITaskStatus.created },
}))

vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: function useAgentStoreMock() {
    return useStore(agentStore)
  },
}))
vi.mock('../../../hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => chatStore }))
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
        {footerRightTypes?.map((item) => item.component)}
        {inputFooterRight}
      </div>
    )
  }),
}))
vi.mock('../../AIReActComponent', () => ({
  RoundedStopButton: ({ loading, onClick }: { loading: boolean; onClick: () => void }) => (
    <button disabled={loading} onClick={onClick}>
      stop
    </button>
  ),
}))

beforeEach(() => {
  agentStore.setState({ pendingChat: undefined })
  chatStore.setState({ cancelChatLoading: false, currentChatStatus: { status: AITaskStatus.created } })
})
afterEach(cleanup)

describe('AIReactChatTextarea pending state', () => {
  it.each(['bound', 'failed'] as const)('blocks submit during handshake and releases it when %s', (outcome) => {
    const handleSubmit = vi.fn()
    agentStore.setState({ pendingChat: { status: 'connecting' } })
    render(<AIReactChatTextarea handleSubmit={handleSubmit} handleStopCasualTask={vi.fn()} externalParameters={{}} />)
    expect(screen.getByRole('button', { name: 'submit' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(handleSubmit).not.toHaveBeenCalled()

    act(() => agentStore.setState({ pendingChat: outcome === 'failed' ? { status: 'failed' } : undefined }))
    expect(screen.getByRole('button', { name: 'submit' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(handleSubmit).toHaveBeenCalledExactlyOnceWith({ qs: 'hello', sessionId: 'draft' })
  })

  it('keeps the custom footer, follow-up input and stop button available during a session', () => {
    const handleStopCasualTask = vi.fn()
    chatStore.setState({ currentChatStatus: { status: AITaskStatus.inProgress } })
    render(
      <AIReactChatTextarea
        handleSubmit={vi.fn()}
        handleStopCasualTask={handleStopCasualTask}
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
    fireEvent.click(screen.getByRole('button', { name: 'stop' }))
    expect(handleStopCasualTask).toHaveBeenCalledTimes(1)
    act(() => chatStore.setState({ cancelChatLoading: true }))
    expect(screen.getByRole('button', { name: 'stop' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'submit' })).toBeEnabled()
    act(() => chatStore.setState({ currentChatStatus: { status: AITaskStatus.created } }))
    expect(screen.queryByRole('button', { name: 'stop' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'audit style' })).toBeEnabled()
  })
})
