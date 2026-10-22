import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { YakitEditorProps } from '@/components/yakitUI/YakitEditor/YakitEditorType'
import type { AIForge } from '@/pages/ai-agent/type/forge'
import { grpcGetAIForge } from '@/pages/ai-agent/grpc'
import { getCodeByPath } from '@/pages/yakRunner/utils'
import AISkillListItem from '../AISkillLoadingPane/aiSkillList/AISkillListItem/AISkillListItem'
import AISkillDetails from '../AISkillLoadingPane/aiSkillList/AISkillDetails/AISkillDetails'

vi.mock('@/pages/ai-agent/grpc', () => ({ grpcGetAIForge: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ getCodeByPath: vi.fn() }))
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

const renderItem = () =>
  render(
    <AISkillListItem
      skill={{ name: 'skill', description: 'description' }}
      loadState="metadata"
      onAdd={vi.fn()}
      addLoading={false}
      addingSkill=""
    />,
  )

const hoverItem = () => fireEvent.mouseEnter(screen.getByRole('listitem').parentElement!)

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(grpcGetAIForge).mockResolvedValue(forge)
  vi.mocked(getCodeByPath).mockResolvedValue('# Skill\n技能内容')
})

describe('AISkillListItem hover details', () => {
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
    render(<AISkillDetails name="skill" />)

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

    await waitFor(() => expect(grpcGetAIForge).toHaveBeenCalledWith({ ForgeName: 'skill', InflateSkillPath: true }))
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
    render(<AISkillDetails name="skill" />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.getByText('empty')).toBeInTheDocument()
    expect(getCodeByPath).not.toHaveBeenCalled()
  })

  it('空文件显示空状态', async () => {
    vi.mocked(getCodeByPath).mockResolvedValue('')
    render(<AISkillDetails name="skill" />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('empty')).toBeInTheDocument()
  })

  it('切换技能后忽略旧文件的迟到结果', async () => {
    const oldFile = createDeferred<string>()
    vi.mocked(getCodeByPath).mockReturnValueOnce(oldFile.promise).mockResolvedValue('new skill')
    const { rerender } = render(<AISkillDetails name="old-skill" />)
    await waitFor(() => expect(getCodeByPath).toHaveBeenCalledTimes(1))

    rerender(<AISkillDetails name="new-skill" />)
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
