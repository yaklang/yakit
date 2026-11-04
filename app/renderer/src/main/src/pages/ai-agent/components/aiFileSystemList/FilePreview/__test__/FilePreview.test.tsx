import React from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FilePreview from '../FilePreview'
const mocks = vi.hoisted(() => ({ size: vi.fn(), read: vi.fn(), editor: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({
  getCodeSizeByPath: (...args: any[]) => mocks.size(...args),
  getCodeByPath: (...args: any[]) => mocks.read(...args),
  MAX_FILE_SIZE_BYTES: 100,
  monacaLanguageType: () => 'plaintext',
}))
vi.mock('@/pages/yakRunner/FileTree/icon', () => ({ KeyToIcon: {} }))
vi.mock('@/pages/notepadManage/notepadManage/utils', () => ({ onOpenLocalFileByPath: vi.fn() }))
vi.mock('@/components/MilkdownEditor/CustomFile/utils', () => ({ getLocalFileName: async () => ({ suffix: 'txt' }) }))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: (props: any) => {
    mocks.editor(props)
    return <div data-testid="content">{props.value}</div>
  },
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({ YakitSpin: ({ children }: any) => <>{children}</> }))
vi.mock('@/components/yakitUI/YakitHint/YakitHint', () => ({
  YakitHint: ({ visible }: any) => (visible ? <div role="alert">too large</div> : null),
}))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({ CopyComponents: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({ YakitButton: () => null }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
const file = (path: string) => ({ path, name: path, isFolder: false }) as any
beforeEach(() => {
  vi.clearAllMocks()
  mocks.size.mockResolvedValue({ size: 10, isPlainText: true })
  mocks.read.mockImplementation(async (path) => path)
})
afterEach(cleanup)
describe('file preview request boundaries', () => {
  it('passes search ranges to the existing read-only editor', async () => {
    const highlights = [{ startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 4 }]
    render(<FilePreview data={file('new.txt')} highlights={highlights} />)
    await waitFor(() => expect(screen.getByTestId('content')).toHaveTextContent('new.txt'))
    expect(mocks.editor.mock.calls.at(-1)?.[0]).toMatchObject({ readOnly: true, highLightFind: highlights })
  })
  it('does not read content over the existing size limit', async () => {
    mocks.size.mockResolvedValue({ size: 101, isPlainText: true })
    render(<FilePreview data={file('large.txt')} />)
    await screen.findByRole('alert')
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it('ignores an old read after the selected path changes', async () => {
    let resolve!: (value: string) => void
    mocks.read.mockImplementation((path) =>
      path === 'old.txt' ? new Promise<string>((r) => (resolve = r)) : Promise.resolve('new contents'),
    )
    const view = render(<FilePreview data={file('old.txt')} />)
    await waitFor(() => expect(mocks.read).toHaveBeenCalledWith('old.txt'))
    view.rerender(<FilePreview data={file('new.txt')} />)
    await waitFor(() => expect(screen.getByTestId('content')).toHaveTextContent('new contents'))
    await act(async () => resolve('old contents'))
    expect(screen.getByTestId('content')).toHaveTextContent('new contents')
  })
})
