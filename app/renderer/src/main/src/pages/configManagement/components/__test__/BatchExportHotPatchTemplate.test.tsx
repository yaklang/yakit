import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { createRef } from 'react'
import type { ImportExportModalProps } from '@/components/ImportExportModal/ImportExportModal'

// ---------- mocks ----------
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ openABSFileLocated: vi.fn() }))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({
  getMainOperatorPageBodyContainerOrBody: () => document.body,
}))

vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: (props: any) => <input {...props} />,
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: (props: any) => <button {...props}>{props.children}</button>,
}))
vi.mock('@/components/yakitUI/YakitForm/YakitForm', () => ({
  YakitFormDragger: (props: any) => <div data-testid="dragger">{props.help}</div>,
}))
vi.mock('@/components/yakitLogSchema', () => ({
  extractExecResultProgress: vi.fn(() => ({ value: 1, finished: true })),
}))

// mock getPathJoin 避免拉入 yakRunner/utils 的 lottie-web 依赖链导致 jsdom 崩溃
vi.mock('@/pages/yakRunner/utils', () => ({
  getPathJoin: vi.fn().mockResolvedValue('/mock/path/file.zip'),
}))

// ImportExportModal 替身：捕获 props 供测试直接调用回调
const capturedProps = vi.hoisted(() => ({ current: {} as ImportExportModalProps<any, any, any> | null }))
vi.mock('@/components/ImportExportModal/ImportExportModal', () => ({
  default: (props: ImportExportModalProps<any, any, any>) => {
    capturedProps.current = props
    return <div data-testid="import-export-modal" />
  },
}))

// ---------- electron ipc ----------
// 被测模块在顶层执行 window.require('electron')，必须在 import 被测模块之前挂到 window 上。
const ipcRendererMock = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}))
vi.hoisted(() => {
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    throw new Error(`Unexpected require: ${id}`)
  }
})

// ---------- import 被测组件（必须在所有 vi.mock 之后） ----------
import { BatchExportHotPatchTemplate } from '../BatchExportHotPatchTemplate'
import type { BatchExportHotPatchTemplateRef, ExportHotPatchTemplateStreamRequest } from '../type'

const resetMocks = () => {
  vi.clearAllMocks()
  ipcRendererMock.invoke.mockResolvedValue(undefined)
  capturedProps.current = null
}

describe('BatchExportHotPatchTemplate', () => {
  beforeEach(() => resetMocks())
  afterEach(() => resetMocks())

  it('hint 为 false 时不渲染 ImportExportModal', () => {
    const ref = createRef<BatchExportHotPatchTemplateRef>()
    const { container } = render(<BatchExportHotPatchTemplate ref={ref} />)
    expect(container.querySelector('[data-testid="import-export-modal"]')).toBeNull()
    expect(capturedProps.current).toBeNull()
  })

  it('open() 后渲染 ImportExportModal 且 extra.hint=true', () => {
    const ref = createRef<BatchExportHotPatchTemplateRef>()
    render(<BatchExportHotPatchTemplate ref={ref} />)
    act(() => ref.current?.open({ Filter: { Type: 'fuzzer', Name: [] } }))
    expect(capturedProps.current).not.toBeNull()
    expect(capturedProps.current!.extra.hint).toBe(true)
    expect(capturedProps.current!.extra.type).toBe('export')
    expect(capturedProps.current!.extra.apiKey).toBe('ExportHotPatchTemplateStream')
  })

  it('open() 合并默认值与传入 params，onSubmitForm 正确合并 hotPatchExtraParams 与表单值', () => {
    const ref = createRef<BatchExportHotPatchTemplateRef>()
    render(<BatchExportHotPatchTemplate ref={ref} />)
    act(() =>
      ref.current?.open({
        OutputFilename: 'my-template',
        Filter: { Type: 'global', Name: ['tpl-a'] },
      }),
    )

    // 模拟用户提交表单
    const submitted = capturedProps.current!.onSubmitForm({
      OutputPluginDir: '/custom/dir',
      OutputFilename: 'my-template',
      Password: '123',
    } as any)

    expect(submitted).toMatchObject({
      OutputPluginDir: '/custom/dir',
      OutputFilename: 'my-template',
      Password: '123',
      Filter: { Type: 'global', Name: ['tpl-a'] },
    })
  })

  it('onSubmitForm 表单值覆盖 hotPatchExtraParams 同名字段', () => {
    const ref = createRef<BatchExportHotPatchTemplateRef>()
    render(<BatchExportHotPatchTemplate ref={ref} />)
    act(() => ref.current?.open({ OutputFilename: 'old-name', Filter: { Type: 'global', Name: [] } }))

    const submitted = capturedProps.current!.onSubmitForm({
      OutputPluginDir: '',
      OutputFilename: 'new-name',
      Password: '',
    } as any)

    expect(submitted.OutputFilename).toBe('new-name')
  })

  it('onFinished(true) 调用 yakitNotify success 并关闭 hint', async () => {
    const ref = createRef<BatchExportHotPatchTemplateRef>()
    const { queryByTestId } = render(<BatchExportHotPatchTemplate ref={ref} />)
    act(() => ref.current?.open({ Filter: { Type: 'global', Name: [] } }))
    expect(queryByTestId('import-export-modal')).not.toBeNull()

    await act(async () => {
      await capturedProps.current!.onFinished(true)
    })

    const { yakitNotify } = await import('@/utils/notification')
    expect(yakitNotify).toHaveBeenCalledWith('success', expect.any(String))
    // hint=false 后组件 return null，替身从 DOM 消失
    expect(queryByTestId('import-export-modal')).toBeNull()
  })

  it('onFinished(false) 不调用 yakitNotify 且关闭 hint', async () => {
    const ref = createRef<BatchExportHotPatchTemplateRef>()
    const { queryByTestId } = render(<BatchExportHotPatchTemplate ref={ref} />)
    act(() => ref.current?.open({ Filter: { Type: 'global', Name: [] } }))
    expect(queryByTestId('import-export-modal')).not.toBeNull()

    await act(async () => {
      await capturedProps.current!.onFinished(false)
    })

    const { yakitNotify } = await import('@/utils/notification')
    expect(yakitNotify).not.toHaveBeenCalled()
    expect(queryByTestId('import-export-modal')).toBeNull()
  })

  it('remote 引擎模式下不调用 GetProjectsFilePath，formProps.initialValues.OutputPluginDir 为空', () => {
    // SystemInfo.mode 默认 undefined（local），这里通过重新 mock hardware 验证 remote 路径
    vi.resetModules()
    vi.doMock('@/constants/hardware', () => ({ SystemInfo: { mode: 'remote' } }))
    return import('../BatchExportHotPatchTemplate').then(({ BatchExportHotPatchTemplate: Comp }) => {
      const ref = createRef<BatchExportHotPatchTemplateRef>()
      render(<Comp ref={ref} />)
      act(() => ref.current?.open({ Filter: { Type: 'global', Name: [] } }))
      expect(capturedProps.current!.formProps!.initialValues).toMatchObject({
        OutputPluginDir: '',
        OutputFilename: '',
        Password: '',
      })
      vi.doUnmock('@/constants/hardware')
    })
  })
})
