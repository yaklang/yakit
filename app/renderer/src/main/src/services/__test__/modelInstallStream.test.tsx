import React from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InstallLlamaServer } from '../../pages/ai-agent/aiModelList/installLlamaServerModelPrompt/InstallLlamaServerModelPrompt'

const mocks = vi.hoisted(() => ({ openStream: vi.fn(), notify: vi.fn() }))
vi.mock('@/services/ipc', () => ({ ipc: { openStream: mocks.openStream } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify }))
vi.mock('@/components/yakitUI/YakitHint/YakitHint', () => ({
  YakitHint: ({ children, onCancel }) => (
    <div>
      {children}
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({ YakitInput: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({ YakitButton: () => null }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@yakit-libs/yakit-ui-icons/solid', () => ({ CloudDownloadSolid: () => null }))
beforeEach(() => {
  mocks.openStream.mockReset()
  mocks.notify.mockReset()
})

describe('local model installation stream', () => {
  it('receives opening data and cancels its own instance on unmount', async () => {
    const finish = vi.fn()
    mocks.openStream.mockImplementation(async (_namespace, _api, _params, options) => {
      options.onData({ Progress: 12, IsMessage: true, Message: new TextEncoder().encode('first progress') })
      return {}
    })
    const params = { Proxy: 'http://127.0.0.1:8080' }
    const view = render(
      <InstallLlamaServer
        grpcInterface="InstallLlamaServer"
        params={params}
        token="install"
        title="install"
        onFinished={finish}
        onCancel={vi.fn()}
      />,
    )
    await act(async () => {})
    expect(view.getByText('first progress')).toBeTruthy()
    expect(mocks.openStream).toHaveBeenCalledWith(
      'grpc',
      'InstallLlamaServer',
      params,
      expect.objectContaining({ token: 'install' }),
    )
    const options = mocks.openStream.mock.calls[0][3]
    view.unmount()
    expect(options.signal.aborted).toBe(true)
    act(() => {
      options.onEnd()
      options.onError(new Error('stale'))
    })
    expect(finish).not.toHaveBeenCalled()
    expect(mocks.notify).not.toHaveBeenCalled()
  })

  it('reports an opening failure without reporting a successful installation', async () => {
    mocks.openStream.mockRejectedValue(new Error('download failed'))
    const finish = vi.fn()
    render(
      <InstallLlamaServer
        grpcInterface="DownloadLocalModel"
        params={{ ModelName: 'model', Proxy: '' }}
        token="download"
        title="download"
        onFinished={finish}
        onCancel={vi.fn()}
      />,
    )
    await act(async () => {})
    expect(mocks.notify).toHaveBeenCalledOnce()
    expect(mocks.notify).toHaveBeenCalledWith('error', expect.stringContaining('download failed'))
    expect(finish).not.toHaveBeenCalled()
  })
})
