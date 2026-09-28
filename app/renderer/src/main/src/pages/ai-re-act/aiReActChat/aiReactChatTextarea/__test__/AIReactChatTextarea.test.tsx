import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { AIChatTextareaProps } from '@/pages/ai-agent/template/type'
import type { PendingAIChat } from '../../../hooks/ChatMultiSessionController'
import { AITaskStatus } from '../../../hooks/grpcApi'
import { AIReactChatTextarea } from '../AIReactChatTextarea'

const agentStore = createStore<{ pendingChat?: Pick<PendingAIChat, 'status'> }>(() => ({}))
const chatStore = createStore(() => ({
  cancelChatLoading: false,
  currentChatStatus: { status: AITaskStatus.created },
}))

vi.mock('@/pages/ai-agent/useContext/useStore', () => ({ default: () => useStore(agentStore) }))
vi.mock('../../../hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => chatStore }))
vi.mock('../../../hooks/useGetChatDataStoreKey', () => ({ default: () => 'ai-agent-chat' }))
vi.mock('@/pages/ai-agent/template/template', () => ({
  AIChatTextarea: React.forwardRef(function Textarea(
    { loading, onSubmit, inputFooterRight }: AIChatTextareaProps,
    _ref,
  ) {
    return (
      <div>
        <button disabled={loading} onClick={() => onSubmit?.({ qs: 'hello', sessionId: 'draft' })}>
          submit
        </button>
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

  it('keeps follow-up input available in a running bound session and preserves stop loading', () => {
    const handleStopCasualTask = vi.fn()
    chatStore.setState({ currentChatStatus: { status: AITaskStatus.inProgress } })
    render(
      <AIReactChatTextarea
        handleSubmit={vi.fn()}
        handleStopCasualTask={handleStopCasualTask}
        externalParameters={{}}
      />,
    )
    expect(screen.getByRole('button', { name: 'submit' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'stop' }))
    expect(handleStopCasualTask).toHaveBeenCalledTimes(1)
    act(() => chatStore.setState({ cancelChatLoading: true }))
    expect(screen.getByRole('button', { name: 'stop' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'submit' })).toBeEnabled()
  })
})
