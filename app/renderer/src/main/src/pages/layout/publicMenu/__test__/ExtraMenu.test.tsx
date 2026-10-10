const { ipcRendererMock, chunkLoadOrder, formStore } = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  ;(window as any).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    return {}
  }
  // 记录「chunk 预热」与「invoke 启动导入流」的先后顺序，用于断言预热先于流启动
  const chunkLoadOrder: string[] = []
  // 可控的表单值存储：测试直接改 formStore.historyharPath 模拟用户填写的 HAR 路径
  const formStore: { historyharPath?: string } = {}
  return { ipcRendererMock, chunkLoadOrder, formStore }
})

import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
  return { Form: FormMock }
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

vi.mock('@/pages/mitm/MITMPage', () => ({ ImportLocalPlugin: () => null }))

// 记录 lazy chunk 预热完成的时机（mock 模块被 import 时 push）
vi.mock('@/components/HTTPFlowTable/components/importExportProgress', () => {
  chunkLoadOrder.push('chunk-resolved')
  return { default: () => null }
})

import { ExtraMenu } from '../ExtraMenu'
import { yakitNotify } from '@/utils/notification'

describe('ExtraMenu HAR 导入（ImportHTTPFlowStream）', () => {
  it('点击导入按钮后，先预热进度组件 chunk，再 invoke 启动导入流（防丢流事件竞态）', async () => {
    chunkLoadOrder.length = 0
    ipcRendererMock.invoke.mockImplementation(async (channel: string) => {
      if (channel === 'ImportHTTPFlowStream') chunkLoadOrder.push('invoke')
      return undefined
    })

    render(<ExtraMenu onMenuSelect={vi.fn()} />)

    // 打开 HAR 导入弹窗（YakitMenu mock 的按钮触发 import-history-har 分支）
    fireEvent.click(document.querySelector('[data-testid="menu-import-history-har"]')!)
    await waitFor(() => expect(showYakitModalMock).toHaveBeenCalledTimes(1))
    // 弹窗打开时业务代码会 setFieldsValue({ historyharPath: '' }) 清空旧值，
    // 之后再写入模拟用户选择的 HAR 文件路径
    formStore.historyharPath = 'C:\\test\\demo.har'

    // 弹窗内最后一个按钮是导入按钮（YakitButton mock 为原生 button）
    const buttons = document.querySelectorAll('button')
    const importButton = buttons[buttons.length - 1]
    expect(importButton.textContent).toBe('YakitButton.import')

    fireEvent.click(importButton)

    await waitFor(() =>
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'ImportHTTPFlowStream',
        { InputPath: 'C:\\test\\demo.har' },
        expect.any(String),
      ),
    )
    // 预热 chunk 必须先于流启动，否则流事件会在监听注册前丢失
    expect(chunkLoadOrder).toEqual(['chunk-resolved', 'invoke'])
  })

  it('invoke 失败时通过 yakitNotify 提示错误且不打开进度弹窗', async () => {
    chunkLoadOrder.length = 0
    ipcRendererMock.invoke.mockRejectedValue(new Error('boom'))

    const { container } = render(<ExtraMenu onMenuSelect={vi.fn()} />)
    fireEvent.click(document.querySelector('[data-testid="menu-import-history-har"]')!)
    await waitFor(() => expect(showYakitModalMock).toHaveBeenCalled())
    formStore.historyharPath = 'C:\\test\\demo.har'

    const buttons = document.querySelectorAll('button')
    fireEvent.click(buttons[buttons.length - 1])

    await waitFor(() => expect(yakitNotify).toHaveBeenCalledWith('error', '[ImportHTTPFlowStream] error: Error: boom'))
    // 失败路径 percentVisible 保持 false：进度组件（含 cancel-ImportHTTPFlowStream 清理调用）不应被挂载
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('cancel-ImportHTTPFlowStream', expect.anything())
  })
})
