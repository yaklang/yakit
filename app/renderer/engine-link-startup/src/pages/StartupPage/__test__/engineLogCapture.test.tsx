import type React from 'react'
import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub
})

const ipc = vi.hoisted(() => ({
  stdio: undefined as undefined | ((stdout: string) => void),
  log: undefined as undefined | ((stdout: string) => void),
}))
const writes = vi.hoisted(() => [] as string[])

vi.mock('@/utils/electronBridge', () => ({
  yakitLogs: {
    onLiveEngineStdio: (callback: (stdout: string) => void) => {
      ipc.stdio = callback
      return () => {
        ipc.stdio = undefined
      }
    },
    onLiveEngineLog: (callback: (stdout: string) => void) => {
      ipc.log = callback
      return () => {
        ipc.log = undefined
      }
    },
  },
}))
vi.mock('@/utils/envfile', () => ({ getReleaseEditionName: () => 'Yakit' }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, values?: { stdout?: string }) => (values?.stdout ? `${key}:${values.stdout}` : key),
  }),
}))
vi.mock('@/utils/xtermUtils', () => ({ xtermFit: vi.fn() }))
vi.mock('@/hooks/useXTermOptions', () => ({ useXTermOptions: () => ({}) }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('antd', () => ({ Tooltip: ({ children }: { children?: React.ReactNode }) => children }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({ DocumentDuplicateOutlined: () => null }))
vi.mock('xterm-for-react', async () => {
  const React = await import('react')
  return {
    XTerm: React.forwardRef((_props: unknown, ref: React.Ref<{ terminal: { write: (text: string) => void } }>) => {
      React.useImperativeHandle(ref, () => ({
        terminal: { write: (text: string) => writes.push(text) },
      }))
      return React.createElement('div')
    }),
  }
})

import { resetEngineLogCaptureForTest, startEngineLogCapture } from '../engineLogCapture'
import { EngineLog } from '../components/EngineLog'

describe('引擎日志提前订阅', () => {
  afterEach(() => {
    resetEngineLogCaptureForTest()
    writes.length = 0
  })

  it('终端挂载前回放已缓冲的输出，之后的输出继续写入', async () => {
    startEngineLogCapture()
    ipc.stdio?.('early-stdio\n')
    ipc.log?.('early-log')

    render(<EngineLog />)

    await waitFor(() => {
      const text = writes.join('')
      expect(text).toContain('early-stdio')
      expect(text).toContain('early-log')
    })

    ipc.stdio?.('later-stdio')
    expect(writes.join('')).toContain('later-stdio')
  })
})
