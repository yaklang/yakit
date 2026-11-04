import './setupElectron'
import React from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStartAIChat } from '../useStartAIChat'
import type { HandleStartParams } from '@/pages/ai-agent/aiAgentChat/type'
import { AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'
let selected: any, active: any, start: ReturnType<typeof useStartAIChat>
const { onStart, activate, emit } = vi.hoisted(() => ({ onStart: vi.fn(), activate: vi.fn(), emit: vi.fn() }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({
    onStart,
    setActiveChat: activate,
    getSetting: () => ({
      TimelineSessionID: 'stale-config',
      Source: 'ai',
      SingleModelMode: true,
      RuntimeContextSizeLimit: 307200,
    }),
  }),
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: () => ({ activeChat: active, setting: { TimelineSessionID: 'stale-config' } }),
}))
vi.mock('@/pages/digitalEmployee/DigitalEmployeeContext', () => ({
  useDigitalEmployee: () => ({ selectedAgent: selected }),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit } }))
vi.mock('@/pages/ai-agent/utils', () => ({
  createActiveChatSessionId: () => 'fresh-session',
  formatAIAgentSetting: (s: any) => ({ ...s }),
  getAIReActRequestParams: () => ({
    attachedResourceInfo: [{ Key: 'file', Type: 'path', Value: 'allowed/report.txt' }],
  }),
}))
beforeEach(() => {
  vi.clearAllMocks()
  selected = { Id: 1, ForgeName: 'senso-forge', ForgeVerboseName: 'Senso role' }
  active = undefined
})
afterEach(cleanup)
function Harness({ transform }: { transform?: any }) {
  start = useStartAIChat({ startRequest: transform })
  return null
}
describe('AI Senso request capture and publication', () => {
  it('keeps the upload session ID, actual Forge and original resources until binding succeeds', () => {
    render(<Harness />)
    act(() => {
      start({ qs: 'first', sessionId: 'upload-session' } as HandleStartParams)
    })
    const input = onStart.mock.calls[0][0]
    expect(input).toMatchObject({
      kind: 'new',
      sessionId: 'upload-session',
      params: {
        Params: {
          ForgeName: 'senso-forge',
          TimelineSessionID: 'upload-session',
          SingleModelMode: true,
          RuntimeContextSizeLimit: 307200,
        },
        AttachedResourceInfo: expect.arrayContaining([{ Key: 'file', Type: 'path', Value: 'allowed/report.txt' }]),
      },
    })
    expect(
      input.params.AttachedResourceInfo.some(
        (r: any) => r.Type === AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_AIFORGE,
      ),
    ).toBe(true)
    expect(emit).not.toHaveBeenCalled()
    expect(activate).not.toHaveBeenCalled()
    act(() => input.onLinkSuccess('upload-session', true))
    expect(activate).toHaveBeenCalledWith(
      expect.objectContaining({
        SessionID: 'upload-session',
        StartParams: expect.objectContaining({ ForgeName: 'senso-forge', UserQuery: '' }),
      }),
    )
    expect(emit).toHaveBeenCalledTimes(1)
  })
  it('ignores the old configuration session ID and publishes a background success without changing the selected chat', async () => {
    let resolve!: (value: any) => void
    const transform = vi.fn(
      (_input: any) =>
        new Promise((r) => {
          resolve = r
        }),
    )
    const view = render(<Harness transform={transform} />)
    act(() => start({ qs: 'first' } as HandleStartParams))
    const captured = transform.mock.calls[0][0].params
    selected = { ForgeName: 'different' }
    active = { SessionID: 'another' }
    view.rerender(<Harness transform={transform} />)
    await act(async () => {
      resolve({ params: captured })
    })
    const input = onStart.mock.calls[0][0]
    expect(input).toMatchObject({
      kind: 'new',
      sessionId: 'fresh-session',
      params: { Params: { ForgeName: 'senso-forge' } },
    })
    act(() => input.onLinkSuccess('fresh-session', false))
    expect(activate).not.toHaveBeenCalled()
    expect(emit).toHaveBeenCalledTimes(1)
  })
  it('never starts a late asynchronous bridge request after its view unmounts', async () => {
    let resolve!: (value: any) => void
    const transform = vi.fn(
      (_input: any) =>
        new Promise((r) => {
          resolve = r
        }),
    )
    const view = render(<Harness transform={transform} />)
    act(() => start({ qs: 'first' } as HandleStartParams))
    view.unmount()
    await act(async () => resolve({ params: transform.mock.calls[0][0].params }))
    expect(onStart).not.toHaveBeenCalled()
  })
})
