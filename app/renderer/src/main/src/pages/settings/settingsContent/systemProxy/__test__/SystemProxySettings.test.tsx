import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemProxySettings } from '../SystemProxySettings'
import { apiGetSystemProxy } from '@/utils/ConfigSystemProxy'
import emiter from '@/utils/eventBus/eventBus'

const { setSystemProxy } = vi.hoisted(() => ({
  setSystemProxy: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/ConfigSystemProxy', () => ({
  apiGetSystemProxy: vi.fn().mockResolvedValue({ Enable: true, CurrentProxy: '127.0.0.1:8083' }),
}))

vi.mock('@/utils/notification', () => ({
  info: vi.fn(),
  yakitFailed: vi.fn(),
}))

vi.mock('@/services/electronBridge', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    yakitHost: { setSystemProxy },
  }
})

describe('SystemProxySettings', () => {
  beforeEach(() => {
    setSystemProxy.mockClear()
    vi.mocked(apiGetSystemProxy).mockReset().mockResolvedValue({ Enable: true, CurrentProxy: '127.0.0.1:8083' })
  })

  it('拉取代理后展示已启用，关闭开关会下发反转 Enable', async () => {
    render(<SystemProxySettings />)
    await waitFor(() => {
      expect(screen.getByText('YakitButton.enabled')).toBeInTheDocument()
    })
    expect(document.querySelector('[data-settings-section="system-proxy"]')).toBeTruthy()

    const switchBtn = document.querySelector('.ant-switch') as HTMLElement
    expect(switchBtn).toBeTruthy()
    fireEvent.click(switchBtn)
    await waitFor(() => {
      expect(setSystemProxy).toHaveBeenCalledWith({ HttpProxy: '127.0.0.1:8083', Enable: false })
    })
  })

  it('修改地址草稿不会把已启用状态显示成未启用', async () => {
    render(<SystemProxySettings />)
    await waitFor(() => {
      expect(screen.getByText('YakitButton.enabled')).toBeInTheDocument()
    })
    const input = document.querySelector('input') as HTMLInputElement
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: '127.0.0.1:9090' } })
    expect(screen.getByText('YakitButton.enabled')).toBeInTheDocument()
    expect(screen.queryByText('YakitButton.notEnabled')).not.toBeInTheDocument()
    expect(document.querySelector('.ant-switch-checked')).toBeTruthy()
  })

  it('修改地址失焦后按当前启用状态下发新地址', async () => {
    render(<SystemProxySettings />)
    await waitFor(() => {
      expect(screen.getByText('YakitButton.enabled')).toBeInTheDocument()
    })
    const input = document.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '127.0.0.1:9090' } })
    fireEvent.blur(input)
    await waitFor(() => {
      expect(setSystemProxy).toHaveBeenCalledWith({ HttpProxy: '127.0.0.1:9090', Enable: true })
    })
  })

  it('地址未变化时失焦不会重复下发', async () => {
    render(<SystemProxySettings />)
    await waitFor(() => {
      expect(screen.getByText('YakitButton.enabled')).toBeInTheDocument()
    })
    const input = document.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('127.0.0.1:8083')
    fireEvent.blur(input)
    expect(setSystemProxy).not.toHaveBeenCalled()
  })

  it('编辑后回读空地址保留草稿，不再重置为默认值', async () => {
    vi.mocked(apiGetSystemProxy)
      .mockResolvedValueOnce({ Enable: true, CurrentProxy: '10.10.10.10:8888' })
      .mockResolvedValueOnce({ Enable: true, CurrentProxy: '' })
    render(<SystemProxySettings />)
    const input = document.querySelector('input') as HTMLInputElement
    await waitFor(() => {
      expect(input.value).toBe('10.10.10.10:8888')
    })
    fireEvent.change(input, { target: { value: '127.0.0.1:9090' } })
    emiter.emit('onRefConfigSystemProxy', '')
    await waitFor(() => {
      expect(apiGetSystemProxy).toHaveBeenCalledTimes(2)
    })
    // 等第二次回读的 Promise 生效后再断言：草稿保留，且失焦不再重复下发
    await act(async () => {
      await Promise.resolve()
    })
    expect(input.value).toBe('127.0.0.1:9090')
    fireEvent.blur(input)
    expect(setSystemProxy).not.toHaveBeenCalled()
  })
})
