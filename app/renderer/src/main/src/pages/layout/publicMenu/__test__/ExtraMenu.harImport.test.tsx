const harState = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  ;(window as any).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    return {}
  }
  // jsdom 无 matchMedia，真 antd Form 的 breakpoint 订阅需要
  if (!(window as any).matchMedia) {
    ;(window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
  }
  return {
    ipcRendererMock,
    notifyMock: vi.fn(),
    emitMock: vi.fn(),
    /** 记录「进度 chunk 求值 / invoke 发出」的先后顺序 */
    order: [] as string[],
    /** ImportExportProgress mock 收到的 props 列表 */
    renderedProgress: [] as any[],
    /** showYakitModal mock 捕获的 options */
    modalOptions: null as any,
    modalDestroyed: false,
    FIXED_TOKEN: 't'.repeat(40),
  }
})

import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor, within } from '@testing-library/react'
import type React from 'react'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (k: string) => k,
    i18nRefresh: 0,
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
}))

vi.mock('@/utils/envfile', () => ({
  isYakit: () => true,
  isMemfit: () => false,
}))

vi.mock('@/store/softMode', () => ({
  useSoftMode: () => ({ softMode: 'normal' }),
}))

vi.mock('@/routes/newRoute', () => ({
  getExtraMenu: () => [],
}))

vi.mock('@/components/managementTab', () => ({
  ManagementTab: () => null,
}))

vi.mock('@/pages/fuzzer/components/ShareImport', () => ({
  onImportShare: vi.fn(),
}))

vi.mock('@/pages/mitm/MITMPage', () => ({
  ImportLocalPlugin: () => null,
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: harState.notifyMock,
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { emit: harState.emitMock, on: vi.fn(), off: vi.fn(), once: vi.fn() },
}))

vi.mock('@/utils/randomUtil', () => ({
  randomString: () => harState.FIXED_TOKEN,
}))

vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  SaveOutlined: () => null,
  ChevronDownOutlined: () => null,
  ChevronUpOutlined: () => null,
}))

vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ content, children }: any) => (
    <div>
      {children}
      {content}
    </div>
  ),
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('@/components/yakitUI/YakitMenu/YakitMenu', () => ({
  YakitMenu: ({ data, onClick }: any) => (
    <div>
      {data.map((item: any) => (
        <div key={item.key}>
          <div onClick={() => onClick?.({ key: item.key })}>{item.label}</div>
          {item.children?.map((child: any) => (
            <div key={child.key} onClick={() => onClick?.({ key: child.key })}>
              {child.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/yakitUI/YakitForm/YakitForm', async () => {
  const { Form } = await import('antd')
  return {
    YakitFormDragger: (props: any) => (
      <Form.Item name={props.formItemProps?.name} label={props.formItemProps?.label}>
        <input />
      </Form.Item>
    ),
  }
})

vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: (options: any) => {
    harState.modalOptions = options
    harState.modalDestroyed = false
    return { destroy: () => (harState.modalDestroyed = true) }
  },
}))

// 被测的预热目标：挂载后先登记监听，再经 onReady 启动流
vi.mock('@/components/HTTPFlowTable/components/importExportProgress', () => {
  harState.order.push('progress-module')
  return {
    // 大写命名让 rules-of-hooks 认作组件，useEffect 才能合法
    default: function MockImportExportProgress(props: any) {
      harState.renderedProgress.push(props)
      useEffect(() => {
        harState.order.push('listeners')
        props.onReady?.()
        return () => {
          harState.order.push('closed')
        }
      }, [])
      return null
    },
  }
})

/** 走到「点击导入按钮」为止，返回输入框；查询限定在本次 render 的容器内，超时用例残留的 DOM 不参与匹配 */
const setupToImportButton = async () => {
  const { ExtraMenu } = await import('../ExtraMenu')
  const { container } = render(<ExtraMenu onMenuSelect={vi.fn()} />)
  fireEvent.click(within(container).getByText('Layout.ExtraMenu.importHARHistoryData'))
  expect(harState.modalOptions).toBeTruthy()
  const { container: modalContainer } = render(harState.modalOptions.content((k: string) => k))
  const input = within(modalContainer).getByRole('textbox')
  fireEvent.change(input, { target: { value: 'D:/traffic.har' } })
  fireEvent.click(within(modalContainer).getByText('YakitButton.import'))
  return input
}

describe('ExtraMenu HAR 导入预热时序', () => {
  beforeEach(() => {
    vi.resetModules()
    harState.ipcRendererMock.invoke.mockReset()
    harState.ipcRendererMock.invoke.mockImplementation(async (...args: any[]) => {
      harState.order.push('invoke')
      return undefined
    })
    harState.notifyMock.mockClear()
    harState.emitMock.mockClear()
    harState.order.length = 0
    harState.renderedProgress.length = 0
    harState.modalOptions = null
    harState.modalDestroyed = false
  })

  // 首个执行的用例承担整个 ExtraMenu 模块图 + 真 antd Form 的编译求值，全量并行跑时远超 5s 默认超时
  it('invoke 必须发生在进度监听登记之后', async () => {
    await setupToImportButton()
    expect(harState.modalDestroyed).toBe(true)

    await waitFor(() => {
      expect(harState.ipcRendererMock.invoke).toHaveBeenCalledWith(
        'ImportHTTPFlowStream',
        { InputPath: 'D:/traffic.har' },
        harState.FIXED_TOKEN,
      )
    })
    expect(harState.order.indexOf('listeners')).toBeLessThan(harState.order.indexOf('invoke'))

    await waitFor(() => {
      expect(harState.renderedProgress.length).toBe(1)
    })
    expect(harState.renderedProgress[0]).toMatchObject({
      visible: true,
      token: harState.FIXED_TOKEN,
      apiKey: 'ImportHTTPFlowStream',
    })
  }, 20000)

  it('invoke 失败走 catch：yakitNotify 报错并关掉进度组件', async () => {
    harState.ipcRendererMock.invoke.mockImplementation(async () => {
      harState.order.push('invoke')
      throw new Error('boom')
    })
    await setupToImportButton()

    await waitFor(() => {
      expect(harState.notifyMock).toHaveBeenCalledWith('error', expect.stringContaining('[ImportHTTPFlowStream] error'))
    })
    expect(harState.order.indexOf('listeners')).toBeLessThan(harState.order.indexOf('invoke'))
    await waitFor(() => {
      expect(harState.order).toContain('closed')
    })
  })

  it('非 .har 路径被拦截：不预热、不 invoke', async () => {
    const { ExtraMenu } = await import('../ExtraMenu')
    const { container } = render(<ExtraMenu onMenuSelect={vi.fn()} />)
    fireEvent.click(within(container).getByText('Layout.ExtraMenu.importHARHistoryData'))
    const { container: modalContainer } = render(harState.modalOptions.content((k: string) => k))
    fireEvent.change(within(modalContainer).getByRole('textbox'), { target: { value: 'D:/wrong.txt' } })
    fireEvent.click(within(modalContainer).getByText('YakitButton.import'))

    expect(harState.notifyMock).toHaveBeenCalledWith('error', 'YakitFormDragger.filesOnly')
    expect(harState.order).not.toContain('progress-module')
    expect(harState.ipcRendererMock.invoke).not.toHaveBeenCalled()
  })
})
