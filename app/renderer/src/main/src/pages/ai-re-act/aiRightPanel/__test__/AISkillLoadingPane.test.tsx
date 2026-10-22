import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { PlanItemDetailsData } from '../../hooks/aiRender'
import type { VirtuosoProps } from 'react-virtuoso'
import type { AISkillListItem } from '../AISkillLoadingPane/aiSkillList/type'
import type * as AISkillLoadingPaneModule from '../AISkillLoadingPane/AISkillLoadingPane'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import { AIInputEventSyncTypeEnum } from '../../hooks/grpcApi'

const store = createStore(() => ({
  currentChatStatus: { questionID: 'task-1', coordinatorId: '' },
  revision: 0,
  syncIDUpdate: 0,
  inViewport: false,
}))
vi.mock('ahooks', async () => ({
  ...(await vi.importActual('ahooks')),
  useInViewport: () => [useStore(store, (state) => state.inViewport)],
}))
const meta = { syncIDMap: new Map<string, boolean>() }
const details = new Map<string, Pick<PlanItemDetailsData, 'skills'> & { uuid?: string }>()
const { virtuosoList, onSend } = vi.hoisted(() => ({ virtuosoList: vi.fn(), onSend: vi.fn() }))
vi.mock('react-virtuoso', () => ({
  Virtuoso: (props: VirtuosoProps<AISkillListItem, unknown>) => {
    virtuosoList(props)
    return (
      <div role="list">
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
  useCurrentRawData: () => ({ taskDetailsMap: details }),
}))
vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend }) }))
vi.mock('../../hooks/useCurrentTaskData/useCurrentTaskData', () => ({
  default: function useMockCurrentTaskData(taskId: string) {
    useStore(store, (state) => state.revision)
    return details.get(taskId)
  },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

const { AISkillLoadingPane } = await compileReactModule<typeof AISkillLoadingPaneModule>(
  import.meta.url,
  '../AISkillLoadingPane/AISkillLoadingPane.tsx',
)

describe('AISkillLoadingPane', () => {
  beforeEach(() => {
    store.setState({
      currentChatStatus: { questionID: 'task-1', coordinatorId: '' },
      revision: 0,
      syncIDUpdate: 0,
      inViewport: false,
    })
    meta.syncIDMap.clear()
    onSend.mockReset()
    onSend.mockImplementation(({ params }: { params: { SyncID?: string } }) => {
      if (params.SyncID) {
        meta.syncIDMap.set(params.SyncID, true)
        store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
      }
      return Promise.resolve()
    })
    details.clear()
    virtuosoList.mockClear()
    details.set('task-1', {
      skills: {
        fixed: [
          {
            name: 'fixed-loaded',
            verbose_name: '固定技能',
            description: '已注入上下文',
            category: 'skill',
            skill_load_state: 'loaded',
            token_count: 123,
          },
          { name: 'unknown', verbose_name: '', description: '', category: 'skill' },
        ],
        dynamic: [
          {
            name: 'code-review',
            description: '审查代码',
            category: 'skill',
            skill_load_state: 'loaded',
            token_count: 0,
          },
          { name: 'available-skill', description: '安全检测', category: 'skill', skill_load_state: 'metadata' },
          { name: 'empty-state', description: '', category: 'skill', skill_load_state: '' },
        ],
      },
    })
  })

  it('默认展示固定和动态中已加载的 Skill，保留 0 Token，未知状态不混入列表', () => {
    render(<AISkillLoadingPane loadState="loaded" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('fixed-loaded')).toBeInTheDocument()
    expect(screen.getByText('code-review')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByText('available-skill')).not.toBeInTheDocument()
    expect(screen.queryByText('unknown')).not.toBeInTheDocument()
    expect(screen.queryByText('empty-state')).not.toBeInTheDocument()
  })

  it('切换到可加载隐藏排序按钮，切回已加载保留原排序', () => {
    const result = render(<AISkillLoadingPane loadState="loaded" />)
    fireEvent.click(screen.getByRole('button', { name: 'AISkillLoadingPane.sortByTokens' }))
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(screen.queryByRole('button', { name: /AISkillLoadingPane\.sortByTokens/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('available-skill')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'YakitButton.add' })).toBeInTheDocument()
    expect(screen.queryByText('code-review')).not.toBeInTheDocument()
    result.rerender(<AISkillLoadingPane loadState="loaded" />)
    expect(screen.getByRole('button', { name: 'AISkillLoadingPane.sortByTokensAscending' })).toBeInTheDocument()
    expect(virtuosoList.mock.lastCall![0].data.map((skill: { name: string }) => skill.name)).toEqual([
      'code-review',
      'fixed-loaded',
    ])
  })

  it('添加技能显示 loading，等待对应 SyncID 回执后仅刷新一次', async () => {
    vi.useFakeTimers()
    try {
      details.get('task-1')!.skills.dynamic[1].token_count = 456
      store.setState({ currentChatStatus: { questionID: 'task-1', coordinatorId: 'coordinator-1' }, inViewport: true })
      render(<AISkillLoadingPane loadState="metadata" />)
      onSend.mockClear()
      expect(screen.queryByRole('button', { name: /AISkillLoadingPane\.sortByTokens/ })).not.toBeInTheDocument()
      expect(screen.queryByText('456')).not.toBeInTheDocument()
      const add = screen.getByRole('button', { name: 'YakitButton.add' })
      expect(onSend).not.toHaveBeenCalled()
      fireEvent.click(add)
      expect(add).toBeDisabled()
      expect(add).toHaveClass('ant-btn-loading')
      fireEvent.click(add)
      expect(onSend).toHaveBeenCalledTimes(1)
      expect(onSend).toHaveBeenNthCalledWith(1, {
        token: 'session-1',
        type: '',
        params: {
          IsSyncMessage: true,
          SyncType: 'load_skill_sync',
          SyncID: expect.stringMatching(/^skill-load-.+/),
          SyncJsonInput: JSON.stringify({ skill_names: ['available-skill'] }),
        },
      })
      const firstSyncId = onSend.mock.calls[0][0].params.SyncID
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      expect(onSend).toHaveBeenCalledTimes(1)
      expect(add).toBeDisabled()
      act(() => store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 })))
      expect(onSend).toHaveBeenCalledTimes(1)
      act(() => {
        meta.syncIDMap.delete(firstSyncId)
        store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
      })
      expect(add).not.toBeDisabled()
      expect(add).not.toHaveClass('ant-btn-loading')
      expect(onSend).toHaveBeenNthCalledWith(2, {
        token: 'session-1',
        type: '',
        params: {
          IsSyncMessage: true,
          SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TASK_SNAPSHOT,
          SyncID: expect.any(String),
          SyncJsonInput: JSON.stringify({ task_id: 'task-1' }),
        },
      })
      const refresh = screen.getByRole('button', { name: 'YakitButton.refresh' })
      expect(refresh).toBeDisabled()
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      expect(onSend).toHaveBeenCalledTimes(2)
      fireEvent.click(add)
      expect(onSend).toHaveBeenCalledTimes(3)
      expect(onSend.mock.calls[2][0].params.SyncType).toBe('load_skill_sync')
      expect(onSend.mock.calls[2][0].params.SyncID).not.toBe(firstSyncId)
    } finally {
      cleanup()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('加载技能快速回执时，最短 loading 结束后才刷新，其他添加按钮保持禁用', async () => {
    vi.useFakeTimers()
    try {
      details.get('task-1')!.skills.dynamic.push({
        name: 'another-skill',
        description: '',
        category: 'skill',
        skill_load_state: 'metadata',
      })
      store.setState({ inViewport: true })
      render(<AISkillLoadingPane loadState="metadata" />)
      onSend.mockClear()
      const [add, anotherAdd] = screen.getAllByRole('button', { name: 'YakitButton.add' })
      fireEvent.click(add)
      expect(add).toHaveClass('ant-btn-loading')
      expect(anotherAdd).not.toHaveClass('ant-btn-loading')
      expect(anotherAdd).toBeDisabled()
      fireEvent.click(anotherAdd)
      expect(onSend).toHaveBeenCalledTimes(1)
      act(() => {
        meta.syncIDMap.delete(onSend.mock.calls[0][0].params.SyncID)
        store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
      })
      await act(async () => vi.advanceTimersByTimeAsync(299))
      expect(add).toBeDisabled()
      expect(onSend).toHaveBeenCalledTimes(1)
      await act(async () => vi.advanceTimersByTimeAsync(1))
      expect(add).not.toBeDisabled()
      expect(anotherAdd).not.toBeDisabled()
      expect(onSend).toHaveBeenCalledTimes(2)
      expect(onSend.mock.calls[1][0].params.SyncType).toBe(AIInputEventSyncTypeEnum.SYNC_TYPE_TASK_SNAPSHOT)
      expect(onSend.mock.calls[1][0].params.SyncJsonInput).toBe(JSON.stringify({ task_id: 'task-1' }))
    } finally {
      cleanup()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('按名称和描述搜索，忽略大小写和首尾空白，清空后恢复列表', () => {
    render(<AISkillLoadingPane loadState="loaded" />)
    const search = screen.getByRole('searchbox', { name: 'AISkillLoadingPane.searchPlaceholder' })
    fireEvent.change(search, { target: { value: ' CODE-REVIEW ' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('code-review')).toBeInTheDocument()
    fireEvent.change(search, { target: { value: '已注入上下文' } })
    expect(screen.getByText('fixed-loaded')).toBeInTheDocument()
    fireEvent.change(search, { target: { value: '不存在' } })
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: '' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('技能数量随分类、搜索和快照更新，空列表上报 0', () => {
    const onTotalChange = vi.fn()
    const result = render(<AISkillLoadingPane loadState="loaded" onTotalChange={onTotalChange} />)
    expect(onTotalChange).toHaveBeenLastCalledWith(2)
    result.rerender(<AISkillLoadingPane loadState="metadata" onTotalChange={onTotalChange} />)
    expect(onTotalChange).toHaveBeenLastCalledWith(1)
    const search = screen.getByRole('searchbox', { name: 'AISkillLoadingPane.searchPlaceholder' })
    fireEvent.change(search, { target: { value: '不存在' } })
    expect(onTotalChange).toHaveBeenLastCalledWith(0)
    fireEvent.change(search, { target: { value: '' } })
    expect(onTotalChange).toHaveBeenLastCalledWith(1)
    act(() => {
      details.get('task-1')!.skills.dynamic.push({
        name: 'new-skill',
        description: '',
        category: 'skill',
        skill_load_state: 'metadata',
      })
      details.get('task-1')!.uuid = 'new-snapshot'
      store.setState({ revision: 1 })
    })
    expect(onTotalChange).toHaveBeenLastCalledWith(2)
  })

  it('同名技能按后端提供的加载状态分别展示', () => {
    details.get('task-1')!.skills.fixed.push({
      name: 'code-review',
      verbose_name: '',
      description: '注册信息',
      category: 'skill',
      skill_load_state: 'metadata',
    })
    const result = render(<AISkillLoadingPane loadState="loaded" />)
    expect(screen.getAllByText('code-review')).toHaveLength(1)
    expect(within(screen.getByText('code-review').closest('[role="listitem"]')!).getByText('0')).toBeInTheDocument()
    result.rerender(<AISkillLoadingPane loadState="metadata" />)
    expect(screen.getByText('code-review')).toBeInTheDocument()
    expect(screen.getByText('注册信息')).toBeInTheDocument()
  })

  it('随当前任务切换数据，空任务展示空列表', () => {
    details.set('task-2', {
      skills: {
        fixed: [],
        dynamic: [{ name: 'other-task', description: '', category: 'skill', skill_load_state: 'loaded' }],
      },
    })
    render(<AISkillLoadingPane loadState="loaded" />)
    act(() => store.setState({ currentChatStatus: { questionID: 'task-2', coordinatorId: '' } }))
    expect(screen.getByText('other-task')).toBeInTheDocument()
    expect(screen.queryByText('code-review')).not.toBeInTheDocument()
    act(() => store.setState({ currentChatStatus: { questionID: '', coordinatorId: '' } }))
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('任务规划后仍读取当前 questionID 的技能，开始下个自由对话后读取新任务', () => {
    details.get('task-1')!.uuid = 'react-snapshot'
    render(<AISkillLoadingPane loadState="loaded" />)
    expect(screen.getByText('code-review')).toBeInTheDocument()

    act(() => {
      details.set('task-1', {
        uuid: 'plan-snapshot',
        skills: {
          fixed: [],
          dynamic: [{ name: 'plan-skill', description: '', category: 'skill', skill_load_state: 'loaded' }],
        },
      })
      store.setState({ currentChatStatus: { questionID: 'task-1', coordinatorId: 'coordinator-1' }, revision: 1 })
    })
    expect(screen.getByText('plan-skill')).toBeInTheDocument()
    expect(screen.queryByText('code-review')).not.toBeInTheDocument()

    act(() => {
      details.set('task-2', {
        uuid: 'next-question',
        skills: {
          fixed: [],
          dynamic: [{ name: 'next-skill', description: '', category: 'skill', skill_load_state: 'loaded' }],
        },
      })
      store.setState({ currentChatStatus: { questionID: 'task-2', coordinatorId: '' }, revision: 2 })
    })
    expect(screen.getByText('next-skill')).toBeInTheDocument()
    expect(screen.queryByText('plan-skill')).not.toBeInTheDocument()
  })

  it('固定技能状态缺失时，同名动态 metadata 技能仍可加载', () => {
    details.get('task-1')!.skills.fixed.push({
      name: 'available-skill',
      verbose_name: '',
      description: '旧注册信息',
      category: 'skill',
    })
    render(<AISkillLoadingPane loadState="metadata" />)
    expect(screen.getByText('available-skill')).toBeInTheDocument()
    expect(screen.getByText('安全检测')).toBeInTheDocument()
  })

  it('使用不定高虚拟列表，并在同任务快照行数不变时更新内容', () => {
    render(<AISkillLoadingPane loadState="loaded" />)
    const initial = virtuosoList.mock.lastCall![0]
    expect(initial.fixedItemHeight).toBeUndefined()
    expect(initial.computeItemKey(0, initial.data[0])).toBe(initial.data[0].name)
    const task = details.get('task-1')!
    task.uuid = 'updated'
    task.skills.dynamic[0] = { ...task.skills.dynamic[0], token_count: 456, description: '更新描述' }
    act(() => store.setState({ revision: 1 }))
    expect(screen.getByText('456')).toBeInTheDocument()
    expect(screen.getByText('更新描述')).toBeInTheDocument()
    expect(virtuosoList.mock.lastCall![0].data).not.toBe(initial.data)
  })

  it('进入视口刷新一次，持续可见的重渲染不重复请求，重新进入后再次刷新', async () => {
    vi.useFakeTimers()
    try {
      render(<AISkillLoadingPane loadState="loaded" />)
      expect(onSend).not.toHaveBeenCalled()
      act(() => store.setState({ inViewport: true }))
      expect(onSend).toHaveBeenCalledTimes(1)

      act(() => store.setState({ revision: 1 }))
      fireEvent.change(screen.getByRole('searchbox', { name: 'AISkillLoadingPane.searchPlaceholder' }), {
        target: { value: 'code' },
      })
      expect(onSend).toHaveBeenCalledTimes(1)
      act(() => {
        meta.syncIDMap.delete(onSend.mock.calls[0][0].params.SyncID)
        store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
      })
      await act(async () => vi.advanceTimersByTimeAsync(350))
      expect(onSend).toHaveBeenCalledTimes(1)

      act(() => store.setState({ inViewport: false }))
      expect(onSend).toHaveBeenCalledTimes(1)
      act(() => store.setState({ inViewport: true }))
      expect(onSend).toHaveBeenCalledTimes(2)
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })

  it('首次渲染已在视口内时自动刷新', () => {
    vi.useFakeTimers()
    try {
      store.setState({ inViewport: true })
      render(<AISkillLoadingPane loadState="loaded" />)
      expect(onSend).toHaveBeenCalledTimes(1)
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })

  it('可见时切换任务会请求新任务的 task_snapshot_sync', () => {
    vi.useFakeTimers()
    try {
      store.setState({ inViewport: true })
      render(<AISkillLoadingPane loadState="loaded" />)
      expect(onSend.mock.calls[0][0].params).toMatchObject({
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TASK_SNAPSHOT,
        SyncJsonInput: JSON.stringify({ task_id: 'task-1' }),
      })

      act(() => store.setState({ currentChatStatus: { questionID: 'task-2', coordinatorId: '' } }))
      expect(onSend).toHaveBeenCalledTimes(2)
      expect(onSend.mock.calls[1][0].params).toMatchObject({
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TASK_SNAPSHOT,
        SyncJsonInput: JSON.stringify({ task_id: 'task-2' }),
      })
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })

  it('没有当前任务时不发送快照刷新', () => {
    store.setState({ inViewport: true, currentChatStatus: { questionID: '', coordinatorId: '' } })
    render(<AISkillLoadingPane loadState="loaded" />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('刷新等待匹配的快照回执，超过最短展示时间仍保持禁用且不会重复发送', async () => {
    vi.useFakeTimers()
    try {
      render(<AISkillLoadingPane loadState="loaded" />)
      const refresh = screen.getByRole('button', { name: 'YakitButton.refresh' })
      fireEvent.click(refresh)
      await act(async () => vi.advanceTimersByTimeAsync(350))
      expect(onSend).toHaveBeenCalledTimes(1)
      expect(onSend).toHaveBeenCalledWith({
        token: 'session-1',
        type: '',
        params: {
          IsSyncMessage: true,
          SyncType: 'task_snapshot_sync',
          SyncID: expect.stringMatching(/^.{8}$/),
          SyncJsonInput: JSON.stringify({ task_id: 'task-1' }),
        },
      })
      expect(refresh).toBeDisabled()
      expect(refresh).toHaveClass('ant-btn-loading')
      fireEvent.click(refresh)
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      expect(refresh).toBeDisabled()
      expect(onSend).toHaveBeenCalledTimes(1)

      act(() => {
        meta.syncIDMap.delete('unrelated-sync-id')
        store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
      })
      expect(refresh).toBeDisabled()

      act(() => {
        meta.syncIDMap.delete(onSend.mock.calls[0][0].params.SyncID)
        store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
      })
      expect(refresh).not.toBeDisabled()
      expect(refresh).not.toHaveClass('ant-btn-loading')
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })

  it('发送未登记同步请求时，刷新在最短展示时间后恢复', async () => {
    vi.useFakeTimers()
    onSend.mockResolvedValue(undefined)
    try {
      render(<AISkillLoadingPane loadState="loaded" />)
      const refresh = screen.getByRole('button', { name: 'YakitButton.refresh' })
      fireEvent.click(refresh)
      expect(refresh).toBeDisabled()
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      expect(onSend).toHaveBeenCalledTimes(1)
      expect(refresh).not.toBeDisabled()
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })

  it('Token 排序按升序、降序、默认循环，搜索保留排序且不修改原始数据', () => {
    const task = details.get('task-1')!
    task.skills.dynamic.push({
      name: 'missing-token',
      description: '排序测试',
      category: 'skill',
      skill_load_state: 'loaded',
    })
    task.skills.dynamic.push({
      name: 'middle-token',
      description: '排序测试',
      category: 'skill',
      skill_load_state: 'loaded',
      token_count: 50,
    })
    const original = structuredClone(task.skills)
    render(<AISkillLoadingPane loadState="loaded" />)
    const names = () => virtuosoList.mock.lastCall![0].data.map((skill: { name: string }) => skill.name)
    const sort = screen.getByRole('button', { name: 'AISkillLoadingPane.sortByTokens' })
    const search = screen.getByRole('searchbox', { name: 'AISkillLoadingPane.searchPlaceholder' })
    expect(names()).toEqual(['fixed-loaded', 'code-review', 'missing-token', 'middle-token'])
    fireEvent.click(sort)
    expect(sort).toHaveAccessibleName('AISkillLoadingPane.sortByTokensAscending')
    expect(names()).toEqual(['code-review', 'missing-token', 'middle-token', 'fixed-loaded'])
    fireEvent.change(search, { target: { value: 'code' } })
    expect(names()).toEqual(['code-review'])
    fireEvent.change(search, { target: { value: '' } })
    expect(names()).toEqual(['code-review', 'missing-token', 'middle-token', 'fixed-loaded'])
    fireEvent.click(sort)
    expect(sort).toHaveAccessibleName('AISkillLoadingPane.sortByTokensDescending')
    expect(names()).toEqual(['fixed-loaded', 'middle-token', 'code-review', 'missing-token'])
    fireEvent.click(sort)
    expect(sort).toHaveAccessibleName('AISkillLoadingPane.sortByTokens')
    expect(names()).toEqual(['fixed-loaded', 'code-review', 'missing-token', 'middle-token'])
    expect(task.skills).toEqual(original)
  })
})
