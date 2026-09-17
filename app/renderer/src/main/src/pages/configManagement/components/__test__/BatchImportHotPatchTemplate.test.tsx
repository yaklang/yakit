import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { createRef } from 'react'
import type { ImportExportModalProps } from '@/components/ImportExportModal/ImportExportModal'

// ---------- mocks ----------
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({
  getMainOperatorPageBodyContainerOrBody: () => document.body,
}))

vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: (props: any) => <input {...props} />,
}))
vi.mock('@/components/yakitUI/YakitForm/YakitForm', () => ({
  YakitFormDragger: (props: any) => <div data-testid="dragger">{props.help}</div>,
}))
vi.mock('@/components/yakitLogSchema', () => ({
  extractExecResultProgress: vi.fn(() => ({ value: 1, finished: true })),
}))

// ImportExportModal 替身：捕获 props 供测试直接调用回调
const capturedProps = vi.hoisted(() => ({ current: {} as ImportExportModalProps<any, any, any> | null }))
vi.mock('@/components/ImportExportModal/ImportExportModal', () => ({
  default: (props: ImportExportModalProps<any, any, any>) => {
    capturedProps.current = props
    return <div data-testid="import-export-modal" />
  },
}))

// ---------- import 被测组件（必须在所有 vi.mock 之后） ----------
import { BatchImportHotPatchTemplate } from '../BatchImportHotPatchTemplate'
import type { BatchImportHotPatchTemplateRef } from '../type'

const resetMocks = () => {
  vi.clearAllMocks()
  capturedProps.current = null
}

describe('BatchImportHotPatchTemplate', () => {
  beforeEach(() => resetMocks())
  afterEach(() => resetMocks())

  it('hint 为 false 时不渲染 ImportExportModal', () => {
    const ref = createRef<BatchImportHotPatchTemplateRef>()
    const { container } = render(<BatchImportHotPatchTemplate ref={ref} />)
    expect(container.querySelector('[data-testid="import-export-modal"]')).toBeNull()
    expect(capturedProps.current).toBeNull()
  })

  it('open() 后渲染 ImportExportModal 且 extra.hint=true、type=import', () => {
    const ref = createRef<BatchImportHotPatchTemplateRef>()
    render(<BatchImportHotPatchTemplate ref={ref} />)
    act(() => ref.current?.open())
    expect(capturedProps.current).not.toBeNull()
    expect(capturedProps.current!.extra.hint).toBe(true)
    expect(capturedProps.current!.extra.type).toBe('import')
    expect(capturedProps.current!.extra.apiKey).toBe('ImportHotPatchTemplateStream')
  })

  it('onSubmitForm 原样返回表单值', () => {
    const ref = createRef<BatchImportHotPatchTemplateRef>()
    render(<BatchImportHotPatchTemplate ref={ref} />)
    act(() => ref.current?.open())

    const submitted = capturedProps.current!.onSubmitForm({
      Filename: '/path/to/file.zip',
      Password: 'secret',
    } as any)

    expect(submitted).toMatchObject({
      Filename: '/path/to/file.zip',
      Password: 'secret',
    })
  })

  it('onFinished(true) 调用 onSuccess 与 yakitNotify success，并关闭 hint', async () => {
    const onSuccess = vi.fn()
    const ref = createRef<BatchImportHotPatchTemplateRef>()
    const { queryByTestId } = render(<BatchImportHotPatchTemplate ref={ref} onSuccess={onSuccess} />)
    act(() => ref.current?.open())
    expect(queryByTestId('import-export-modal')).not.toBeNull()

    await act(async () => {
      await capturedProps.current!.onFinished(true)
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    const { yakitNotify } = await import('@/utils/notification')
    expect(yakitNotify).toHaveBeenCalledWith('success', expect.any(String))
    expect(queryByTestId('import-export-modal')).toBeNull()
  })

  it('onFinished(false) 不调用 onSuccess 与 yakitNotify，但关闭 hint', async () => {
    const onSuccess = vi.fn()
    const ref = createRef<BatchImportHotPatchTemplateRef>()
    const { queryByTestId } = render(<BatchImportHotPatchTemplate ref={ref} onSuccess={onSuccess} />)
    act(() => ref.current?.open())
    expect(queryByTestId('import-export-modal')).not.toBeNull()

    await act(async () => {
      await capturedProps.current!.onFinished(false)
    })

    expect(onSuccess).not.toHaveBeenCalled()
    const { yakitNotify } = await import('@/utils/notification')
    expect(yakitNotify).not.toHaveBeenCalled()
    expect(queryByTestId('import-export-modal')).toBeNull()
  })

  it('未传 onSuccess 时 onFinished(true) 不报错', async () => {
    const ref = createRef<BatchImportHotPatchTemplateRef>()
    const { queryByTestId } = render(<BatchImportHotPatchTemplate ref={ref} />)
    act(() => ref.current?.open())

    await act(async () => {
      await capturedProps.current!.onFinished(true)
    })

    // 只要不抛错且关闭 hint 即可
    expect(queryByTestId('import-export-modal')).toBeNull()
  })
})
