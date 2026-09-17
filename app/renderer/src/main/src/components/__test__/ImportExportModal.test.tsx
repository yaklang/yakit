import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import type { ImportExportModalProps } from '../ImportExportModal/ImportExportModal'

// ---------- mocks ----------
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))

// 固定 token，便于断言 ipcRenderer.on 的通道名
vi.mock('@/utils/randomUtil', () => ({ randomString: vi.fn(() => 'test-token') }))

// stub 重 UI 组件，避免 antd Modal portal / YakitUploadModal 重依赖链
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: (props: any) => (
    <div data-testid="modal" data-open={props.open}>
      {props.children}
      {props.footer}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: (props: any) => <button {...props}>{props.children}</button>,
}))
vi.mock('@/components/YakitUploadModal/YakitUploadModal', () => ({
  // ImportAndExportStatusInfo 仅用于渲染进度条，stub 掉即可
  ImportAndExportStatusInfo: (props: any) => <div data-testid="status-info">{JSON.stringify(props)}</div>,
}))

// ---------- electron ipc ----------
// 被测模块在顶层执行 window.require('electron')，必须在 import 被测模块之前挂到 window 上。
type IpcHandlers = Record<string, (...args: any[]) => void>
const ipcRendererMock = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  removeAllListeners: vi.fn(),
  // 运行时容器：on 注册的回调按通道名保存，测试里直接调用
  handlers: {} as IpcHandlers,
}))
vi.hoisted(() => {
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    throw new Error(`Unexpected require: ${id}`)
  }
})

// ---------- import 被测组件（必须在所有 vi.mock 之后） ----------
import ImportExportModal from '../ImportExportModal/ImportExportModal'
import type { LogListInfo } from '@/components/YakitUploadModal/YakitUploadModal'

// ---------- 测试夹具 ----------
type P = { Progress: number; finished: boolean }

// 构造一个"已完成"的进度数据（isProgressFinished 返回 true）
const finishedProgress: P = { Progress: 1, finished: true }
// 构造一个"进行中"的进度数据
const ongoingProgress: P = { Progress: 0.5, finished: false }

// 两条日志（用于 logListInfo 非空场景）
const logListWithData: LogListInfo[] = [{ message: 'log-1', isError: false, key: 'k1' }]

/** 构造 ImportExportModal 的完整 props */
const buildProps = (overrides?: Partial<ImportExportModalProps<any, any, P>>): ImportExportModalProps<any, any, P> => ({
  extra: { hint: true, title: 'test', type: 'export', apiKey: 'TestStream' },
  renderForm: () => <div data-testid="form" />,
  onSubmitForm: (values: any) => values,
  getProgressValue: (p: P) => p.Progress,
  isProgressFinished: (p: P) => p.finished,
  getlogListInfo: () => [],
  onFinished: vi.fn(),
  ...overrides,
})

/** 从 ipcRendererMock.on 的调用里取出指定通道的回调 */
const getHandler = (suffix: 'data' | 'error' | 'end') => {
  const channel = `test-token-${suffix}`
  const call = ipcRendererMock.on.mock.calls.find((c: any[]) => c[0] === channel)
  if (!call) throw new Error(`handler for ${channel} not registered`)
  return call[1] as (...args: any[]) => void
}

/** 模拟用户点击提交按钮（触发 onSubmit → handleListeners → ipcRenderer.invoke） */
const submitForm = async () => {
  const submitBtn = document.querySelector('[data-testid="modal"] button:last-of-type') as HTMLButtonElement
  expect(submitBtn).toBeTruthy()
  await act(async () => {
    submitBtn.click()
    // 等待 invoke 的 microtask 完成
    await Promise.resolve()
  })
}

const resetMocks = () => {
  vi.clearAllMocks()
  ipcRendererMock.invoke.mockResolvedValue(undefined)
  ipcRendererMock.handlers = {}
}

describe('ImportExportModal 流式闭环逻辑', () => {
  beforeEach(() => {
    resetMocks()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    resetMocks()
  })

  it('成功路径：收到完成进度后 onFinished(true) 被调一次', async () => {
    const onFinished = vi.fn()
    const props = buildProps({ onFinished })
    render(<ImportExportModal {...props} />)

    await submitForm()

    // 模拟引擎发回一条"已完成"进度数据
    act(() => {
      getHandler('data')(null, finishedProgress)
    })
    // 推进 interval（500ms）将 importExportStreamRef 刷入 progressStream state
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(onFinished).toHaveBeenCalledWith(true)
  })

  it('error 且无日志时：onFinished(false) 被调一次', async () => {
    const onFinished = vi.fn()
    const props = buildProps({ onFinished, getlogListInfo: () => [] })
    render(<ImportExportModal {...props} />)

    await submitForm()

    // 不发任何 data，直接 error
    act(() => {
      getHandler('error')(null, 'boom')
    })

    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(onFinished).toHaveBeenCalledWith(false)
  })

  it('error 但已有日志时：onFinished 不被调（保留弹窗供用户查看日志）', async () => {
    const onFinished = vi.fn()
    const props = buildProps({ onFinished, getlogListInfo: () => logListWithData })
    render(<ImportExportModal {...props} />)

    await submitForm()

    // 先发一条 data 让 progressStream 非空 → logListInfo useMemo 计算 → logListInfoRef 更新
    act(() => {
      getHandler('data')(null, ongoingProgress)
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // 此时 logListInfoRef.current.length > 0，error 不应触发 onFinished
    act(() => {
      getHandler('error')(null, 'boom')
    })

    expect(onFinished).not.toHaveBeenCalled()
  })

  it('finishedRef 去重：成功后再触发 error，onFinished 不重复调用', async () => {
    const onFinished = vi.fn()
    const props = buildProps({ onFinished })
    render(<ImportExportModal {...props} />)

    await submitForm()

    // 先完成
    act(() => {
      getHandler('data')(null, finishedProgress)
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onFinished).toHaveBeenCalledTimes(1)

    // 再触发 error —— 不应再次调 onFinished
    act(() => {
      getHandler('error')(null, 'late-error')
    })
    expect(onFinished).toHaveBeenCalledTimes(1)
  })

  it('onCancel 去重：cancel 后再触发 error/end，onFinished 不重复调用', async () => {
    const onFinished = vi.fn()
    const props = buildProps({ onFinished })
    render(<ImportExportModal {...props} />)

    await submitForm()

    // 用户取消 —— modal footer 的取消按钮是第一个 button
    const cancelBtn = document.querySelector('[data-testid="modal"] button') as HTMLButtonElement
    await act(async () => {
      cancelBtn.click()
    })
    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(onFinished).toHaveBeenCalledWith(false)

    // 之后 error / end 到达都不应再调 onFinished
    act(() => {
      getHandler('error')(null, 'after-cancel')
    })
    act(() => {
      getHandler('end')()
    })
    expect(onFinished).toHaveBeenCalledTimes(1)
  })

  it('-end 只 notify，不调用 onFinished', async () => {
    const onFinished = vi.fn()
    const props = buildProps({ onFinished })
    render(<ImportExportModal {...props} />)

    await submitForm()

    // 直接发 end（不先发 data / error）
    act(() => {
      getHandler('end')()
    })

    expect(onFinished).not.toHaveBeenCalled()
  })
})
