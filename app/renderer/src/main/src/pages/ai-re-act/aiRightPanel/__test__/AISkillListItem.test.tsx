import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type { ReactNode } from 'react'
import type { YakitEditorProps } from '@/components/yakitUI/YakitEditor/YakitEditorType'
import type { AIForge } from '@/pages/ai-agent/type/forge'
import { grpcGetAIForge } from '@/pages/ai-agent/grpc'
import { getCodeByPath, getPathJoin } from '@/pages/yakRunner/utils'
import AISkillListItem from '../AISkillLoadingPane/aiSkillList/AISkillListItem/AISkillListItem'
import AISkillDetails from '../AISkillLoadingPane/aiSkillList/AISkillDetails/AISkillDetails'
import type { AIAgentGrpcApi } from '../../hooks/grpcApi'
import type { AIChatSendParams } from '../../hooks/type'
import { createTestRawData, makeGrpcJsonRes, makeHandlerRequest } from '../../hooks/__test__/fixtures'
import { aiTaskDetailDataHandlers } from '../../hooks/grpcStreamHandler/aiTaskDetail'
import { useSkillLoading } from '../AISkillLoadingPane/useSkillLoading'

const rawData = createTestRawData()
const meta = { syncIDMap: new Map<string, boolean>() }
const store = createStore(() => ({ syncIDUpdate: 0 }))
const onSend = vi.fn<(payload: AIChatSendParams) => boolean>()

vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentRawData: () => rawData,
  useCurrentMeta: () => meta,
  useCurrentStore: () => store,
}))
vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend }) }))

vi.mock('@/pages/ai-agent/grpc', () => ({ grpcGetAIForge: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ getCodeByPath: vi.fn(), getPathJoin: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: ({ value, type, readOnly }: Pick<YakitEditorProps, 'value' | 'type' | 'readOnly'>) => (
    <textarea aria-label="skill-content" value={value} data-language={type} readOnly={readOnly} />
  ),
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ spinning, children }: { spinning: boolean; children: ReactNode }) => (
    <div role="status" aria-busy={spinning}>
      {children}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>empty</div> }))

const forge: AIForge = { Id: 1, ForgeName: 'skill', ForgeType: 'skillmd', SkillPath: 'C:\\skills\\skill' }
const createDeferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve
  })
  return { promise, resolve }
}

const renderItem = (source: 'task-details' | 'right-panel' = 'task-details') =>
  render(
    <AISkillListItem
      source={source}
      skill={{ name: 'skill', description: 'description' }}
      loadState="metadata"
      onAdd={vi.fn()}
      addLoading={false}
      addingSkill=""
    />,
  )

const hoverItem = () => fireEvent.mouseEnter(screen.getByRole('listitem').parentElement!)

const receiveDetail = (detail: AIAgentGrpcApi.SkillDetail) => {
  rawData.skillDetails.set(detail.name, detail)
  meta.syncIDMap.delete(onSend.mock.lastCall![0].params.SyncID!)
  store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
}

beforeEach(() => {
  vi.resetAllMocks()
  rawData.skills = []
  rawData.skillDetails.clear()
  meta.syncIDMap.clear()
  store.setState({ syncIDUpdate: 0 })
  onSend.mockImplementation(({ params }) => {
    meta.syncIDMap.set(params.SyncID!, true)
    store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
    return true
  })
  vi.mocked(grpcGetAIForge).mockResolvedValue(forge)
  vi.mocked(getCodeByPath).mockResolvedValue('# Skill\n技能内容')
  vi.mocked(getPathJoin).mockImplementation(async (directory, filename) => {
    const separator = directory.includes('\\') && !directory.includes('/') ? '\\' : '/'
    return `${directory}${directory.endsWith(separator) ? '' : separator}${filename}`
  })
})

describe('AISkillListItem hover details', () => {
  it('任务详情只读，不提供添加或删除操作', () => {
    renderItem()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('右侧 Tab 保留添加按钮，未缓存时悬停发送 skill_detail_sync 并等回执展示内容', async () => {
    renderItem('right-panel')
    expect(screen.getByRole('button', { name: 'YakitButton.add' })).toBeInTheDocument()
    hoverItem()

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1))
    expect(onSend).toHaveBeenCalledWith({
      token: 'session-1',
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: 'skill_detail_sync',
        SyncID: expect.stringMatching(/^skill-detail-/),
        SyncJsonInput: JSON.stringify({ skill_name: 'skill' }),
      },
    })
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    act(() => receiveDetail({ name: 'skill', loaded: true, prompt_content: '当前可见正文' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.getByRole('textbox', { name: 'skill-content' })).toHaveValue('当前可见正文')
    expect(grpcGetAIForge).not.toHaveBeenCalled()
    expect(getPathJoin).not.toHaveBeenCalled()
    expect(getCodeByPath).not.toHaveBeenCalled()
  })

  it('切换到右侧 Tab 后忽略任务详情的迟到结果', async () => {
    const file = createDeferred<string>()
    vi.mocked(getCodeByPath).mockReturnValue(file.promise)
    const { rerender } = render(<AISkillDetails source="task-details" name="skill" />)
    await waitFor(() => expect(getCodeByPath).toHaveBeenCalledTimes(1))

    rerender(<AISkillDetails source="right-panel" name="skill" />)
    await act(async () => file.resolve('task content'))
    act(() => receiveDetail({ name: 'skill', loaded: false }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(grpcGetAIForge).toHaveBeenCalledTimes(1)
  })

  it('查看可加载详情后添加技能，再次悬停会重新查询并展示已加载上下文', async () => {
    const { result } = renderHook(() => useSkillLoading())
    const first = render(
      <AISkillListItem
        source="right-panel"
        skill={{ name: 'skill', description: '', skill_load_state: 'metadata' }}
        loadState="metadata"
        onAdd={result.current.onAddSkill}
      />,
    )
    hoverItem()
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1))
    act(() => receiveDetail({ name: 'skill', loaded: false, skill_md: '# 原始全文' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.getByRole('textbox', { name: 'skill-content' })).toHaveValue('# 原始全文')

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.add' }))
    expect(onSend.mock.lastCall![0].params.SyncType).toBe('load_skill_sync')
    act(() => {
      meta.syncIDMap.delete(onSend.mock.lastCall![0].params.SyncID!)
      store.setState((state) => ({ syncIDUpdate: state.syncIDUpdate + 1 }))
      aiTaskDetailDataHandlers.skill_loaded(
        makeHandlerRequest({
          rawData,
          res: makeGrpcJsonRes(
            'structured',
            {
              skills: [{ name: 'skill', description: '', stage: 'loaded', data: { skill_load_state: 'loaded' } }],
              total: 1,
            },
            { NodeId: 'skill_loaded' },
          ),
        }),
      )
    })
    first.unmount()
    onSend.mockClear()

    render(<AISkillListItem source="right-panel" skill={rawData.skills[0]} loadState="loaded" />)
    hoverItem()
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1))
    expect(onSend.mock.lastCall![0].params.SyncType).toBe('skill_detail_sync')
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    act(() => receiveDetail({ name: 'skill', loaded: true, prompt_content: '当前上下文片段' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.getByRole('textbox', { name: 'skill-content' })).toHaveValue('当前上下文片段')
  })

  it('缓存命中时不请求，重新打开读取 Map 中最新的详情', () => {
    rawData.skillDetails.set('skill', { name: 'skill', loaded: true, prompt_content: '旧内容', skill_md: '完整文件' })
    const first = render(<AISkillDetails source="right-panel" name="skill" />)
    expect(screen.getByRole('textbox', { name: 'skill-content' })).toHaveValue('旧内容')
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false')
    first.unmount()
    rawData.skillDetails.set('skill', { name: 'skill', loaded: true, prompt_content: '新内容' })
    render(<AISkillDetails source="right-panel" name="skill" />)
    expect(screen.getByRole('textbox', { name: 'skill-content' })).toHaveValue('新内容')
    expect(onSend).not.toHaveBeenCalled()
    expect(grpcGetAIForge).not.toHaveBeenCalled()
  })

  it('从右侧 Tab 切到任务详情后，文件加载不等待原来的同步请求', async () => {
    const { rerender } = render(<AISkillDetails source="right-panel" name="skill" />)
    expect(onSend).toHaveBeenCalledTimes(1)
    rerender(<AISkillDetails source="task-details" name="skill" />)
    expect(await screen.findByRole('textbox', { name: 'skill-content' })).toHaveValue('# Skill\n技能内容')
    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(meta.syncIDMap.size).toBe(1)
    act(() => receiveDetail({ name: 'skill', loaded: true, prompt_content: '右侧详情内容' }))
    expect(screen.getByRole('textbox', { name: 'skill-content' })).toHaveValue('# Skill\n技能内容')
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('可加载技能展示 skill_md，不展示文件树或将 url 作为请求入口', () => {
    rawData.skillDetails.set('skill', {
      name: 'skill',
      loaded: false,
      skill_md: '# 原始 SKILL.md',
      file_tree: 'SKILL.md\nreferences/',
      prompt_content: '不展示的上下文',
      url: '/api/ai/skill?skill_name=skill',
    })
    render(<AISkillDetails source="right-panel" name="skill" />)
    expect(screen.getByRole('textbox', { name: 'skill-content' })).toHaveValue('# 原始 SKILL.md')
    expect(screen.queryByText(/references\//)).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('缺少当前状态正文时显示空态，不回退到另一状态的正文', () => {
    rawData.skillDetails.set('skill', { name: 'skill', loaded: true, skill_md: '不属于当前上下文的全文' })
    render(<AISkillDetails source="right-panel" name="skill" />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('empty')).toBeInTheDocument()
  })

  it('请求等待超过最短加载时间后仍维持 loading，回执到达才结束', async () => {
    vi.useFakeTimers()
    try {
      render(<AISkillDetails source="right-panel" name="skill" />)
      await act(async () => vi.advanceTimersByTimeAsync(1000))
      expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
      expect(onSend).toHaveBeenCalledTimes(1)
      act(() => receiveDetail({ name: 'skill', loaded: false, error: 'skill not found' }))
      expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false')
      expect(screen.getByRole('alert')).toHaveTextContent('skill not found')
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    ['/tmp/skills/demo', '/tmp/skills/demo/SKILL.md'],
    ['/tmp/skills/demo/', '/tmp/skills/demo/SKILL.md'],
    ['/', '/SKILL.md'],
    ['C:\\skills\\demo', 'C:\\skills\\demo\\SKILL.md'],
    ['C:\\skills\\demo\\', 'C:\\skills\\demo\\SKILL.md'],
    ['C:\\', 'C:\\SKILL.md'],
    ['C:/skills/demo', 'C:/skills/demo/SKILL.md'],
    ['\\\\server\\share\\demo', '\\\\server\\share\\demo\\SKILL.md'],
    ['\\\\server\\share\\demo\\', '\\\\server\\share\\demo\\SKILL.md'],
    ['/tmp/a\\b', '/tmp/a\\b/SKILL.md'],
  ])('保留引擎目录 %s 的路径语义', async (directory, expectedPath) => {
    vi.mocked(grpcGetAIForge).mockResolvedValue({ ...forge, SkillPath: directory })
    render(<AISkillDetails source="task-details" name="skill" />)

    await waitFor(() => expect(getCodeByPath).toHaveBeenCalledWith(expectedPath))
  })

  it('未悬停时不查询详情', () => {
    renderItem()
    expect(grpcGetAIForge).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('悬停后按名称查询，读取 SKILL.md 期间保持 loading，完成后以只读 Markdown 展示', async () => {
    const query = createDeferred<AIForge>()
    const file = createDeferred<string>()
    vi.mocked(grpcGetAIForge).mockReturnValue(query.promise)
    vi.mocked(getCodeByPath).mockReturnValue(file.promise)
    renderItem()
    hoverItem()

    await waitFor(() =>
      expect(grpcGetAIForge).toHaveBeenCalledWith({ ForgeName: 'skill', InflateSkillPath: true }, true),
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(getCodeByPath).not.toHaveBeenCalled()

    await act(async () => query.resolve(forge))
    await waitFor(() => expect(getCodeByPath).toHaveBeenCalledWith('C:\\skills\\skill\\SKILL.md'))
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')

    await act(async () => file.resolve('# Skill\n技能内容'))
    const editor = await screen.findByRole('textbox', { name: 'skill-content' })
    expect(editor).toHaveValue('# Skill\n技能内容')
    expect(editor).toHaveAttribute('readonly')
    expect(editor).toHaveAttribute('data-language', 'markdown')
    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
  })

  it.each(['query', 'file'])('%s 失败后结束 loading 并显示空状态', async (stage) => {
    if (stage === 'query') vi.mocked(grpcGetAIForge).mockRejectedValue(new Error('query failed'))
    else vi.mocked(getCodeByPath).mockRejectedValue(new Error('file failed'))
    renderItem()
    hoverItem()

    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.getByText('empty')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('缺少技能目录时显示空状态并结束 loading', async () => {
    vi.mocked(grpcGetAIForge).mockResolvedValue({ ...forge, SkillPath: undefined })
    render(<AISkillDetails source="task-details" name="skill" />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.getByText('empty')).toBeInTheDocument()
    expect(getCodeByPath).not.toHaveBeenCalled()
  })

  it('空文件显示空状态', async () => {
    vi.mocked(getCodeByPath).mockResolvedValue('')
    render(<AISkillDetails source="task-details" name="skill" />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('empty')).toBeInTheDocument()
  })

  it('切换技能后忽略旧文件的迟到结果', async () => {
    const oldFile = createDeferred<string>()
    vi.mocked(getCodeByPath).mockReturnValueOnce(oldFile.promise).mockResolvedValue('new skill')
    const { rerender } = render(<AISkillDetails source="task-details" name="old-skill" />)
    await waitFor(() => expect(getCodeByPath).toHaveBeenCalledTimes(1))

    rerender(<AISkillDetails source="task-details" name="new-skill" />)
    expect(await screen.findByRole('textbox', { name: 'skill-content' })).toHaveValue('new skill')
    await act(async () => oldFile.resolve('old skill'))
    expect(screen.getByRole('textbox', { name: 'skill-content' })).toHaveValue('new skill')
  })

  it('关闭悬停弹层后不再读取迟到详情中的文件', async () => {
    const query = createDeferred<AIForge>()
    vi.mocked(grpcGetAIForge).mockReturnValue(query.promise)
    renderItem()
    hoverItem()
    await waitFor(() => expect(grpcGetAIForge).toHaveBeenCalledTimes(1))

    fireEvent.mouseLeave(screen.getByRole('listitem').parentElement!)
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    await act(async () => query.resolve(forge))
    expect(getCodeByPath).not.toHaveBeenCalled()
  })
})
