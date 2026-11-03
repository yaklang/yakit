import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcRendererMock } from './setupElectron'

vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))

import { ChatMultiSessionController, globalSessionEngine } from '../ChatMultiSessionController'
import { useChatIPC } from '../useChatIPC'
import type { AIChatSendParams } from '../type'
import { YakitRoute } from '@/enums/yakitRoute'

const patch: AIChatSendParams = {
  token: 'session-a',
  type: 'casual',
  params: {
    IsConfigHotpatch: true,
    HotpatchType: 'RuntimeContextSizeLimit',
    Params: { RuntimeContextSizeLimit: 614400 },
  },
}

beforeEach(() => {
  vi.useFakeTimers()
  ipcRendererMock.invoke.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const connectedController = () => {
  const controller = new ChatMultiSessionController()
  for (const [id, limit] of [
    ['session-a', 122880],
    ['session-b', 245760],
  ] as const) {
    controller.ensureSession(id).store.getState().updateState({ execute: true, initLoading: false })
    controller.updateSessionConfig(id, { RuntimeContextSizeLimit: limit, ForgeName: `${id}-forge` })
    // Simulate the existing pong/ready boundary; no real engine or disk writes.
    ;(controller as unknown as { readyChannels: Set<string> }).readyChannels.add(id)
  }
  return controller
}

describe('runtime context hotpatch transport boundary', () => {
  it('routes the patch to one connected stream without adding a chat message or changing another session', () => {
    const controller = connectedController()
    const before = controller.ensureSession('session-b').request
    expect(controller.handleSendMessage(patch)).toBe(true)
    expect(ipcRendererMock.invoke).toHaveBeenCalledTimes(1)
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('send-ai-re-act', 'session-a', patch.params)
    expect(controller.ensureSession('session-a').rawData.contents.size).toBe(0)
    expect(controller.ensureSession('session-b').request).toBe(before)
    expect(before).toMatchObject({ RuntimeContextSizeLimit: 245760, ForgeName: 'session-b-forge' })
  })

  it('rejects disconnected sessions without invoking IPC or creating a new session', () => {
    const controller = new ChatMultiSessionController()
    const ensure = vi.spyOn(controller, 'ensureSession')
    expect(controller.handleSendMessage(patch)).toBe(false)
    expect(ipcRendererMock.invoke).not.toHaveBeenCalled()
    expect(ensure).not.toHaveBeenCalled()
  })

  it.each(['initLoading', 'grpcLoadMoreLoading'] as const)('rejects hotpatches during %s', (loading) => {
    const controller = connectedController()
    controller
      .ensureSession('session-a')
      .store.getState()
      .updateState({ [loading]: true })
    expect(controller.handleSendMessage(patch)).toBe(false)
    expect(ipcRendererMock.invoke).not.toHaveBeenCalled()
    expect(controller.ensureSession('session-a').request.RuntimeContextSizeLimit).toBe(122880)
  })

  it('reports synchronous send failures instead of returning success', () => {
    const controller = connectedController()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    ipcRendererMock.invoke.mockImplementationOnce(() => {
      throw new Error('send failed')
    })
    expect(controller.handleSendMessage(patch)).toBe(false)
  })

  it.each([true, false])('preserves the controller acceptance result %s through useChatIPC', (accepted) => {
    const send = vi.spyOn(globalSessionEngine, 'handleSendMessage').mockReturnValue(accepted)
    vi.spyOn(globalSessionEngine, 'onPageUnload').mockImplementation(() => {})
    let onSend: ReturnType<typeof useChatIPC>['onSend'] | undefined
    const Probe = () => {
      onSend = useChatIPC(YakitRoute.AI_Agent, YakitRoute.AI_Agent).onSend
      return null
    }
    render(<Probe />)
    expect(onSend!(patch)).toBe(accepted)
    expect(send).toHaveBeenCalledWith(patch)
  })
})
