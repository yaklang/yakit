import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AIMCPForm } from '../aiMCPForm/AIMCPForm'
import { grpcAddMCPServer, grpcUpdateMCPServer } from '../utils'
import { yakitNotify } from '@/utils/notification'
import type { AddMCPServerRequest } from '../../type/aiMCP'

vi.mock('../utils', () => ({
  grpcAddMCPServer: vi.fn(),
  grpcUpdateMCPServer: vi.fn(),
}))
vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/pages/mitm/MITMRule/MITMRuleFromModal', () => ({
  InputHTTPHeaderForm: () => null,
}))

const created: AddMCPServerRequest = {
  Name: 'dup server',
  Type: 'sse',
  URL: 'http://127.0.0.1:8000/sse',
  Command: '',
  Enable: true,
  Envs: [],
  Headers: [],
}

// jsdom 没有 matchMedia，antd 响应式侦听需要
;(window as any).matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})

const fillForm = async () => {
  fireEvent.change(screen.getByLabelText('AIMCPForm.serverName'), { target: { value: created.Name } })
  // 协议类型默认 sse，只需再填 URL
  fireEvent.change(screen.getByLabelText('AIMCPForm.serverUrl'), { target: { value: created.URL } })
}

describe('AIMCPForm 保存', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })

  it('保存成功后回调保存值并关闭', async () => {
    vi.mocked(grpcAddMCPServer).mockResolvedValue({ Ok: true, Reason: '' })
    const onCancel = vi.fn()
    render(<AIMCPForm onCancel={onCancel} />)
    await fillForm()
    // 打开启用开关
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    await waitFor(() =>
      expect(onCancel).toHaveBeenCalledWith(
        expect.objectContaining({ Name: created.Name, Type: 'sse', URL: created.URL, Enable: true }),
      ),
    )
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('编辑保存成功回传含 ID 的保存值', async () => {
    vi.mocked(grpcUpdateMCPServer).mockResolvedValue({ Ok: true, Reason: '' })
    const onCancel = vi.fn()
    render(<AIMCPForm onCancel={onCancel} defaultValues={{ ...created, ID: 7, Name: 'old name' }} />)
    // 等待 defaultValues 回填表单
    await waitFor(() => expect(screen.getByLabelText('AIMCPForm.serverName')).toHaveValue('old name'))
    fireEvent.change(screen.getByLabelText('AIMCPForm.serverName'), { target: { value: created.Name } })
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    await waitFor(() =>
      expect(onCancel).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ ID: 7, Name: created.Name, Type: 'sse', URL: created.URL, Enable: true }),
      ),
    )
  })

  it('点击取消按钮无参数回调', async () => {
    const onCancel = vi.fn()
    render(<AIMCPForm onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onCancel.mock.calls[0]).toHaveLength(0)
  })

  it('重名等保存失败时提示错误，不回调不关闭', async () => {
    vi.mocked(grpcAddMCPServer).mockResolvedValue({ Ok: false, Reason: 'mcp server name already exists' })
    const onCancel = vi.fn()
    render(<AIMCPForm onCancel={onCancel} />)
    await fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    await waitFor(() => expect(grpcAddMCPServer).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      // 弹出错误提示，且不触发关闭回调
      expect(yakitNotify).toHaveBeenCalledExactlyOnceWith('error', 'mcp server name already exists')
    })
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('编辑保存失败同样提示错误，不回调不关闭', async () => {
    vi.mocked(grpcUpdateMCPServer).mockResolvedValue({ Ok: false, Reason: 'mcp server name already exists' })
    const onCancel = vi.fn()
    render(<AIMCPForm onCancel={onCancel} defaultValues={{ ...created, ID: 7 }} />)
    await fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    await waitFor(() => expect(grpcUpdateMCPServer).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      expect(yakitNotify).toHaveBeenCalledExactlyOnceWith('error', 'mcp server name already exists')
    })
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(onCancel).not.toHaveBeenCalled()
  })
})
