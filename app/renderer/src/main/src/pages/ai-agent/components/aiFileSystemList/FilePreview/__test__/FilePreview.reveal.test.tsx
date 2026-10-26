import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'

const { emit, on, off, revealPositionInCenter } = vi.hoisted(() => {
  const listeners = new Map<string, Array<(data: string) => void>>()
  return {
    revealPositionInCenter: vi.fn(),
    on: vi.fn((event: string, fn: (data: string) => void) => {
      listeners.set(event, [...(listeners.get(event) || []), fn])
    }),
    off: vi.fn((event: string, fn: (data: string) => void) => {
      listeners.set(
        event,
        (listeners.get(event) || []).filter((item) => item !== fn),
      )
    }),
    emit: vi.fn((event: string, data: string) => {
      ;(listeners.get(event) || []).forEach((fn) => fn(data))
    }),
  }
})

vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit, on, off } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/pages/yakRunner/utils', () => ({
  getCodeByPath: vi.fn().mockResolvedValue('hello'),
  getCodeSizeByPath: vi.fn().mockResolvedValue({ size: 10, isPlainText: true }),
  MAX_FILE_SIZE_BYTES: 1024 * 1024,
  monacaLanguageType: () => 'plaintext',
}))
vi.mock('@/components/MilkdownEditor/CustomFile/utils', () => ({
  getLocalFileName: vi.fn().mockResolvedValue({ suffix: 'txt' }),
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children: unknown }) => children,
}))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: ({ editorDidMount }: { editorDidMount?: (editor: { revealPositionInCenter: () => void }) => void }) => {
    editorDidMount?.({ revealPositionInCenter })
    return <div data-testid="yakit-editor" />
  },
}))

import FilePreview from '../FilePreview'

const file = { path: '/tmp/demo.txt', name: 'demo.txt', isFolder: false } as FileNodeProps

beforeEach(() => {
  revealPositionInCenter.mockReset()
})

describe('FilePreview revealAIFilePreviewSearchHit', () => {
  it('收到同路径命中事件时滚动编辑器', async () => {
    render(<FilePreview data={file} highlights={[]} />)
    await screen.findByTestId('yakit-editor')

    emit('revealAIFilePreviewSearchHit', JSON.stringify({ path: '/tmp/demo.txt', lineNumber: 8, column: 2 }))
    expect(revealPositionInCenter).toHaveBeenCalledWith({ lineNumber: 8, column: 2 })
  })

  it('路径不一致时不滚动', async () => {
    render(<FilePreview data={file} highlights={[]} />)
    await screen.findByTestId('yakit-editor')

    emit('revealAIFilePreviewSearchHit', JSON.stringify({ path: '/tmp/other.txt', lineNumber: 1, column: 1 }))
    expect(revealPositionInCenter).not.toHaveBeenCalled()
  })
})
