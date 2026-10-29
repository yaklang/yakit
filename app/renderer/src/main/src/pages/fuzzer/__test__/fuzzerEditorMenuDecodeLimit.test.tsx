import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn(() => Promise.resolve({ Results: [] }))

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

import { AUTO_DECODE_MAX_CHARS, DecodeComponent, getInsertTagDragPosition } from '../fuzzerEditorMenuItems'

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
    expect(getInsertTagDragPosition(true, {})).toEqual({ top: 'none', left: 'none' })
    expect(getInsertTagDragPosition(true, null)).toEqual({ top: 'none', left: 'none' })
  })
})

describe('DecodeComponent oversize + replace chain', () => {
  beforeEach(() => {
    invoke.mockReset()
    invoke.mockResolvedValue({ Results: [] })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('超限选区拒绝解码且不调用 AutoDecode，展示 inputTooLarge', async () => {
    const oversized = 'A'.repeat(AUTO_DECODE_MAX_CHARS + 1)
    render(<DecodeComponent rangeValue={oversized} replace={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('DecodeComponent.inputTooLarge')).toBeTruthy()
    })
    expect(invoke).not.toHaveBeenCalled()
    expect(screen.queryByTestId('decode-replace')).toBeNull()
  })

  it('边界恰好等于上限仍解码', async () => {
    invoke.mockResolvedValue({
      Results: [{ Type: 'Base64', TypeVerbose: 'Base64', Result: new TextEncoder().encode('AAA') }],
    })
    const exact = 'Q'.repeat(AUTO_DECODE_MAX_CHARS)
    render(<DecodeComponent rangeValue={exact} replace={vi.fn()} />)
    await waitFor(() => expect(invoke).toHaveBeenCalled())
    expect(invoke.mock.calls[0][0]).toBe('AutoDecode')
    expect((invoke.mock.calls[0][1] as { Data: string }).Data.length).toBe(AUTO_DECODE_MAX_CHARS)
  })

  it('未超限解码成功时可替换整段结果', async () => {
    const replace = vi.fn()
    invoke.mockResolvedValue({
      Results: [
        {
          Type: 'Base64',
          TypeVerbose: 'Base64',
          // Buffer.from(item.Result).toString('utf8') in DecodeCopyReplace
          Result: new TextEncoder().encode('hello-decoded'),
        },
      ],
    })
    render(<DecodeComponent rangeValue="aGVsbG8=" replace={replace} />)
    await waitFor(() => expect(screen.getByTestId('decode-replace')).toBeTruthy())
    await act(async () => {
      screen.getByTestId('decode-replace').click()
    })
    expect(replace).toHaveBeenCalledWith('hello-decoded')
    expect(invoke).toHaveBeenCalledWith('AutoDecode', { Data: 'aGVsbG8=' })
  })

  it('QUFB.repeat 超限案例：65537*4 > 256KB 时拒绝，避免截断替换丢尾', async () => {
    const input = 'QUFB'.repeat(65537)
    expect(input.length).toBeGreaterThan(AUTO_DECODE_MAX_CHARS)
    const replace = vi.fn()
    render(<DecodeComponent rangeValue={input} replace={replace} />)
    await waitFor(() => {
      expect(screen.getByText('DecodeComponent.inputTooLarge')).toBeTruthy()
    })
    expect(invoke).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
