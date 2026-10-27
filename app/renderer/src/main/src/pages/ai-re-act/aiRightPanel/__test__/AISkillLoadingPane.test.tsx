import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { useRef } from 'react'
import type { VirtuosoProps } from 'react-virtuoso'
import type { AIAgentChatData } from '@/pages/ai-agent/type/aiChat'
import type { AISkillListItem } from '../AISkillLoadingPane/aiSkillList/type'
import type * as AISkillLoadingPaneModule from '../AISkillLoadingPane/AISkillLoadingPane'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import { DEFAULT_SKILL_PAGE_SIZE } from '../../hooks/defaultConstant'
import { aiTaskDetailDataHandlers } from '../../hooks/grpcStreamHandler/aiTaskDetail'
import { makeGrpcJsonRes, makeHandlerRequest } from '../../hooks/__test__/fixtures'

const store = createStore(() => ({
  sessionId: 'session-1',
  currentChatStatus: { questionID: '', coordinatorId: '' },
  loadedSkillsUpdate: 0,
  availableSkillsUpdate: 0,
  syncIDUpdate: 0,
  inViewport: false,
  initLoading: false,
  grpcLoadMoreLoading: false,
}))
const meta = { syncIDMap: new Map<string, boolean>() }
const sessions = new Map<string, Pick<AIAgentChatData, 'loadedSkills' | 'availableSkills' | 'skillDetails'>>()
const { virtuosoList, onSend } = vi.hoisted(() => ({ virtuosoList: vi.fn(), onSend: vi.fn() }))

vi.mock('ahooks', async () => ({
  ...(await vi.importActual('ahooks')),
  useInViewport: () => [useStore(store, (state) => state.inViewport)],
}))
vi.mock('react-virtuoso', () => ({
  Virtuoso: (props: VirtuosoProps<AISkillListItem, unknown>) => {
    const lastEndReached = useRef<{ index: number; data: typeof props.data }>()
    virtuosoList(props)
    return (
      <div
        data-testid="skill-virtuoso"
        onScroll={() => {
          const index = (props.data?.length ?? 0) - 1
          // 与 Virtuoso 一致，同一末索引和数据引用只触发一次。
          if (lastEndReached.current?.index === index && lastEndReached.current.data === props.data) return
          lastEndReached.current = { index, data: props.data }
          props.endReached?.(index)
        }}
      >
        {props.data?.map((skill, index) => (
          <div key={skill.name}>{props.itemContent?.(index, skill, undefined)}</div>
        ))}
      </div>
    )
  },
}))
vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentMeta: () => meta,
  useCurrentRawData: () => sessions.get(useStore(store, (state) => state.sessionId)),
}))
vi.mock('../../hooks/useCurrentSessionId', () => ({
  default: () => store.getState().sessionId,
}))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend }) }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))

const { AISkillLoadingPane } = await compileReactModule<typeof AISkillLoadingPaneModule>(
  import.meta.url,
  '../AISkillLoadingPane/AISkillLoadingPane.tsx',
)

const createSkill = (
  name: string,
  loadState: AISkillListItem['skill_load_state'],
  tokenCount?: number,
): AISkillListItem => ({
  name,
  description: name === 'code-review' ? '代码审查' : '技能描述',
  skill_load_state: loadState,
  token_count: tokenCount,
})

const acknowledge = (syncId: string) => {
  meta.syncIDMap.delete(syncId)
  store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
}
const names = () => virtuosoList.mock.lastCall![0].data.map((skill: AISkillListItem) => skill.name)

const createDirectory = (count: number) => {
  const catalog = Array.from({ length: count }, (_, index) =>
    createSkill(`scan-${String(index + 1).padStart(3, '0')}`, 'metadata'),
  )
  const loaded = new Set<string>()
  const request = makeHandlerRequest({ res: makeGrpcJsonRes('structured', {}) })
  sessions.set('session-1', request.rawData)
  const available = () => catalog.filter((skill) => !loaded.has(skill.name))
  const deliver = (page: number) => {
    const remaining = available()
    request.res = makeGrpcJsonRes(
      'structured',
      {
        skills: remaining
          .slice((page - 1) * DEFAULT_SKILL_PAGE_SIZE, page * DEFAULT_SKILL_PAGE_SIZE)
          .map((skill) => ({ ...skill, data: { token_count: 0 } })),
        total: remaining.length,
        page,
        page_size: DEFAULT_SKILL_PAGE_SIZE,
        has_more: page * DEFAULT_SKILL_PAGE_SIZE < remaining.length,
      },
      { NodeId: 'skill_available' },
    )
    aiTaskDetailDataHandlers.skill_available(request)
    store.setState({ availableSkillsUpdate: request.store.getState().availableSkillsUpdate })
  }
  const fail = (syncId: string) => {
    request.res = makeGrpcJsonRes(
      'structured',
      { skills: [], query: '', error: 'failed to read skill directory' },
      { NodeId: 'skill_available', IsSync: true, SyncID: syncId },
    )
    aiTaskDetailDataHandlers.skill_available(request)
    store.setState({ availableSkillsUpdate: request.store.getState().availableSkillsUpdate })
  }
  deliver(1)
  return { available, loaded, deliver, fail }
}

const finishPage = async (directory: ReturnType<typeof createDirectory>, order: string) => {
  const { SyncID, SyncJsonInput } = onSend.mock.lastCall![0].params
  const { page } = JSON.parse(SyncJsonInput)
  if (order === 'receipt-first') {
    act(() => acknowledge(SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    act(() => directory.deliver(page))
  } else {
    act(() => directory.deliver(page))
    act(() => acknowledge(SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  store.setState({
    sessionId: 'session-1',
    currentChatStatus: { questionID: '', coordinatorId: '' },
    loadedSkillsUpdate: 0,
    availableSkillsUpdate: 0,
    syncIDUpdate: 0,
    inViewport: false,
    initLoading: false,
    grpcLoadMoreLoading: false,
  })
  meta.syncIDMap.clear()
  sessions.clear()
  sessions.set('session-1', {
    skillDetails: new Map(),
    loadedSkills: {
      skills: [createSkill('large-skill', 'loaded', 123), createSkill('code-review', 'loaded', 0)],
      total: 2,
    },
    availableSkills: {
      skills: [createSkill('available-skill', 'metadata')],
      total: 132,
      page: 1,
      page_size: 100,
      has_more: true,
    },
  })
  virtuosoList.mockClear()
  onSend.mockReset()
  onSend.mockImplementation(({ params }: { params: { SyncID: string } }) => {
    if (store.getState().initLoading || store.getState().grpcLoadMoreLoading) return false
    meta.syncIDMap.set(params.SyncID, true)
    store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
    return true
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('AISkillLoadingPane session skills', () => {
  it.each(['loaded', 'metadata'] as const)('%s 刷新成功发送后回到顶部，收到数据后保持顶部', (loadState) => {
    render(<AISkillLoadingPane loadState={loadState} />)
    const list = screen.getByRole('list')
    list.scrollTop = 180
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(list.scrollTop).toBe(0)
    act(() => {
      const current = sessions.get('session-1')!
      if (loadState === 'metadata') {
        current.availableSkills = {
          ...current.availableSkills,
          page: 1,
          skills: [createSkill('new-skill', 'metadata')],
        }
        store.setState({ availableSkillsUpdate: 1 })
      } else {
        current.loadedSkills = { skills: [createSkill('new-skill', 'loaded')], total: 1 }
        store.setState({ loadedSkillsUpdate: 1 })
      }
    })
    expect(list.scrollTop).toBe(0)
  })

  it('未加载刷新发送被拒绝时保留滚动位置', () => {
    onSend.mockReturnValueOnce(false)
    render(<AISkillLoadingPane loadState="metadata" />)
    const list = screen.getByRole('list')
    list.scrollTop = 180
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(list.scrollTop).toBe(180)
  })

  it('加载更多只显示底部 loading，回执提前到达时等待数据，末页显示暂无更多数据', async () => {
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
    await act(async () => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByRole('list').closest('.ant-spin-container')).not.toHaveClass('ant-spin-blur')
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toHaveClass('ant-btn-loading')
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toHaveClass('ant-btn-loading')
    act(() => {
      const current = sessions.get('session-1')!
      current.availableSkills = { ...current.availableSkills, page: 2, has_more: false }
      store.setState({ availableSkillsUpdate: 1 })
    })
    expect(screen.getByRole('status')).toHaveTextContent('YakitEmpty.noMoreData')
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toBeDisabled()
  })

  it.each([
    { order: 'receipt-first', recovery: 'pagination' },
    { order: 'receipt-first', recovery: 'refresh' },
    { order: 'receipt-first', recovery: 'search' },
    { order: 'error-first', recovery: 'pagination' },
    { order: 'error-first', recovery: 'refresh' },
    { order: 'error-first', recovery: 'search' },
  ])('分页错误无 page 时结束 loading 并允许 $recovery：$order', async ({ order, recovery }) => {
    const directory = createDirectory(125)
    const current = sessions.get('session-1')!
    const previous = current.availableSkills
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    const syncId = onSend.mock.lastCall![0].params.SyncID
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput).page).toBe(2)
    expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
    if (order === 'receipt-first') {
      act(() => acknowledge(syncId))
      await act(async () => vi.advanceTimersByTimeAsync(300))
      expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
      act(() => directory.fail(syncId))
    } else {
      act(() => directory.fail(syncId))
      expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
      act(() => acknowledge(syncId))
      await act(async () => vi.advanceTimersByTimeAsync(300))
    }
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toBeDisabled()
    expect(current.availableSkills).toBe(previous)
    expect(names()).toEqual(previous.skills.map((skill) => skill.name))
    expect(onSend).toHaveBeenCalledTimes(1)

    if (recovery === 'pagination') act(() => virtuosoList.mock.lastCall![0].endReached())
    else if (recovery === 'refresh') fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    else fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'scan' } })
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: recovery === 'pagination' ? 2 : 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: recovery === 'search' ? 'scan' : '',
    })
    await finishPage(directory, 'data-first')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toBeDisabled()
  })

  it('末页数据早于回执到达时，完成同步后才结束底部 loading', async () => {
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    act(() => {
      const current = sessions.get('session-1')!
      current.availableSkills = { ...current.availableSkills, page: 2, has_more: false }
      store.setState({ availableSkillsUpdate: 1 })
    })
    expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
    expect(screen.getByRole('list').closest('.ant-spin-container')).not.toHaveClass('ant-spin-blur')
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(screen.getByRole('status')).toHaveTextContent('YakitEmpty.noMoreData')
  })

  it('刷新使用列表遮罩，分页发送被拒绝时不展示底部 loading', async () => {
    onSend.mockReturnValueOnce(false)
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    await act(async () => vi.advanceTimersByTimeAsync(100))
    expect(screen.getByRole('list').closest('.ant-spin-container')).toHaveClass('ant-spin-blur')
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).toHaveClass('ant-btn-loading')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('已加载分组的刷新回执不结束未加载分组的分页 loading', async () => {
    const result = render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    result.rerender(<AISkillLoadingPane loadState="loaded" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).toHaveClass('ant-btn-loading')
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toHaveClass('ant-btn-loading')
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toHaveClass('ant-btn-loading')
    expect(onSend).toHaveBeenCalledTimes(2)
  })

  it('切换到已加载分组时不展示未加载分组的分页 loading', () => {
    const result = render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
    result.rerender(<AISkillLoadingPane loadState="loaded" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('list').closest('.ant-spin-container')).not.toHaveClass('ant-spin-blur')
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
  })

  it('分页完成后还有数据时隐藏底部 loading，不自动请求下一页', async () => {
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    act(() => {
      const current = sessions.get('session-1')!
      current.availableSkills = { ...current.availableSkills, page: 2 }
      store.setState({ availableSkillsUpdate: 1 })
      acknowledge(onSend.mock.lastCall![0].params.SyncID)
    })
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('分页期间切换会话新建页面，不沿用旧 loading 或阻止新会话刷新', async () => {
    const result = render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(screen.getByRole('status')).toHaveTextContent('YakitSpin.loadMore')
    result.unmount()
    sessions.set('session-2', structuredClone(sessions.get('session-1')!))
    act(() => store.setState({ sessionId: 'session-2', inViewport: true }))
    render(<AISkillLoadingPane loadState="metadata" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.lastCall![0].token).toBe('session-2')
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: '',
    })
  })

  it('未加载分组直接使用后端结果，保留模糊搜索命中项与返回顺序', () => {
    const current = sessions.get('session-1')!
    current.availableSkills = {
      ...current.availableSkills,
      skills: [createSkill('z-scan', 'metadata', 9), createSkill('a-security', 'metadata', 1)],
      has_more: false,
    }
    const result = render(<AISkillLoadingPane loadState="loaded" />)
    fireEvent.click(screen.getByRole('button', { name: 'AISkillLoadingPane.sortByTokens' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'security scan' } })
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(names()).toEqual(['z-scan', 'a-security'])
    expect(current.availableSkills.skills.map((skill) => skill.name)).toEqual(['z-scan', 'a-security'])
  })

  it.each(['scan', '  scan  ', ''])('未加载技能请求携带去除首尾空白后的 query %j', (keyword) => {
    const result = render(<AISkillLoadingPane loadState="loaded" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: keyword } })
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    if (!onSend.mock.calls.length) {
      fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    }
    const { params } = onSend.mock.lastCall![0]
    expect(params.SyncType).toBe('skill_available_sync')
    expect(JSON.parse(params.SyncJsonInput)).toMatchObject({ query: keyword.trim() })
    expect(JSON.parse(params.SyncJsonInput)).not.toHaveProperty('keyword')
  })

  it('没有正式会话时，显示面板、刷新和触底均不发起查询', () => {
    sessions.set('', sessions.get('session-1')!)
    store.setState({ sessionId: '', inViewport: true })
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).not.toHaveBeenCalled()
  })

  it('切换会话后不补发旧会话 loading 期间的触底请求', async () => {
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    const syncId = onSend.mock.lastCall![0].params.SyncID
    act(() => virtuosoList.mock.lastCall![0].endReached())
    sessions.set('session-2', structuredClone(sessions.get('session-1')!))
    act(() => {
      store.setState({ sessionId: 'session-2' })
      acknowledge(syncId)
    })
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.lastCall![0].token).toBe('session-2')
  })

  it('搜索和分页不改变后端总数，切换分组读取各自 total', () => {
    const onTotalChange = vi.fn()
    const result = render(<AISkillLoadingPane loadState="metadata" onTotalChange={onTotalChange} />)
    expect(onTotalChange).toHaveBeenLastCalledWith(132)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } })
    expect(names()).toEqual(['available-skill'])
    expect(onTotalChange).toHaveBeenLastCalledWith(132)
    result.rerender(<AISkillLoadingPane loadState="loaded" onTotalChange={onTotalChange} />)
    expect(onTotalChange).toHaveBeenLastCalledWith(2)
  })

  it('滚动只请求下一页未加载技能，同一页和 loading 时不重复请求，末页停止', async () => {
    render(<AISkillLoadingPane loadState="metadata" />)
    act(() => {
      virtuosoList.mock.lastCall![0].endReached()
      virtuosoList.mock.lastCall![0].endReached()
    })
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.lastCall![0]).toMatchObject({
      token: 'session-1',
      params: {
        SyncType: 'skill_available_sync',
        SyncJsonInput: JSON.stringify({ page: 2, page_size: DEFAULT_SKILL_PAGE_SIZE, query: '' }),
      },
    })
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => {
      sessions.get('session-1')!.availableSkills.page = 2
      store.setState({ loadedSkillsUpdate: 1, availableSkillsUpdate: 1 })
    })
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.lastCall![0].params.SyncJsonInput).toBe(
      JSON.stringify({ page: 3, page_size: DEFAULT_SKILL_PAGE_SIZE, query: '' }),
    )
    act(() => {
      acknowledge(onSend.mock.lastCall![0].params.SyncID)
      sessions.get('session-1')!.availableSkills = { ...sessions.get('session-1')!.availableSkills, has_more: false }
      store.setState({ loadedSkillsUpdate: 2, availableSkillsUpdate: 2 })
    })
    await act(async () => vi.advanceTimersByTimeAsync(300))
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(2)
  })

  it('已加载列表不分页，切换会话后分页发送到新会话', async () => {
    const result = render(<AISkillLoadingPane loadState="loaded" />)
    expect(virtuosoList.mock.lastCall![0].endReached).toBeUndefined()
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    act(() => virtuosoList.mock.lastCall![0].endReached())
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    sessions.set('session-2', structuredClone(sessions.get('session-1')!))
    act(() => store.setState({ sessionId: 'session-2' }))
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.lastCall![0].token).toBe('session-2')
  })

  it('读取独立的已加载和未加载技能并保留零 Token，不依赖任务', () => {
    const result = render(<AISkillLoadingPane loadState="loaded" />)
    expect(names()).toEqual(['large-skill', 'code-review'])
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(names()).toEqual(['available-skill'])
    expect(screen.getByRole('button', { name: 'YakitButton.add' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /AISkillLoadingPane.sortByTokens/ })).not.toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('已加载分组更新后读取替换后的数据，更新数量但不主动查询', () => {
    const onTotalChange = vi.fn()
    render(<AISkillLoadingPane loadState="loaded" onTotalChange={onTotalChange} />)
    expect(onTotalChange).toHaveBeenLastCalledWith(2)
    act(() => {
      sessions.get('session-1')!.loadedSkills = { skills: [createSkill('new-skill', 'loaded', 456)], total: 1 }
      store.setState({ loadedSkillsUpdate: 1, availableSkillsUpdate: 1 })
    })
    expect(names()).toEqual(['new-skill'])
    expect(screen.getByText('456')).toBeInTheDocument()
    expect(onTotalChange).toHaveBeenLastCalledWith(1)
    act(() => {
      sessions.get('session-1')!.loadedSkills = { skills: [], total: 0 }
      store.setState({ loadedSkillsUpdate: 2, availableSkillsUpdate: 2 })
    })
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(onTotalChange).toHaveBeenLastCalledWith(0)
    expect(onSend).not.toHaveBeenCalled()
  })

  it('搜索、排序、切换加载状态仅更新展示，不发送请求也不修改 rawData', () => {
    const original = structuredClone(sessions.get('session-1')!.loadedSkills.skills)
    const result = render(<AISkillLoadingPane loadState="loaded" />)
    fireEvent.click(screen.getByRole('button', { name: 'AISkillLoadingPane.sortByTokens' }))
    expect(names()).toEqual(['code-review', 'large-skill'])
    const search = screen.getByRole('searchbox', { name: 'AISkillLoadingPane.searchPlaceholder' })
    fireEvent.change(search, { target: { value: ' CODE-REVIEW ' } })
    expect(names()).toEqual(['code-review'])
    fireEvent.change(search, { target: { value: '代码审查' } })
    expect(names()).toEqual(['code-review'])
    fireEvent.change(search, { target: { value: '' } })
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    result.rerender(<AISkillLoadingPane loadState="loaded" />)
    expect(names()).toEqual(['code-review', 'large-skill'])
    expect(sessions.get('session-1')!.loadedSkills.skills).toEqual(original)
    expect(onSend).not.toHaveBeenCalled()
  })

  it.each(['loaded', 'metadata'] as const)('打开 %s 面板和手动刷新只查询当前分组', async (loadState) => {
    store.setState({ inViewport: true })
    render(<AISkillLoadingPane loadState={loadState} />)
    expect(onSend).toHaveBeenCalledTimes(1)
    const syncType = loadState === 'loaded' ? 'skill_loaded_sync' : 'skill_available_sync'
    expect(onSend.mock.lastCall![0].params.SyncType).toBe(syncType)
    if (loadState === 'metadata') {
      expect(onSend.mock.lastCall![0].params.SyncJsonInput).toBe(
        JSON.stringify({ page: 1, page_size: DEFAULT_SKILL_PAGE_SIZE, query: '' }),
      )
    }
    const refresh = screen.getByRole('button', { name: 'YakitButton.refresh' })
    expect(refresh).toBeDisabled()
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    fireEvent.click(refresh)
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.lastCall![0].params.SyncType).toBe(syncType)
  })

  it('同一面板切换分组保留各自 loading，刷新只等待当前分组回执', async () => {
    const result = render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    const availableSyncId = onSend.mock.lastCall![0].params.SyncID
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).toBeDisabled()

    result.rerender(<AISkillLoadingPane loadState="loaded" />)
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    const loadedSyncId = onSend.mock.lastCall![0].params.SyncID
    expect(onSend.mock.lastCall![0].params.SyncType).toBe('skill_loaded_sync')
    act(() => acknowledge(loadedSyncId))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toBeDisabled()

    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).toBeDisabled()
    expect(onSend).toHaveBeenCalledTimes(2)
    act(() => acknowledge(availableSyncId))
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toBeDisabled()
  })

  it('两个面板各自等待自己的回执，刷新和 loading 互不影响', async () => {
    render(
      <>
        <AISkillLoadingPane loadState="loaded" />
        <AISkillLoadingPane loadState="metadata" />
      </>,
    )
    const [loadedRefresh, availableRefresh] = screen.getAllByRole('button', { name: 'YakitButton.refresh' })
    fireEvent.click(loadedRefresh)
    expect(loadedRefresh).toBeDisabled()
    expect(availableRefresh).not.toBeDisabled()
    fireEvent.click(availableRefresh)
    expect(onSend).toHaveBeenCalledTimes(2)
    act(() => acknowledge(onSend.mock.calls[0][0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(loadedRefresh).not.toBeDisabled()
    expect(availableRefresh).toBeDisabled()
    act(() => acknowledge(onSend.mock.calls[1][0].params.SyncID))
    expect(availableRefresh).not.toBeDisabled()
  })

  it('刷新期间记录触底，回执及 loading 结束后自动请求第二页', async () => {
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => {
      sessions.get('session-1')!.availableSkills = { ...sessions.get('session-1')!.availableSkills }
      store.setState({ availableSkillsUpdate: 1 })
      acknowledge(onSend.mock.lastCall![0].params.SyncID)
    })
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.lastCall![0].params.SyncJsonInput).toBe(
      JSON.stringify({ page: 2, page_size: DEFAULT_SKILL_PAGE_SIZE, query: '' }),
    )
  })

  it('从后续页刷新时等待第一页数据，回执提前到达也不使用旧页码翻页', async () => {
    sessions.get('session-1')!.availableSkills.page = 3
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    const syncId = onSend.mock.lastCall![0].params.SyncID
    act(() => virtuosoList.mock.lastCall![0].endReached())
    act(() => acknowledge(syncId))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => {
      sessions.get('session-1')!.availableSkills.page = 1
      store.setState({ availableSkillsUpdate: 1 })
    })
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 2,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: '',
    })
  })

  it('刷新期间输入再清空搜索词，刷新完成后不额外翻页', async () => {
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    const syncId = onSend.mock.lastCall![0].params.SyncID
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'temporary' } })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    act(() => {
      const current = sessions.get('session-1')!
      current.availableSkills = { ...current.availableSkills }
      store.setState({ availableSkillsUpdate: 1 })
      acknowledge(syncId)
    })
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it.each([true, false])('关键词变化从第一页搜索，不受旧分页 has_more=%s 影响', (hasMore) => {
    const current = sessions.get('session-1')!
    current.availableSkills.page = 3
    current.availableSkills.has_more = hasMore
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'last-match' } })
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: 'last-match',
    })
  })

  it('搜索从第一页开始，收到数据后仅在触底时继续分页', async () => {
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'last-match' } })
    expect(names()).toEqual(['available-skill'])
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.lastCall![0].params.SyncJsonInput).toBe(
      JSON.stringify({ page: 1, page_size: DEFAULT_SKILL_PAGE_SIZE, query: 'last-match' }),
    )
    act(() => {
      sessions.get('session-1')!.availableSkills = { ...sessions.get('session-1')!.availableSkills, page: 1 }
      store.setState({ availableSkillsUpdate: 1 })
      acknowledge(onSend.mock.lastCall![0].params.SyncID)
    })
    expect(onSend).toHaveBeenCalledTimes(1)
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.lastCall![0].params.SyncJsonInput).toBe(
      JSON.stringify({ page: 2, page_size: DEFAULT_SKILL_PAGE_SIZE, query: 'last-match' }),
    )
    act(() => {
      sessions.get('session-1')!.availableSkills = {
        skills: [createSkill('last-match', 'metadata')],
        total: 132,
        page: 2,
        page_size: 100,
        has_more: false,
      }
      store.setState({ availableSkillsUpdate: 2 })
      acknowledge(onSend.mock.lastCall![0].params.SyncID)
    })
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(names()).toEqual(['last-match'])
    expect(onSend).toHaveBeenCalledTimes(2)
  })

  it('带搜索词切换可见分组只刷新第一页，收到数据后才继续分页', async () => {
    store.setState({ inViewport: true })
    const result = render(<AISkillLoadingPane loadState="loaded" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } })
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.lastCall![0].params.SyncJsonInput).toBe(
      JSON.stringify({ page: 1, page_size: DEFAULT_SKILL_PAGE_SIZE, query: 'missing' }),
    )
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(2)
    act(() => {
      sessions.get('session-1')!.availableSkills = { ...sessions.get('session-1')!.availableSkills }
      store.setState({ availableSkillsUpdate: 1 })
    })
    expect(onSend).toHaveBeenCalledTimes(2)
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(3)
    expect(onSend.mock.lastCall![0].params.SyncJsonInput).toBe(
      JSON.stringify({ page: 2, page_size: DEFAULT_SKILL_PAGE_SIZE, query: 'missing' }),
    )
  })

  it.each(['other', ''])('切换搜索词为 %j 时从第一页查询，不沿用旧查询末页', async (query) => {
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'scan' } })
    act(() => {
      const current = sessions.get('session-1')!
      current.availableSkills = { ...current.availableSkills, page: 1, has_more: false }
      store.setState({ availableSkillsUpdate: 1 })
      acknowledge(onSend.mock.lastCall![0].params.SyncID)
    })
    await act(async () => vi.advanceTimersByTimeAsync(300))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: query } })
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query,
    })
  })

  it('加载期间关键词连续变化，当前请求完成后从第一页查询最新关键词', async () => {
    render(<AISkillLoadingPane loadState="metadata" />)
    act(() => virtuosoList.mock.lastCall![0].endReached())
    const syncId = onSend.mock.lastCall![0].params.SyncID
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'first-query' } })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'latest-query' } })
    act(() => acknowledge(syncId))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => {
      const current = sessions.get('session-1')!
      current.availableSkills = { ...current.availableSkills, page: 2, has_more: false }
      store.setState({ availableSkillsUpdate: 1 })
    })
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: 'latest-query',
    })
  })

  it('分页发送被拒绝后不进入 loading，可以再次触底请求同一页', () => {
    onSend.mockReturnValueOnce(false)
    render(<AISkillLoadingPane loadState="metadata" />)
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toBeDisabled()
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 2,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: '',
    })
  })

  it.each(['initLoading', 'grpcLoadMoreLoading'] as const)(
    '%s 结束后补发触底分页，不依赖重复的触底事件',
    async (loading) => {
      store.setState({ [loading]: true })
      render(<AISkillLoadingPane loadState="metadata" />)
      const list = screen.getByTestId('skill-virtuoso')
      fireEvent.scroll(list)
      const attempts = onSend.mock.calls.length
      fireEvent.scroll(list)
      expect(onSend).toHaveBeenCalledTimes(attempts)
      act(() => store.setState({ [loading]: false }))
      expect(onSend).toHaveBeenCalledTimes(attempts + 1)
      expect(onSend.mock.results.at(-1)?.value).toBe(true)
      expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
        page: 2,
        page_size: DEFAULT_SKILL_PAGE_SIZE,
        query: '',
      })
      act(() => {
        const current = sessions.get('session-1')!
        current.availableSkills = { ...current.availableSkills, page: 2 }
        store.setState({ availableSkillsUpdate: 1 })
        acknowledge(onSend.mock.lastCall![0].params.SyncID)
      })
      await act(async () => vi.advanceTimersByTimeAsync(300))
      expect(onSend).toHaveBeenCalledTimes(attempts + 1)
    },
  )

  it.each(['initLoading', 'grpcLoadMoreLoading'] as const)(
    '%s 期间刷新被拒绝后保留触底分页，恢复后自动补发',
    (loading) => {
      store.setState({ [loading]: true })
      render(<AISkillLoadingPane loadState="metadata" />)
      const list = screen.getByTestId('skill-virtuoso')
      fireEvent.scroll(list)
      expect(onSend).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
      expect(onSend).toHaveBeenCalledTimes(1)
      expect(onSend.mock.results[0].value).toBe(false)
      expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
        page: 1,
        page_size: DEFAULT_SKILL_PAGE_SIZE,
        query: '',
      })
      fireEvent.scroll(list)
      expect(onSend).toHaveBeenCalledTimes(1)
      act(() => store.setState({ [loading]: false }))
      expect(onSend).toHaveBeenCalledTimes(2)
      expect(onSend.mock.results.at(-1)?.value).toBe(true)
      expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
        page: 2,
        page_size: DEFAULT_SKILL_PAGE_SIZE,
        query: '',
      })
    },
  )

  it('没有触底时刷新被拒绝，历史加载结束不自动请求下一页', () => {
    store.setState({ grpcLoadMoreLoading: true })
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(onSend.mock.results[0].value).toBe(false)
    act(() => store.setState({ grpcLoadMoreLoading: false }))
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('刷新发送成功后清除原有触底分页，收到刷新结果不自动请求下一页', async () => {
    store.setState({ grpcLoadMoreLoading: true })
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    onSend.mockReturnValueOnce(true)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: '',
    })
    act(() => {
      const current = sessions.get('session-1')!
      current.availableSkills = { ...current.availableSkills, skills: [createSkill('refreshed-skill', 'metadata')] }
      store.setState({ grpcLoadMoreLoading: false, availableSkillsUpdate: 1 })
      acknowledge(onSend.mock.lastCall![0].params.SyncID)
    })
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('发送时才进入历史加载并被拒绝，结束后自动重试相同分页', () => {
    onSend.mockImplementationOnce(() => {
      store.setState({ grpcLoadMoreLoading: true })
      return false
    })
    render(<AISkillLoadingPane loadState="metadata" />)
    const list = screen.getByTestId('skill-virtuoso')
    fireEvent.scroll(list)
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toBeDisabled()
    fireEvent.scroll(list)
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => store.setState({ grpcLoadMoreLoading: false }))
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.results.at(-1)?.value).toBe(true)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 2,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: '',
    })
  })

  it.each(['initLoading', 'grpcLoadMoreLoading'] as const)('%s 结束时没有待分页意图则不发请求', (loading) => {
    store.setState({ [loading]: true })
    render(<AISkillLoadingPane loadState="metadata" />)
    act(() => store.setState({ [loading]: false }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('历史加载期间修改关键词，恢复后从第一页搜索最新关键词', () => {
    store.setState({ grpcLoadMoreLoading: true })
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'scan' } })
    onSend.mockClear()
    act(() => store.setState({ grpcLoadMoreLoading: false }))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: 'scan',
    })
  })

  it('历史加载结束前切换会话，不把待分页请求补发到新会话', () => {
    store.setState({ grpcLoadMoreLoading: true })
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    sessions.set('session-2', structuredClone(sessions.get('session-1')!))
    onSend.mockClear()
    act(() => store.setState({ sessionId: 'session-2', grpcLoadMoreLoading: false }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('新搜索发送被拒绝后触底重试仍查询第一页', () => {
    onSend.mockReturnValueOnce(false)
    sessions.get('session-1')!.availableSkills.has_more = false
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'scan' } })
    act(() => virtuosoList.mock.lastCall![0].endReached())
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: 'scan',
    })
  })

  it('发送被拒绝后修改关键词空白仍会重试第一页', () => {
    onSend.mockReturnValueOnce(false)
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'scan' } })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' scan ' } })
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: 'scan',
    })
  })

  it('可见面板切回仍在请求中的分组不重复刷新', () => {
    store.setState({ inViewport: true })
    const result = render(<AISkillLoadingPane loadState="metadata" />)
    expect(onSend).toHaveBeenCalledTimes(1)
    result.rerender(<AISkillLoadingPane loadState="loaded" />)
    expect(onSend).toHaveBeenCalledTimes(2)
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).toBeDisabled()
  })

  it('手动刷新清空当前会话详情缓存，只查询当前列表', () => {
    const current = sessions.get('session-1')!
    current.skillDetails.set('code-review', { name: 'code-review', loaded: true, prompt_content: '旧内容' })
    const otherDetails = new Map(current.skillDetails)
    sessions.set('session-2', { ...current, skillDetails: otherDetails })
    render(<AISkillLoadingPane loadState="loaded" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(current.skillDetails.size).toBe(0)
    expect(otherDetails.size).toBe(1)
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.lastCall![0].params.SyncType).toBe('skill_loaded_sync')
  })

  it.each(['receipt-first', 'data-first'])('添加完成立即刷新第一页，保留搜索且后续分页不漏项：%s', async (order) => {
    const directory = createDirectory(125)
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'scan' } })
    await finishPage(directory, order)
    const list = screen.getByRole('list')
    list.scrollTop = 180
    onSend.mockClear()
    fireEvent.click(screen.getAllByRole('button', { name: 'YakitButton.add' })[9])
    directory.loaded.add('scan-010')
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: 'scan',
    })
    expect(list.scrollTop).toBe(0)
    await finishPage(directory, order)
    expect(names()).toEqual(
      directory
        .available()
        .slice(0, 50)
        .map((skill) => skill.name),
    )
    expect(names()).toContain('scan-051')
    expect(onSend).toHaveBeenCalledTimes(2)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput).page).toBe(2)
    await finishPage(directory, order)
    expect(names()).toEqual(
      directory
        .available()
        .slice(0, 100)
        .map((skill) => skill.name),
    )
    expect(names()).toContain('scan-051')
    expect(names()).not.toContain('scan-010')
    expect(names()).toContain('scan-101')
    expect(new Set(names()).size).toBe(100)
    expect(list.scrollTop).toBe(0)
    expect(screen.getByRole('searchbox')).toHaveValue('scan')
    expect(onSend.mock.calls.slice(1).map(([call]) => JSON.parse(call.params.SyncJsonInput))).toEqual([
      { page: 1, page_size: DEFAULT_SKILL_PAGE_SIZE, query: 'scan' },
      { page: 2, page_size: DEFAULT_SKILL_PAGE_SIZE, query: 'scan' },
    ])
  })

  it.each([
    { order: 'receipt-first', pendingLoadMore: false },
    { order: 'receipt-first', pendingLoadMore: true },
    { order: 'data-first', pendingLoadMore: false },
    { order: 'data-first', pendingLoadMore: true },
  ])(
    '添加后等待在途分页数据和回执再刷新，旧末页不阻止刷新：$order，待分页=$pendingLoadMore',
    async ({ order, pendingLoadMore }) => {
      const directory = createDirectory(100)
      render(<AISkillLoadingPane loadState="metadata" />)
      const list = screen.getByRole('list')
      list.scrollTop = 180
      fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
      const pageSyncId = onSend.mock.lastCall![0].params.SyncID
      fireEvent.click(screen.getAllByRole('button', { name: 'YakitButton.add' })[9])
      directory.loaded.add('scan-010')
      if (pendingLoadMore) act(() => virtuosoList.mock.lastCall![0].endReached())
      act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
      await act(async () => vi.advanceTimersByTimeAsync(300))
      expect(onSend).toHaveBeenCalledTimes(2)
      if (order === 'receipt-first') {
        act(() => acknowledge(pageSyncId))
        await act(async () => vi.advanceTimersByTimeAsync(300))
        expect(onSend).toHaveBeenCalledTimes(2)
        act(() => directory.deliver(2))
      } else {
        act(() => directory.deliver(2))
        expect(onSend).toHaveBeenCalledTimes(2)
        act(() => acknowledge(pageSyncId))
        await act(async () => vi.advanceTimersByTimeAsync(300))
      }
      expect(onSend).toHaveBeenCalledTimes(3)
      expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput).page).toBe(1)
      expect(list.scrollTop).toBe(0)
      await finishPage(directory, order)
      expect(names()).toEqual(
        directory
          .available()
          .slice(0, 50)
          .map((skill) => skill.name),
      )
      expect(onSend).toHaveBeenCalledTimes(3)
      fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
      expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput).page).toBe(2)
      await finishPage(directory, order)
      expect(names()).toEqual(directory.available().map((skill) => skill.name))
      expect(names()).toContain('scan-051')
      expect(names()).not.toContain('scan-010')
      expect(new Set(names()).size).toBe(99)
      expect(list.scrollTop).toBe(0)
      expect(screen.getByRole('status')).toHaveTextContent('YakitEmpty.noMoreData')
      expect(onSend).toHaveBeenCalledTimes(4)
    },
  )

  it('添加后等待旧分页期间修改搜索词，旧请求完成后仅查询新关键词第一页', async () => {
    const directory = createDirectory(125)
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    const pageSyncId = onSend.mock.lastCall![0].params.SyncID
    fireEvent.click(screen.getAllByRole('button', { name: 'YakitButton.add' })[9])
    directory.loaded.add('scan-010')
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'other' } })
    expect(onSend).toHaveBeenCalledTimes(2)
    act(() => directory.deliver(2))
    act(() => acknowledge(pageSyncId))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput)).toEqual({
      page: 1,
      page_size: DEFAULT_SKILL_PAGE_SIZE,
      query: 'other',
    })
    expect(onSend).toHaveBeenCalledTimes(3)
  })

  it('添加后等待旧分页期间切换会话，旧响应不向新会话续发分页', async () => {
    const directory = createDirectory(125)
    render(<AISkillLoadingPane loadState="metadata" />)
    fireEvent.scroll(screen.getByTestId('skill-virtuoso'))
    const pageSyncId = onSend.mock.lastCall![0].params.SyncID
    fireEvent.click(screen.getAllByRole('button', { name: 'YakitButton.add' })[9])
    directory.loaded.add('scan-010')
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    sessions.set('session-2', {
      loadedSkills: { skills: [], total: 0 },
      skillDetails: new Map(),
      availableSkills: {
        skills: [createSkill('new-session-skill', 'metadata')],
        total: 1,
        page: 1,
        page_size: DEFAULT_SKILL_PAGE_SIZE,
        has_more: false,
      },
    })
    act(() => store.setState({ sessionId: 'session-2' }))
    act(() => directory.deliver(2))
    act(() => acknowledge(pageSyncId))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(names()).toEqual(['new-session-skill'])
    expect(screen.getByRole('status')).toHaveTextContent('YakitEmpty.noMoreData')
  })

  it('添加后的自动刷新发送被拒绝时可手动刷新重试', async () => {
    const directory = createDirectory(125)
    render(<AISkillLoadingPane loadState="metadata" />)
    const list = screen.getByRole('list')
    list.scrollTop = 180
    fireEvent.click(screen.getAllByRole('button', { name: 'YakitButton.add' })[9])
    directory.loaded.add('scan-010')
    onSend.mockReturnValueOnce(false)
    act(() => acknowledge(onSend.mock.lastCall![0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.results.at(-1)?.value).toBe(false)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput).page).toBe(1)
    expect(list.scrollTop).toBe(180)
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(onSend).toHaveBeenCalledTimes(3)
    expect(JSON.parse(onSend.mock.lastCall![0].params.SyncJsonInput).page).toBe(1)
    await finishPage(directory, 'data-first')
    expect(names()).toEqual(
      directory
        .available()
        .slice(0, 50)
        .map((skill) => skill.name),
    )
    expect(list.scrollTop).toBe(0)
  })

  it('两个独立更新计数器分别驱动对应分组数据，更新不会触发查询', () => {
    const result = render(<AISkillLoadingPane loadState="loaded" />)
    act(() => {
      const current = sessions.get('session-1')!
      current.availableSkills = { ...current.availableSkills, skills: [createSkill('new-available', 'metadata')] }
      store.setState({ availableSkillsUpdate: 1 })
    })
    expect(names()).toEqual(['large-skill', 'code-review'])
    act(() => {
      sessions.get('session-1')!.loadedSkills = { skills: [createSkill('new-loaded', 'loaded')], total: 1 }
      store.setState({ loadedSkillsUpdate: 1 })
    })
    expect(names()).toEqual(['new-loaded'])
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(names()).toEqual(['new-available'])
    expect(onSend).not.toHaveBeenCalled()
  })
})
