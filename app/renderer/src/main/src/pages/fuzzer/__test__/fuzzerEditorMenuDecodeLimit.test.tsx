import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DraggingStyle } from '@hello-pangea/dnd'
import type { AutoDecodeResult } from '@/utils/encodec'

type AutoDecodeIpcResponse = { Results: AutoDecodeResult[] }

const invoke = vi.fn<(...args: unknown[]) => Promise<AutoDecodeIpcResponse>>(() => Promise.resolve({ Results: [] }))

vi.mock('@/utils/monacoSpec/yakEditor', () => ({}))
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))
vi.mock('@xterm/xterm', () => ({ Terminal: vi.fn() }))

vi.hoisted(() => {
  const ipcRenderer = {
    on: () => undefined,
    off: () => undefined,
    once: () => undefined,
    removeListener: () => undefined,
    removeAllListeners: () => undefined,
    send: () => undefined,
    invoke: (...args: unknown[]) => invoke(...args),
  }
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer }
    return {}
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh' },
  }),
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ onClick, children }: { onClick?: () => void; children?: React.ReactNode }) => (
    <button type="button" data-testid="decode-replace" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('@/utils/notification', () => ({ failed: vi.fn() }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))

import { DecodeComponent, getInsertTagDragPosition } from '../fuzzerEditorMenuItems'

const decodeResult = (resultText: string): AutoDecodeResult => ({
  Type: 'Base64',
  TypeVerbose: 'Base64',
  Origin: new Uint8Array(),
  Result: new TextEncoder().encode(resultText),
  Modify: true,
})

describe('getInsertTagDragPosition', () => {
  it('非拖拽时 top/left 为 none', () => {
    expect(getInsertTagDragPosition(false, { top: 100, left: 200 })).toEqual({
      top: 'none',
      left: 'none',
    })
  })

  it('拖拽时直接使用视口坐标，不做 editor/60 补偿', () => {
    expect(getInsertTagDragPosition(true, { top: 320, left: 480 })).toEqual({
      top: 320,
      left: 480,
    })
  })

  it('缺少 top/left 时回落 none', () => {
    expect(getInsertTagDragPosition(true, {} as Pick<DraggingStyle, 'top' | 'left'>)).toEqual({
      top: 'none',
      left: 'none',
    })
    expect(getInsertTagDragPosition(true, null)).toEqual({ top: 'none', left: 'none' })
  })
})

describe('DecodeComponent full-range AutoDecode + replace', () => {
  beforeEach(() => {
    invoke.mockReset()
    invoke.mockResolvedValue({ Results: [] })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('长选区仍用完整 rangeValue 调用 AutoDecode（不截断、不拒绝）', async () => {
    const longInput = 'A'.repeat(256 * 1024 + 1)
    invoke.mockResolvedValue({
      Results: [decodeResult('decoded-long')],
    })
    render(<DecodeComponent rangeValue={longInput} replace={vi.fn()} />)
    await waitFor(() => expect(invoke).toHaveBeenCalled())
    expect(invoke.mock.calls[0][0]).toBe('AutoDecode')
    expect((invoke.mock.calls[0][1] as { Data: string }).Data).toBe(longInput)
    expect((invoke.mock.calls[0][1] as { Data: string }).Data.length).toBe(longInput.length)
    await waitFor(() => expect(screen.getByTestId('decode-replace')).toBeTruthy())
    expect(screen.queryByText('DecodeComponent.inputTooLarge')).toBeNull()
  })

  it('解码成功时可替换整段结果', async () => {
    const replace = vi.fn()
    invoke.mockResolvedValue({
      Results: [decodeResult('hello-decoded')],
    })
    render(<DecodeComponent rangeValue="aGVsbG8=" replace={replace} />)
    await waitFor(() => expect(screen.getByTestId('decode-replace')).toBeTruthy())
    await act(async () => {
      screen.getByTestId('decode-replace').click()
    })
    expect(replace).toHaveBeenCalledWith('hello-decoded')
    expect(invoke).toHaveBeenCalledWith('AutoDecode', { Data: 'aGVsbG8=' })
  })

  it('QUFB.repeat 长输入：整串传给 AutoDecode，可替换', async () => {
    const input = 'QUFB'.repeat(65537)
    const replace = vi.fn()
    invoke.mockResolvedValue({
      Results: [decodeResult('AAA-repeated')],
    })
    render(<DecodeComponent rangeValue={input} replace={replace} />)
    await waitFor(() => expect(invoke).toHaveBeenCalled())
    expect((invoke.mock.calls[0][1] as { Data: string }).Data).toBe(input)
    await waitFor(() => expect(screen.getByTestId('decode-replace')).toBeTruthy())
    await act(async () => {
      screen.getByTestId('decode-replace').click()
    })
    expect(replace).toHaveBeenCalledWith('AAA-repeated')
  })

  it('空选区不调用 AutoDecode，展示无解码信息', async () => {
    render(<DecodeComponent rangeValue="" replace={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('DecodeComponent.noDecodeInfo')).toBeTruthy()
    })
    expect(invoke).not.toHaveBeenCalled()
  })
})
