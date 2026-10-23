import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const anchoredCalls: Array<{ open: boolean; openId?: string; reveal: boolean }> = []

vi.mock('../fuzzerEditorMenuLayout', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../fuzzerEditorMenuLayout')>()
  return {
    ...mod,
    useMenuBarLayout: () => true,
    useAnchoredMenuPanel: (
      open: boolean,
      _bar: unknown,
      _anchor: unknown,
      _direction: unknown,
      openId: string | undefined,
      reveal: boolean,
    ) => {
      anchoredCalls.push({ open, openId, reveal })
      return {
        position: 'absolute' as const,
        visibility: (reveal ? 'visible' : 'hidden') as 'visible' | 'hidden',
        maxWidth: 360,
      }
    },
  }
})

import { FuzzerEditorMenuBar, type FuzzerEditorMenuGroup } from '../fuzzerEditorMenuBar'

describe('FuzzerEditorMenuBar onItemClick / waitReady', () => {
  beforeEach(() => {
    anchoredCalls.length = 0
  })

  afterEach(() => {
    cleanup()
  })

  const groups = (waitReady: boolean): FuzzerEditorMenuGroup[] => [
    {
      id: 'g1',
      simpleClassName: 'simple',
      items: [
        {
          id: 'insert',
          label: 'Insert',
          icon: <span>i</span>,
          className: 'item',
          waitReady,
          renderPanel: ({ onReady }) => (
            <button type="button" data-testid="panel-ready" onClick={() => onReady()}>
              ready
            </button>
          ),
        },
        {
          id: 'other',
          label: 'Other',
          icon: <span>o</span>,
          className: 'item',
          waitReady,
          renderPanel: ({ onReady }) => (
            <button type="button" data-testid="panel-ready-other" onClick={() => onReady()}>
              ready-other
            </button>
          ),
        },
      ],
    },
  ]

  it('waitReady 面板打开时 reveal=false，onReady 后 reveal=true', () => {
    render(<FuzzerEditorMenuBar groups={groups(true)} lang="zh" />)
    fireEvent.click(screen.getByText('Insert'))

    const afterOpen = anchoredCalls.filter((c) => c.open && c.openId === 'insert')
    expect(afterOpen.length).toBeGreaterThan(0)
    expect(afterOpen[afterOpen.length - 1].reveal).toBe(false)
    expect(screen.getByTestId('panel-ready')).toBeTruthy()

    fireEvent.click(screen.getByTestId('panel-ready'))
    const afterReady = anchoredCalls.filter((c) => c.open && c.openId === 'insert')
    expect(afterReady[afterReady.length - 1].reveal).toBe(true)
  })

  it('切换到另一项时 openId 互斥且重新 waitReady（reveal=false）', () => {
    render(<FuzzerEditorMenuBar groups={groups(true)} lang="zh" />)
    fireEvent.click(screen.getByText('Insert'))
    fireEvent.click(screen.getByTestId('panel-ready'))
    expect(anchoredCalls[anchoredCalls.length - 1]).toMatchObject({ open: true, openId: 'insert', reveal: true })

    fireEvent.click(screen.getByText('Other'))
    const afterSwitch = anchoredCalls[anchoredCalls.length - 1]
    expect(afterSwitch.open).toBe(true)
    expect(afterSwitch.openId).toBe('other')
    expect(afterSwitch.reveal).toBe(false)
    expect(screen.queryByTestId('panel-ready')).toBeNull()
    expect(screen.getByTestId('panel-ready-other')).toBeTruthy()
  })

  it('再次点击同一项关闭面板', () => {
    render(<FuzzerEditorMenuBar groups={groups(false)} lang="zh" />)
    fireEvent.click(screen.getByText('Insert'))
    expect(anchoredCalls[anchoredCalls.length - 1].open).toBe(true)
    fireEvent.click(screen.getByText('Insert'))
    expect(anchoredCalls[anchoredCalls.length - 1].open).toBe(false)
  })
})
