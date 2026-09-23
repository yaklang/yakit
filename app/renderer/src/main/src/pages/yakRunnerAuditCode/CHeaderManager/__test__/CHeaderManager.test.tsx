const { ipcRendererMock } = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn(),
  }
  ;(window as any).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    return {}
  }
  return { ipcRendererMock }
})

import type React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CHeaderManager from '../CHeaderManager'

vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ahooks')>()
  return {
    ...actual,
    useSize: () => ({ width: 400, height: 400 }),
  }
})

const { yakitNotify, handleOpenFileSystemDialog } = vi.hoisted(() => ({
  yakitNotify: vi.fn(),
  handleOpenFileSystemDialog: vi.fn(),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, opts?: { name?: string; version?: string }) => {
      if (opts?.name) return `${key}:${opts.name}`
      if (opts?.version) return `${key}:${opts.version}`
      return key
    },
    i18nRefresh: 0,
  }),
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify,
  warn: vi.fn(),
}))

vi.mock('@/utils/clipboard', () => ({
  setClipboardText: vi.fn(),
}))

vi.mock('@/utils/fileSystemDialog', () => ({
  handleOpenFileSystemDialog,
}))

vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: () => null,
}))

vi.mock('@/components/yakitUI/YakitPopconfirm/YakitPopconfirm', () => ({
  YakitPopconfirm: ({
    disabled,
    onConfirm,
    title,
    children,
  }: {
    disabled?: boolean
    onConfirm?: () => void
    title?: React.ReactNode
    children?: React.ReactNode
  }) => (
    <div>
      {children}
      {!disabled && (
        <button type="button" onClick={onConfirm}>
          {title}
        </button>
      )}
    </div>
  ),
}))

vi.mock('@/pages/yakRunner/FileTree/icon', () => ({
  FileDefault: 'file',
  FileSuffix: {},
  FolderDefault: 'folder',
  FolderDefaultExpanded: 'folder-open',
  KeyToIcon: {
    file: { iconPath: '' },
    folder: { iconPath: '' },
    'folder-open': { iconPath: '' },
    _f_zip: { iconPath: '' },
  },
}))

const listPacks = (packs: { Name: string; Kind?: string; SizeBytes?: number; ModifiedAt?: number }[]) => {
  ipcRendererMock.invoke.mockImplementation(async (channel: string) => {
    if (channel === 'GetCHeadersDir') return { Dir: '/tmp/c-headers' }
    if (channel === 'ListCHeaders') return { Packs: packs }
    if (channel === 'DownloadOfficialCHeaders') return { Ok: true, Version: 'v1' }
    return {}
  })
}

describe('CHeaderManager', () => {
  beforeEach(() => {
    ipcRendererMock.invoke.mockReset()
    yakitNotify.mockReset()
    listPacks([])
  })

  it('空列表展示官方下载入口', async () => {
    render(<CHeaderManager />)
    expect(await screen.findByText('CHeaderManager.emptyTitle')).toBeInTheDocument()
    expect(screen.getByText('CHeaderManager.downloadOfficial')).toBeInTheDocument()
  })

  it('没有官方包时点击下载直接 Force=false', async () => {
    const user = userEvent.setup()
    listPacks([{ Name: 'local.zip', Kind: 'zip' }])
    render(<CHeaderManager />)
    expect(await screen.findByText('/tmp/c-headers')).toBeInTheDocument()

    await user.click(screen.getByTitle('CHeaderManager.downloadOfficial'))
    await waitFor(() => {
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('DownloadOfficialCHeaders', { Force: false })
    })
  })

  it('已有官方包时走覆盖确认后 Force=true', async () => {
    const user = userEvent.setup()
    listPacks([{ Name: 'c-std-headers.zip', Kind: 'zip' }])
    render(<CHeaderManager />)
    expect(await screen.findByText('c-std-headers.zip')).toBeInTheDocument()

    await user.click(screen.getByText('CHeaderManager.downloadOverwrite'))
    await waitFor(() => {
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('DownloadOfficialCHeaders', { Force: true })
    })
  })

  it('搜索无结果时展示空状态', async () => {
    const user = userEvent.setup()
    listPacks([{ Name: 'stdio-pack', Kind: 'directory' }])
    render(<CHeaderManager />)
    expect(await screen.findByText('stdio-pack')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('CHeaderManager.searchPlaceholder'), 'zzz')
    expect(await screen.findByText('CHeaderManager.searchEmptyTitle')).toBeInTheDocument()
    expect(screen.queryByText('stdio-pack')).not.toBeInTheDocument()
  })
})
