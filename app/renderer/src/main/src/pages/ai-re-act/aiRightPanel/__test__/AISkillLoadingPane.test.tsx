import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { VirtuosoProps } from 'react-virtuoso'
import type { AIAgentChatData } from '@/pages/ai-agent/type/aiChat'
import type { AISkillListItem } from '../AISkillLoadingPane/aiSkillList/type'
import type * as AISkillLoadingPaneModule from '../AISkillLoadingPane/AISkillLoadingPane'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import { AIInputEventSyncTypeEnum } from '../../hooks/grpcApi'

const store = createStore(() => ({
  sessionId: 'session-1',
  currentChatStatus: { questionID: '', coordinatorId: '' },
  skillsUpdate: 0,
  syncIDUpdate: 0,
  inViewport: false,
}))
const meta = { syncIDMap: new Map<string, boolean>() }
const sessions = new Map<string, Pick<AIAgentChatData, 'skills' | 'skillDetails'>>()
const { virtuosoList, onSend } = vi.hoisted(() => ({ virtuosoList: vi.fn(), onSend: vi.fn() }))

vi.mock('ahooks', async () => ({
  ...(await vi.importActual('ahooks')),
  useInViewport: () => [useStore(store, (state) => state.inViewport)],
}))
vi.mock('react-virtuoso', () => ({
  Virtuoso: (props: VirtuosoProps<AISkillListItem, unknown>) => {
    virtuosoList(props)
    return (
      <div>
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

beforeEach(() => {
  vi.useFakeTimers()
  store.setState({
    sessionId: 'session-1',
    currentChatStatus: { questionID: '', coordinatorId: '' },
    skillsUpdate: 0,
    syncIDUpdate: 0,
    inViewport: false,
  })
  meta.syncIDMap.clear()
  sessions.clear()
  sessions.set('session-1', {
    skillDetails: new Map(),
    skills: [
      createSkill('large-skill', 'loaded', 123),
      createSkill('code-review', 'loaded', 0),
      createSkill('available-skill', 'metadata'),
    ],
  })
  virtuosoList.mockClear()
  onSend.mockReset()
  onSend.mockImplementation(({ params }: { params: { SyncID: string } }) => {
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

describe('AISkillLoadingPane session inventory', () => {
  it('读取 rawData.skills，按 skill_load_state 分组并保留零 Token，不依赖任务', () => {
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

  it('skillsUpdate 变化后读取替换后的数据，更新数量但不主动查询', () => {
    const onTotalChange = vi.fn()
    render(<AISkillLoadingPane loadState="loaded" onTotalChange={onTotalChange} />)
    expect(onTotalChange).toHaveBeenLastCalledWith(2)
    act(() => {
      sessions.get('session-1')!.skills = [createSkill('new-skill', 'loaded', 456)]
      store.setState({ skillsUpdate: 1 })
    })
    expect(names()).toEqual(['new-skill'])
    expect(screen.getByText('456')).toBeInTheDocument()
    expect(onTotalChange).toHaveBeenLastCalledWith(1)
    act(() => {
      sessions.get('session-1')!.skills = []
      store.setState({ skillsUpdate: 2 })
    })
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(onTotalChange).toHaveBeenLastCalledWith(0)
    expect(onSend).not.toHaveBeenCalled()
  })

  it('搜索、排序、切换加载状态仅更新展示，不发送请求也不修改 rawData', () => {
    const original = structuredClone(sessions.get('session-1')!.skills)
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
    expect(sessions.get('session-1')!.skills).toEqual(original)
    expect(onSend).not.toHaveBeenCalled()
  })

  it('打开面板发送一次 inventory，数据和任务变化不追加请求，重新打开再发一次', () => {
    render(<AISkillLoadingPane loadState="loaded" />)
    expect(onSend).not.toHaveBeenCalled()
    act(() => store.setState({ inViewport: true }))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.calls[0][0]).toMatchObject({
      token: 'session-1',
      params: { IsSyncMessage: true, SyncType: 'skill_inventory_sync' },
    })
    act(() =>
      store.setState({
        skillsUpdate: 1,
        currentChatStatus: { questionID: 'task-new', coordinatorId: 'coordinator-new' },
      }),
    )
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => acknowledge(onSend.mock.calls[0][0].params.SyncID))
    act(() => store.setState({ inViewport: false }))
    act(() => store.setState({ inViewport: true }))
    expect(onSend).toHaveBeenCalledTimes(2)
  })

  it('空闲会话首次打开也查询，随后允许用户手动刷新', async () => {
    store.setState({ inViewport: true })
    render(<AISkillLoadingPane loadState="loaded" />)
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => acknowledge(onSend.mock.calls[0][0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.calls[1][0].params.SyncType).toBe(AIInputEventSyncTypeEnum.SYNC_TYPE_SKILL_INVENTORY)
  })

  it('手动刷新清空当前会话的全部技能详情缓存，再查询列表', () => {
    const current = sessions.get('session-1')!
    current.skillDetails.set('code-review', { name: 'code-review', loaded: true, prompt_content: '旧内容' })
    current.skillDetails.set('available-skill', { name: 'available-skill', loaded: false, skill_md: '旧文件' })
    const otherDetails = new Map(current.skillDetails)
    sessions.set('session-2', { skills: [], skillDetails: otherDetails })
    render(<AISkillLoadingPane loadState="loaded" />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.refresh' }))

    expect(current.skillDetails.size).toBe(0)
    expect(otherDetails.size).toBe(2)
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.calls[0][0].params.SyncType).toBe('skill_inventory_sync')
    expect(names()).toEqual(['large-skill', 'code-review'])
  })

  it('添加完成后仅查询一次 inventory，其他同步更新不触发刷新', async () => {
    store.setState({ inViewport: true })
    render(<AISkillLoadingPane loadState="metadata" />)
    onSend.mockClear()
    const add = screen.getByRole('button', { name: 'YakitButton.add' })
    fireEvent.click(add)
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.calls[0][0].params).toMatchObject({
      SyncType: 'load_skill_sync',
      SyncJsonInput: JSON.stringify({ skill_names: ['available-skill'] }),
    })
    expect(add).toBeDisabled()
    act(() => store.setState({ syncIDUpdate: 1 }))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => acknowledge(onSend.mock.calls[0][0].params.SyncID))
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.calls[1][0].params).toMatchObject({
      SyncType: 'skill_inventory_sync',
    })
    act(() => acknowledge(onSend.mock.calls[1][0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(2)
  })

  it('切换会话后通过 skillsUpdate 更新展示，不主动请求', () => {
    sessions.set('session-2', { skills: [createSkill('other-session', 'loaded', 10)], skillDetails: new Map() })
    render(<AISkillLoadingPane loadState="loaded" />)
    act(() => store.setState({ sessionId: 'session-2', skillsUpdate: 1 }))
    expect(names()).toEqual(['other-session'])
    expect(screen.queryByText('code-review')).not.toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('面板隐藏时添加结束不刷新，重新打开后刷新一次', async () => {
    store.setState({ inViewport: true })
    render(<AISkillLoadingPane loadState="metadata" />)
    onSend.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.add' }))
    act(() => store.setState({ inViewport: false }))
    act(() => acknowledge(onSend.mock.calls[0][0].params.SyncID))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => store.setState({ inViewport: true }))
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.calls[1][0].params.SyncType).toBe('skill_inventory_sync')
  })

  it('手动刷新等待 SyncID 回执，不因最短展示时间结束而重复请求', async () => {
    render(<AISkillLoadingPane loadState="loaded" />)
    const refresh = screen.getByRole('button', { name: 'YakitButton.refresh' })
    fireEvent.click(refresh)
    await act(async () => vi.advanceTimersByTimeAsync(1000))
    expect(refresh).toBeDisabled()
    fireEvent.click(refresh)
    expect(onSend).toHaveBeenCalledTimes(1)
    act(() => acknowledge(onSend.mock.calls[0][0].params.SyncID))
    expect(refresh).not.toBeDisabled()
    expect(onSend).toHaveBeenCalledTimes(1)
  })
})
