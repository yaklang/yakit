import { createRef } from 'react'
import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginImageTextarea } from './PluginImageTextarea'
import type { PluginImageTextareaRefProps } from './PluginImageTextareaType'
import { DISPOSAL_ATTACHMENT_EXTENSIONS, MAX_ATTACHMENT_SIZE } from '@/utils/disposalAttachment'
vi.mock('@/utils/disposalDownload', () => ({ downloadDisposalFile: vi.fn() }))

const mocks = vi.hoisted(() => ({ dialog: vi.fn(), stat: vi.fn(), failed: vi.fn() }))
vi.mock('@/utils/fileSystemDialog', () => ({ handleOpenFileSystemDialog: mocks.dialog }))
vi.mock('@/components/MilkdownEditor/CustomFile/utils', () => ({ getLocalFileLinkInfo: mocks.stat }))
vi.mock('@/utils/notification', () => ({ failed: mocks.failed }))
vi.mock('@/apiUtils/http', () => ({ httpDeleteOSSResource: vi.fn(), httpUploadImgBase64: vi.fn() }))
vi.mock('@/pages/pluginHub/utilsUI/UtilsTemplate', () => ({ ImagePreviewList: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    loading,
    icon,
    type,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; icon?: React.ReactNode }) => (
    <button {...props} disabled={props.disabled || loading}>
      {icon}
      {children}
    </button>
  ),
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  PaperClipOutlined: () => null,
  PhotographOutlined: () => null,
  XOutlined: () => null,
}))
vi.mock('@yakit-libs/yakit-ui-icons/solid', () => ({ PaperAirplaneSolid: () => null }))
vi.mock('antd', async () => {
  const ReactModule = await import('react')
  return {
    Upload: ({ children }: React.PropsWithChildren) => children,
    Input: {
      TextArea: ReactModule.forwardRef(
        (
          {
            autoSize,
            variant,
            ...props
          }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { autoSize?: unknown; variant?: unknown },
          ref,
        ) => {
          ReactModule.useImperativeHandle(ref, () => ({ focus: vi.fn() }))
          return <textarea {...props} />
        },
      ),
    },
  }
})

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('处置评论附件编辑', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.dialog.mockResolvedValue({ canceled: false, filePaths: ['D:\\reports\\修复报告.pdf'] })
    mocks.stat.mockResolvedValue({ size: 2048 })
  })
  afterEach(cleanup)

  it('允许100MB附件单独发布并保留原文件名和大小', async () => {
    mocks.stat.mockResolvedValue({ size: MAX_ATTACHMENT_SIZE })
    const upload = vi.fn().mockResolvedValue('https://files.test/report.pdf')
    const submit = vi.fn()
    render(<PluginImageTextarea onUploadFile={upload} onSubmit={submit} />)
    fireEvent.click(screen.getByRole('button', { name: '上传附件' }))
    await screen.findByText('修复报告.pdf')
    fireEvent.click(screen.getByRole('button', { name: '发布评论' }))
    expect(upload).toHaveBeenCalledWith('D:\\reports\\修复报告.pdf')
    expect(mocks.dialog).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: '支持的附件', extensions: DISPOSAL_ATTACHMENT_EXTENSIONS }],
      }),
    )
    expect(submit).toHaveBeenCalledWith({
      value: '',
      imgs: [],
      files: [{ url: 'https://files.test/report.pdf', name: '修复报告.pdf', size: MAX_ATTACHMENT_SIZE }],
    })
  })

  it('超过100MB时在请求前拒绝，且恢复选择按钮', async () => {
    mocks.stat.mockResolvedValue({ size: MAX_ATTACHMENT_SIZE + 1 })
    const upload = vi.fn()
    render(<PluginImageTextarea onUploadFile={upload} />)
    fireEvent.click(screen.getByRole('button', { name: '上传附件' }))
    await waitFor(() => expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('不能超过100MB')))
    expect(upload).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '上传附件' })).toBeEnabled()
  })

  it('手动选择非白名单附件时在读取和上传前拒绝', async () => {
    mocks.dialog.mockResolvedValue({ canceled: false, filePaths: ['D:/reports/report.pdf.exe'] })
    const upload = vi.fn()
    render(<PluginImageTextarea onUploadFile={upload} />)
    fireEvent.click(screen.getByRole('button', { name: '上传附件' }))
    await waitFor(() => expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('仅支持')))
    expect(upload).not.toHaveBeenCalled()
    expect(mocks.stat).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '上传附件' })).toBeEnabled()
  })

  it('上传期间禁止重复选择和发布，移除后不能发布空评论', async () => {
    const pending = deferred<string>()
    const upload = vi.fn().mockReturnValue(pending.promise)
    render(<PluginImageTextarea onUploadFile={upload} />)
    fireEvent.click(screen.getByRole('button', { name: '上传附件' }))
    await waitFor(() => expect(upload).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '处理中' } })
    expect(screen.getByRole('button', { name: '上传附件' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '发布评论' })).toBeDisabled()
    await act(async () => pending.resolve('https://files.test/report.pdf'))
    fireEvent.click(screen.getByRole('button', { name: '移除附件 修复报告.pdf' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    expect(screen.queryByText('修复报告.pdf')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发布评论' })).toBeDisabled()
  })

  it('清空后忽略旧上传结果', async () => {
    const pending = deferred<string>()
    const upload = vi.fn().mockReturnValue(pending.promise)
    const ref = createRef<PluginImageTextareaRefProps>()
    render(<PluginImageTextarea ref={ref} onUploadFile={upload} />)
    fireEvent.click(screen.getByRole('button', { name: '上传附件' }))
    await waitFor(() => expect(upload).toHaveBeenCalledOnce())
    act(() => ref.current?.onClear())
    await act(async () => pending.resolve('https://files.test/old.pdf'))
    expect(ref.current?.getData()?.files).toEqual([])
    expect(screen.queryByText('修复报告.pdf')).not.toBeInTheDocument()
  })

  it('取消选择不上传，失败后可重新上传', async () => {
    mocks.dialog.mockResolvedValueOnce({ canceled: true, filePaths: [] })
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error('网络异常'))
      .mockResolvedValue('https://files.test/report.pdf')
    render(<PluginImageTextarea onUploadFile={upload} />)
    const select = screen.getByRole('button', { name: '上传附件' })
    fireEvent.click(select)
    await waitFor(() => expect(select).toBeEnabled())
    expect(upload).not.toHaveBeenCalled()
    fireEvent.click(select)
    await waitFor(() => expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('网络异常')))
    fireEvent.click(select)
    await screen.findByText('修复报告.pdf')
    expect(upload).toHaveBeenCalledTimes(2)
  })

  it('未接入附件的其他编辑场景不显示附件入口', () => {
    render(<PluginImageTextarea />)
    expect(screen.queryByRole('button', { name: '上传附件' })).not.toBeInTheDocument()
  })
})
