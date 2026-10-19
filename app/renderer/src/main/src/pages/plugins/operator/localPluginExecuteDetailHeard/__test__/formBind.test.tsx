import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Form } from 'antd'
import { describe, expect, it, vi } from 'vitest'
import type { YakParamProps } from '@/pages/plugins/pluginsType'

vi.hoisted(() => {
  const ipcRenderer = {
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn(async () => undefined),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  ;(window as unknown as { require: (name: string) => { ipcRenderer: typeof ipcRenderer } }).require = () => ({
    ipcRenderer,
  })
  window.matchMedia = () =>
    ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
})

import { OutputFormComponentsByType } from '../LocalPluginExecuteDetailHeard'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))

vi.mock('@/components/yakitUI/YakitEditor/extraYakitEditor', () => ({
  HTTPPacketYakitEditor: (props: { value?: string; setValue?: (value: string) => void }) => (
    <textarea data-testid="http-editor" value={props.value ?? ''} onChange={(e) => props.setValue?.(e.target.value)} />
  ),
}))

vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: (props: { value?: string; setValue?: (value: string) => void }) => (
    <textarea data-testid="yak-editor" value={props.value ?? ''} onChange={(e) => props.setValue?.(e.target.value)} />
  ),
}))

const param = (type: string): YakParamProps => ({
  Field: 'body',
  FieldVerbose: 'body',
  Required: true,
  TypeVerbose: type,
  DefaultValue: 'init',
  Help: '',
})

describe('OutputFormComponentsByType 编辑器表单绑定', () => {
  it('HTTP 与 Yak 编辑会写回表单，清空后必填不通过', async () => {
    const onFinish = vi.fn()
    const { unmount } = render(
      <Form onFinish={onFinish}>
        <OutputFormComponentsByType item={param('http-packet')} />
        <button type="submit">submit</button>
      </Form>,
    )

    const http = await screen.findByTestId('http-editor')
    expect(http).toHaveValue('init')
    fireEvent.change(http, { target: { value: 'edited-http' } })
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith({ body: 'edited-http' }))

    fireEvent.change(screen.getByTestId('http-editor'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    unmount()

    onFinish.mockClear()
    render(
      <Form onFinish={onFinish}>
        <OutputFormComponentsByType item={param('yak')} />
        <button type="submit">submit</button>
      </Form>,
    )
    const yak = await screen.findByTestId('yak-editor')
    expect(yak).toHaveValue('init')
    fireEvent.change(yak, { target: { value: 'edited-yak' } })
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith({ body: 'edited-yak' }))
  })
})
