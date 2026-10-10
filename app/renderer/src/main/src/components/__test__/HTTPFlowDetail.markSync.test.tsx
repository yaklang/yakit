import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HTTPFlowDetailMini } from '../HTTPFlowDetail'
import type { HTTPFlow } from '../HTTPFlowTable/HTTPFlowTable.constants'

const mocks = vi.hoisted(() => ({
  modalOptions: undefined as undefined | { content?: { props?: { info?: HTTPFlow } } },
  ipcInvoke: vi.fn(async (channel: string) => {
    if (channel === 'QueryMITMRuleExtractedData') return { Total: 0, Data: [] }
    return {}
  }),
}))

vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: mocks.ipcInvoke, on: vi.fn(), removeListener: vi.fn() } }),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({ fillStyle: '', fillRect: vi.fn() }),
  })
})

vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, useInViewport: () => [true] }
})
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, isEnterpriseEdition: () => true }
})
vi.mock('@/store', () => ({ useStore: () => ({ userInfo: { token: 'token', isLogin: true } }) }))
vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async (key: string) => (key === 'HISTORY_FOLD' ? 'false' : undefined)),
  setRemoteValue: vi.fn(),
}))
vi.mock('@/utils/tool', () => ({ JSONParseLog: (value: string) => JSON.parse(value) }))
vi.mock('@/store/binaryDisplayEnabled', () => ({
  binaryDisplayEnabledStore: { setEnabled: vi.fn() },
  useBinaryDisplayEnabled: () => false,
}))
vi.mock('../yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ secondNode }: { secondNode: ReactNode }) => secondNode,
}))
vi.mock('../utils/editors', () => ({
  NewHTTPCard: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
    <div>
      {title}
      {children}
    </div>
  ),
  NewHTTPPacketEditor: () => null,
}))
vi.mock('../HTTPFlowTable/FlowDisposalLog', () => ({ FlowDisposalLog: () => null }))
vi.mock('../HTTPFlowTable/FlowMarkEditForm', () => ({ FlowMarkEditForm: () => null }))
vi.mock('../yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: (options: typeof mocks.modalOptions) => {
    mocks.modalOptions = options
    return { destroy: vi.fn() }
  },
}))

afterEach(() => {
  cleanup()
  mocks.modalOptions = undefined
  mocks.ipcInvoke.mockClear()
})

describe('HTTPFlowDetailMini mark synchronization', () => {
  it('uses the latest mark values when selectedFlow updates with the same id', async () => {
    const initialFlow = {
      Id: 7,
      RequestString: 'GET / HTTP/1.1',
      ResponseString: 'HTTP/1.1 200 OK',
      IssueType: 'SQL注入',
      Severity: '低危',
      Status: '待修复',
      StatusReason: 'old note',
    } as HTTPFlow
    const updatedFlow = {
      ...initialFlow,
      IssueType: 'XSS',
      Severity: '高危',
      Status: '已修复',
      StatusReason: 'new note',
    }
    const { rerender } = render(<HTTPFlowDetailMini id={7} selectedFlow={initialFlow} />)

    fireEvent.click(await screen.findByText('HTTPFlowTable.RowContextMenu.modifyMark'))
    await waitFor(() => expect(mocks.modalOptions?.content?.props?.info?.IssueType).toBe('SQL注入'))
    mocks.modalOptions = undefined

    rerender(<HTTPFlowDetailMini id={7} selectedFlow={updatedFlow} />)
    fireEvent.click(screen.getByText('HTTPFlowTable.RowContextMenu.modifyMark'))

    await waitFor(() => {
      expect(mocks.modalOptions?.content?.props?.info).toMatchObject({
        Id: 7,
        IssueType: 'XSS',
        Severity: '高危',
        Status: '已修复',
        StatusReason: 'new note',
      })
    })
  })
})
