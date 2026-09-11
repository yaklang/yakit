import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemProxySettings } from '../SystemProxySettings'

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
})
