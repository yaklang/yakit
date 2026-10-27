import { fireEvent, render as renderComponent, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import { VirtuosoMockContext } from 'react-virtuoso'
import type { AISkillListItem } from '../AISkillLoadingPane/aiSkillList/type'
import type { PlanItemDetailsData } from '@/pages/ai-re-act/hooks/aiRender'
import { AITaskSkillList } from '@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/aiTaskSkillList/AITaskSkillList'
import { AISkillList } from '../AISkillLoadingPane/aiSkillList/AISkillList'

vi.mock('antd', () => ({ Tooltip: ({ children }: { children: ReactNode }) => children }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('../AISkillLoadingPane/aiSkillList/AISkillDetails/AISkillDetails', () => ({ default: () => null }))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({ PlusOutlined: () => null }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>empty</div> }))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/components/yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({
  YakitRadioButtons: ({
    options,
    onChange,
  }: {
    options: { label: string; value: string }[]
    onChange: (event: { target: { value: string } }) => void
  }) =>
    options.map((option) => (
      <button key={option.value} onClick={() => onChange({ target: { value: option.value } })}>
        {option.label}
      </button>
    )),
}))
vi.mock('@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/aiSkillSortButton/AISkillSortButton', () => ({
  AISkillSortButton: () => null,
}))
vi.mock('@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/useSkillLoading', () => ({
  useSkillLoading: () => ({ addLoading: false, addingSkill: '', onAddSkill: vi.fn() }),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend: vi.fn() }) }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      add
    </button>
  ),
}))
const render = (ui: ReactElement) =>
  renderComponent(ui, {
    wrapper: ({ children }) => (
      <VirtuosoMockContext.Provider value={{ viewportHeight: 800, itemHeight: 58 }}>
        {children}
      </VirtuosoMockContext.Provider>
    ),
  })

const createTaskSkills = (count: number): PlanItemDetailsData['skills']['dynamic'] =>
  Array.from({ length: count }, (_, index) => ({
    name: `skill-${index}`,
    description: 'description',
    category: 'skill',
    skill_load_state: 'loaded',
  }))

const createSkills = (count: number): AISkillListItem[] =>
  Array.from({ length: count }, (_, index) => ({
    name: `skill-${index}`,
    description: 'description',
    skill_load_state: 'loaded',
  }))

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
})

afterAll(() => vi.unstubAllGlobals())

const getVirtualList = () => screen.getByRole('list').querySelector('[data-virtuoso-scroller]')

describe('AISkillList', () => {
  it('任务详情中的可加载技能不提供操作按钮', () => {
    const onAdd = vi.fn()
    render(<AISkillList source="task-details" data={createSkills(1)} loadState="metadata" onAdd={onAdd} />)

    expect(screen.getByText('skill-0')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('父容器未提供高度时先渲染首行供尺寸测量', () => {
    renderComponent(
      <AISkillList
        source="right-panel"
        data={createSkills(34)}
        loadState="loaded"
        onAdd={vi.fn()}
        addLoading={false}
        addingSkill=""
      />,
    )

    expect(screen.getByText('skill-0')).toBeInTheDocument()
    expect(screen.getByRole('list').querySelector('[data-viewport-type="window"]')).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveAttribute('tabindex', '0')
  })

  it.each([1, 3, 12])('任务详情通过虚拟列表展示 %i 项技能', (count) => {
    const skills: PlanItemDetailsData['skills'] = {
      fixed: [],
      dynamic: createTaskSkills(count),
    }
    render(<AITaskSkillList taskId="task-1" skills={skills} />)
    expect(getVirtualList()).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(count)
  })

  it('任务详情切换可加载分类并展示空列表', () => {
    const skills: PlanItemDetailsData['skills'] = {
      fixed: [],
      dynamic: [
        ...createTaskSkills(3),
        { name: 'available', description: '', category: 'skill', skill_load_state: 'metadata' },
      ],
    }
    const { rerender } = render(<AITaskSkillList taskId="task-1" skills={skills} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'AISkillLoadingPane.available' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)

    rerender(<AITaskSkillList taskId="task-1" skills={{ fixed: [], dynamic: [] }} />)
    expect(screen.getByText('empty')).toBeInTheDocument()
  })

  it.each([1, 3, 12])('技能列表通过虚拟列表渲染 %i 行', (count) => {
    render(
      <AISkillList
        source="right-panel"
        data={createSkills(count)}
        loadState="loaded"
        onAdd={vi.fn()}
        addLoading={false}
        addingSkill=""
      />,
    )

    expect(getVirtualList()).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(count)
  })

  it('右侧面板默认保留虚拟列表', () => {
    render(
      <AISkillList
        source="right-panel"
        data={createSkills(3)}
        loadState="loaded"
        onAdd={vi.fn()}
        addLoading={false}
        addingSkill=""
      />,
    )

    expect(getVirtualList()).toBeInTheDocument()
  })

  it('大量技能只渲染视口内的行', () => {
    render(
      <AISkillList
        source="right-panel"
        data={createSkills(1000)}
        loadState="loaded"
        onAdd={vi.fn()}
        addLoading={false}
        addingSkill=""
      />,
    )

    expect(screen.getByText('skill-0')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBeLessThan(1000)
    expect(screen.queryByText('skill-999')).not.toBeInTheDocument()
  })

  it('行数不变时更新技能内容和排序', () => {
    const data = createSkills(2)
    const { rerender } = render(
      <AISkillList
        source="right-panel"
        data={data}
        loadState="loaded"
        onAdd={vi.fn()}
        addLoading={false}
        addingSkill=""
      />,
    )

    rerender(
      <AISkillList
        source="right-panel"
        data={[{ ...data[1], description: '更新描述', token_count: 123 }, data[0]]}
        loadState="loaded"
        onAdd={vi.fn()}
        addLoading={false}
        addingSkill=""
      />,
    )

    expect(screen.getByText('更新描述')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((row) => row.querySelector('[title]')?.textContent)).toEqual([
      'skill-1',
      'skill-0',
    ])
  })

  it('切换分类保留虚拟列表、行内加载与空状态', () => {
    const onAdd = vi.fn()
    const { rerender } = render(
      <AISkillList
        source="right-panel"
        data={createSkills(3)}
        loadState="loaded"
        onAdd={onAdd}
        addLoading={false}
        addingSkill=""
      />,
    )

    rerender(
      <AISkillList
        source="right-panel"
        data={createSkills(1)}
        loadState="metadata"
        onAdd={onAdd}
        addLoading={false}
        addingSkill=""
      />,
    )
    expect(getVirtualList()).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    expect(onAdd).toHaveBeenCalledWith('skill-0')

    rerender(
      <AISkillList
        source="right-panel"
        data={[]}
        loadState="metadata"
        onAdd={onAdd}
        addLoading={false}
        addingSkill=""
      />,
    )
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.getByText('empty')).toBeInTheDocument()
  })
})
