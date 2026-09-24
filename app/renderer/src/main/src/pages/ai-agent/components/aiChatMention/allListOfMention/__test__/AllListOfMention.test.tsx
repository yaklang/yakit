import { createRef, type ReactNode } from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIMentionTabsEnum } from '../../../../defaultConstant'
import type { AllListOfMentionProps, AIChatMentionListRefProps } from '../../type'

const { mocks } = vi.hoisted(() => {
  const pendingRejects: Array<(reason?: unknown) => void> = []
  const keyboard = {
    onSelectNumber: null as null | ((index: number, isScroll: boolean) => void),
  }
  return {
    mocks: {
      failed: vi.fn(),
      pendingRejects,
      keyboard,
      grpcQueryAIForge: vi.fn(),
      grpcGetAIToolList: vi.fn(),
      grpcQueryAIFocus: vi.fn(),
      resetPending() {
        pendingRejects.length = 0
      },
      mockAllPendingReject() {
        const make = () =>
          new Promise((_, reject) => {
            pendingRejects.push(reject)
          })
        mocks.grpcQueryAIForge.mockImplementation(make)
        mocks.grpcGetAIToolList.mockImplementation(make)
        mocks.grpcQueryAIFocus.mockImplementation(make)
      },
    },
  }
})

vi.mock('@/utils/notification', () => ({
  failed: mocks.failed,
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useInViewport: () => [true],
  }
})

vi.mock('../../../../grpc', () => ({
  grpcQueryAIForge: (...args: unknown[]) => mocks.grpcQueryAIForge(...args),
  grpcQueryAIFocus: (...args: unknown[]) => mocks.grpcQueryAIFocus(...args),
}))

vi.mock('../../../../aiToolList/utils', () => ({
  grpcGetAIToolList: (...args: unknown[]) => mocks.grpcGetAIToolList(...args),
}))

vi.mock('@/pages/KnowledgeBase/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: () => ({ knowledgeBases: [] }),
}))

vi.mock('../../../../browserInstances/browserInstanceStore', () => ({
  useBrowserInstances: () => ({ instances: [] }),
  browserInstanceMentionName: (item: { name?: string }) => item.name || '',
}))

vi.mock('../../hooks/useSwitchSelectByKeyboard', () => ({
  default: (_ref: unknown, params: { onSelectNumber: (index: number, isScroll: boolean) => void }) => {
    mocks.keyboard.onSelectNumber = params.onSelectNumber
  },
}))

vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const { AllListOfMention } = await import('../AllListOfMention')

const sections = [
  { value: AIMentionTabsEnum.Forge_Name, label: 'AIMentionTabs.skill' },
  { value: AIMentionTabsEnum.Tool, label: 'AIMentionTabs.tool' },
  { value: AIMentionTabsEnum.FocusMode, label: 'AiAgengt.focusMode' },
]

function renderList(props?: Partial<AllListOfMentionProps>) {
  const listRef = createRef<AIChatMentionListRefProps>()
  const onSectionTotalChange = vi.fn()
  render(
    <AllListOfMention
      ref={listRef}
      keyWord=""
      sections={sections}
      getContainer={() => document.body}
      onSelectForge={vi.fn()}
      onSelectTool={vi.fn()}
      onSelectKnowledgeBase={vi.fn()}
      onSelectFocusMode={vi.fn()}
      onSelectBrowser={vi.fn()}
      onSectionTotalChange={onSectionTotalChange}
      {...props}
    />,
  )
  return { listRef, onSectionTotalChange }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.resetPending()
  mocks.keyboard.onSelectNumber = null
})

beforeEach(() => {
  mocks.resetPending()
  mocks.keyboard.onSelectNumber = null
})

describe('AllListOfMention 远程加载错误提示', () => {
  it('最新请求失败时 failed 恰好调用一次', async () => {
    mocks.grpcQueryAIForge.mockRejectedValue(new Error('forge down'))
    mocks.grpcGetAIToolList.mockResolvedValue({ Tools: [], Total: 0, Pagination: {} })
    mocks.grpcQueryAIFocus.mockResolvedValue({ Data: [] })

    renderList()

    await waitFor(() => expect(mocks.failed).toHaveBeenCalledTimes(1))
    expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('forge down'))
  })

  it('旧请求失败时不弹 failed（已被新请求顶替）', async () => {
    mocks.mockAllPendingReject()
    const { listRef } = renderList()

    await waitFor(() => expect(mocks.pendingRejects.length).toBe(3))

    await act(async () => {
      listRef.current?.onRefresh()
    })
    await waitFor(() => expect(mocks.pendingRejects.length).toBe(6))

    // 先让旧批次失败 → stale，不应提示
    await act(async () => {
      mocks.pendingRejects[0](new Error('stale fail'))
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(mocks.failed).not.toHaveBeenCalled()

    // 新批次失败 → 提示一次
    await act(async () => {
      mocks.pendingRejects[3](new Error('latest fail'))
    })
    await waitFor(() => expect(mocks.failed).toHaveBeenCalledTimes(1))
    expect(mocks.failed).toHaveBeenCalledWith(expect.stringContaining('latest fail'))
  })
})

describe('AllListOfMention onKeyboardSelect isScroll 门控', () => {
  function mockListData() {
    mocks.grpcQueryAIForge.mockResolvedValue({
      Data: [{ Id: 1, ForgeName: 'skill-a', ForgeVerboseName: 'skill-a' }],
      Total: 1,
      Pagination: {},
    })
    mocks.grpcGetAIToolList.mockResolvedValue({
      Tools: [
        { ID: 10, Name: 'tool-a', VerboseName: 'tool-a' },
        { ID: 11, Name: 'tool-b', VerboseName: 'tool-b' },
      ],
      Total: 2,
      Pagination: {},
    })
    mocks.grpcQueryAIFocus.mockResolvedValue({ Data: [] })
  }

  it('isScroll=false 不触发 scrollIntoView；true 时触发', async () => {
    mockListData()
    const scrollIntoView = vi.fn()
    const originalGetElementById = document.getElementById.bind(document)
    vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      const el = originalGetElementById(id)
      if (el) {
        el.scrollIntoView = scrollIntoView
      }
      return el
    })

    renderList()

    await waitFor(() => expect(mocks.keyboard.onSelectNumber).toBeTruthy())
    await waitFor(() => expect(document.getElementById('all-tool-10')).toBeTruthy())

    await act(async () => {
      mocks.keyboard.onSelectNumber?.(1, false)
    })
    expect(scrollIntoView).not.toHaveBeenCalled()

    await act(async () => {
      mocks.keyboard.onSelectNumber?.(1, true)
    })
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })
})
