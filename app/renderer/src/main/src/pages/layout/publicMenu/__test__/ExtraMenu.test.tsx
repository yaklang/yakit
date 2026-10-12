const { ipcRendererMock, callOrder, formStore, streamListeners } = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  const streamListeners = new Map<string, (event: unknown, data: unknown) => void>()
  ;(window as any).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    return {}
  }
  // 记录 IPC 监听注册与 invoke 启动导入流的先后顺序
  const callOrder: string[] = []
  // 可控的表单值存储：测试直接改 formStore.historyharPath 模拟用户填写的 HAR 路径
  const formStore: { historyharPath?: string } = {}
  return { ipcRendererMock, callOrder, formStore, streamListeners }
})

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, opts?: Record<string, string>) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
    i18n: { language: 'zh' },
    i18nRefresh: 0,
  }),
}))

vi.mock('antd', () => {
  const FormMock: React.FC<{ children?: React.ReactNode }> & { useForm: () => [unknown] } = ({ children }) => (
    <form>{children}</form>
  )
  FormMock.useForm = () => [
    {
      setFieldsValue: (v: Record<string, string>) => Object.assign(formStore, v),
      getFieldsValue: () => formStore,
    },
  ]
  return {
    Form: FormMock,
    Progress: ({ percent }: { percent?: number }) => (
      <div data-testid="import-progress-bar">{Number.isFinite(percent) ? percent : ''}</div>
    ),
  }
})

vi.mock('@/store/softMode', () => ({
  useSoftMode: () => ({ softMode: 'yakit' }),
}))

vi.mock('@/utils/envfile', () => ({
  isYakit: () => true,
  isMemfit: () => false,
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
  failed: vi.fn(),
  success: vi.fn(),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('@/pages/fuzzer/components/ShareImport', () => ({
  onImportShare: vi.fn(),
}))

vi.mock('@/components/managementTab', () => ({
  ManagementTab: () => null,
}))

vi.mock('@/routes/newRoute', () => ({
  YakitRoute: { DB_HTTPHistory: 'DB_HTTPHistory' },
  getExtraMenu: () => [],
}))

vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children, content }: { children?: React.ReactNode; content?: React.ReactNode }) => (
    <>
      {children}
      {content}
    </>
  ),
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('@/components/yakitUI/YakitMenu/YakitMenu', () => ({
  YakitMenu: ({ onClick }: { onClick?: (e: { key: string }) => void }) => (
    <button data-testid="menu-import-history-har" onClick={() => onClick?.({ key: 'import-history-har' })}>
      import-history-har
    </button>
  ),
}))

vi.mock('@/components/yakitUI/YakitForm/YakitForm', () => ({
  YakitFormDragger: () => <div data-testid="form-dragger" />,
}))

const { showYakitModalMock } = vi.hoisted(() => {
  const React = require('react')
  const { createRoot } = require('react-dom/client')
  // showYakitModal 同步渲染 content，让测试能直接触发弹窗内的导入按钮
  const showYakitModalMock = vi.fn((props: { content: (t: (k: string) => string) => React.ReactNode }) => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    createRoot(div).render(<>{props.content((key: string) => key)}</>)
    return { destroy: () => undefined }
  })
  return { showYakitModalMock }
})

vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: showYakitModalMock,
}))

vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ open, children, footer }: { open?: boolean; children?: React.ReactNode; footer?: React.ReactNode }) =>
    open ? (
      <div data-testid="import-export-progress">
        {children}
        {footer}
      </div>
    ) : null,
}))

vi.mock('@/pages/mitm/MITMPage', () => ({ ImportLocalPlugin: () => null }))

import { ExtraMenu } from '../ExtraMenu'
import { yakitNotify } from '@/utils/notification'

const expectListenerBeforeInvoke = () => {
  const invokeAt = callOrder.indexOf('invoke:ImportHTTPFlowStream')
  expect(invokeAt).toBeGreaterThanOrEqual(0)
  const token = callOrder[invokeAt + 1]
  for (const suffix of ['-data', '-error']) {
    const listenAt = callOrder.indexOf(`on:${token}${suffix}`)
    expect(listenAt).toBeGreaterThanOrEqual(0)
    expect(listenAt).toBeLessThan(invokeAt)
  }
}

describe('ExtraMenu HAR 导入（ImportHTTPFlowStream）', () => {
  beforeEach(() => {
    callOrder.length = 0
    streamListeners.clear()
    formStore.historyharPath = undefined
    ipcRendererMock.on.mockImplementation((channel: string, handler: (event: unknown, data: unknown) => void) => {
      streamListeners.set(channel, handler)
      callOrder.push(`on:${String(channel)}`)
    })
    ipcRendererMock.invoke.mockImplementation(async (channel: string, _params?: unknown, token?: string) => {
      if (channel === 'ImportHTTPFlowStream') {
        callOrder.push('invoke:ImportHTTPFlowStream', String(token))
        // 流启动当下就推一帧，监听若还没挂上，这一帧会丢
        streamListeners.get(`${token}-data`)?.({}, { Percent: 0.42 })
      }
      return undefined
    })
    vi.mocked(yakitNotify).mockClear()
    showYakitModalMock.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  const openHarImport = async () => {
    render(<ExtraMenu onMenuSelect={vi.fn()} />)
    fireEvent.click(document.querySelector('[data-testid="menu-import-history-har"]')!)
    await waitFor(() => expect(showYakitModalMock).toHaveBeenCalled())
    // 弹窗打开时业务代码会 setFieldsValue({ historyharPath: '' }) 清空旧值
    formStore.historyharPath = 'C:\\test\\demo.har'
    const buttons = document.querySelectorAll('button')
    const importButton = buttons[buttons.length - 1]
    expect(importButton.textContent).toBe('YakitButton.import')
    fireEvent.click(importButton)
  }

  it('点击导入后，先注册 token-data 监听，再 invoke 启动导入流', async () => {
    await openHarImport()

    await waitFor(() =>
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'ImportHTTPFlowStream',
        { InputPath: 'C:\\test\\demo.har' },
        expect.any(String),
      ),
    )
    expectListenerBeforeInvoke()
    await waitFor(() => expect(document.querySelector('[data-testid="import-progress-bar"]')?.textContent).toBe('42'))
  })

  it('invoke 失败时提示错误且不打开进度弹窗', async () => {
    ipcRendererMock.invoke.mockImplementation(async (channel: string, _params?: unknown, token?: string) => {
      if (channel === 'ImportHTTPFlowStream') {
        callOrder.push('invoke:ImportHTTPFlowStream', String(token))
        throw new Error('boom')
      }
      return undefined
    })

    await openHarImport()

    await waitFor(() => expect(yakitNotify).toHaveBeenCalledWith('error', '[ImportHTTPFlowStream] error: Error: boom'))
    expectListenerBeforeInvoke()
    expect(document.querySelector('[data-testid="import-export-progress"]')).toBeNull()
  })
})
