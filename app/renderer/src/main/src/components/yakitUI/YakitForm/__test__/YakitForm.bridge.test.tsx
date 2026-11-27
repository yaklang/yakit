import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  openDialog: vi.fn(),
  fetchFileInfoByPath: vi.fn(),
  fetchFileContent: vi.fn(),
  failed: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/utils/fileSystemDialog', () => ({
  handleOpenFileSystemDialog: mocks.openDialog,
}))

vi.mock('@/services/electronBridge', () => ({
  yakitFileSystem: {
    fetchFileInfoByPath: mocks.fetchFileInfoByPath,
    fetchFileContent: mocks.fetchFileContent,
  },
}))

vi.mock('@/utils/notification', () => ({
  failed: mocks.failed,
  yakitNotify: mocks.yakitNotify,
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh' },
  }),
}))

import { YakitDragger, YakitDraggerContent } from '../YakitForm'

const selectFile = () => {
  const trigger = screen.getByText((content) => content.includes('YakitDraggerContent.click_here'), {
    selector: 'span',
  })
  fireEvent.click(trigger)
}

describe('YakitDraggerContent file bridge', () => {
  beforeEach(() => {
    mocks.openDialog.mockReset().mockResolvedValue({ filePaths: ['C:\\test.txt'] })
    mocks.fetchFileInfoByPath.mockReset().mockResolvedValue({ size: 1024 })
    mocks.fetchFileContent.mockReset().mockResolvedValue('file-content')
    mocks.failed.mockReset()
    mocks.yakitNotify.mockReset()
  })

  it('读取文件信息后按路径读取内容并回传', async () => {
    const onChange = vi.fn()
    render(<YakitDraggerContent value="" onChange={onChange} />)

    selectFile()

    await waitFor(() => expect(mocks.fetchFileInfoByPath).toHaveBeenCalledWith('C:\\test.txt'))
    await waitFor(() => expect(mocks.fetchFileContent).toHaveBeenCalledWith('C:\\test.txt'))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('file-content'))
  })

  it('文件内容读取失败时提示错误且不回传内容', async () => {
    const onChange = vi.fn()
    mocks.fetchFileContent.mockRejectedValue(new Error('read failed'))
    render(<YakitDraggerContent value="" onChange={onChange} />)

    selectFile()

    await waitFor(() =>
      expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('YakitDraggerContent.data_fetch_failed')),
    )
    expect(onChange).not.toHaveBeenCalled()
  })

  it('文件信息读取失败时提示错误且不继续读取内容', async () => {
    const onChange = vi.fn()
    mocks.fetchFileInfoByPath.mockRejectedValue(new Error('stat failed'))
    render(<YakitDraggerContent value="" onChange={onChange} />)

    selectFile()

    await waitFor(() =>
      expect(mocks.yakitNotify).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('YakitDraggerContent.file_read_error'),
      ),
    )
    expect(mocks.fetchFileContent).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('YakitDragger file bridge', () => {
  beforeEach(() => {
    mocks.fetchFileContent.mockReset().mockResolvedValue('file-content')
    mocks.failed.mockReset()
  })

  const enterPath = (path: string) => {
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: path } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
  }

  it('手动输入路径后读取内容并按路径回传', async () => {
    const setContent = vi.fn()
    render(<YakitDragger selectType="file" setContent={setContent} />)

    enterPath('C:\\form.txt')

    await waitFor(() => expect(mocks.fetchFileContent).toHaveBeenCalledWith('C:\\form.txt'))
    await waitFor(() => expect(setContent).toHaveBeenCalledWith('file-content'))
  })

  it('手动输入路径读取失败时提示错误', async () => {
    const setContent = vi.fn()
    mocks.fetchFileContent.mockRejectedValue(new Error('read failed'))
    render(<YakitDragger selectType="file" setContent={setContent} />)

    enterPath('C:\\form.txt')

    await waitFor(() =>
      expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('YakitNotification.dataFetchFailed')),
    )
    expect(setContent).toHaveBeenCalledWith('')
  })
})
