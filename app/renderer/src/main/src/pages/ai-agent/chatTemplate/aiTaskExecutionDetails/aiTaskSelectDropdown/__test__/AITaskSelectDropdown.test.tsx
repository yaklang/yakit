import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import cloneDeep from 'lodash/cloneDeep'
import type { PlanItemDetailsData } from '@/pages/ai-re-act/hooks/aiRender'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { DefaultPlanItemDetailsData } from '@/pages/ai-re-act/hooks/defaultConstant'
import { AITaskSelectDropdown } from '../AITaskSelectDropdown'

const taskDetailsMap = new Map<string, PlanItemDetailsData>()
const onSend = vi.fn()
const onChange = vi.fn()
const sessionStore = createStore(() => ({
  sessionTaskList: [] as AIAgentGrpcApi.SessionSnapshotTaskSummary[],
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18nRefresh: 0,
  }),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentRawData: () => ({ taskDetailsMap }),
  useCurrentStore: () => sessionStore,
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('../../../../useContext/useDispatcher', () => ({ default: () => ({ onSend }) }))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({
    menu,
    children,
  }: {
    menu: { data?: { key: string; label: string }[]; onClick?: (info: { key: string }) => void }
    children?: ReactNode
  }) => (
    <div data-testid="task-dropdown">
      {children}
      <ul data-testid="task-dropdown-menu">
        {(menu.data || []).map((item) => (
          <li key={item.key}>
            <button type="button" onClick={() => menu.onClick?.({ key: item.key })}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  ),
}))
vi.mock('../AITaskSelectDropdown.module.scss', () => ({
  default: new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : key) }),
}))

const seedMapTask = (taskId: string, taskName: string) => {
  const data = cloneDeep(DefaultPlanItemDetailsData)
  data.taskId = taskId
  data.execution = { ...data.execution, task_name: taskName, status: 'running' }
  taskDetailsMap.set(taskId, data)
}

const twoTasks = [
  {
    task_id: 'task-a',
    task_name: '任务甲',
    attempt: 1,
    status: 'running',
    is_final: false,
    updated_at: 1,
  },
  {
    task_id: 'task-b',
    task_name: '任务乙',
    attempt: 1,
    status: 'done',
    is_final: true,
    updated_at: 2,
  },
] as AIAgentGrpcApi.SessionSnapshotTaskSummary[]

beforeEach(() => {
  taskDetailsMap.clear()
  onSend.mockReset()
  onSend.mockReturnValue(true)
  onChange.mockClear()
  sessionStore.setState({ sessionTaskList: [] }, true)
})

afterEach(() => {
  cleanup()
})

describe('AITaskSelectDropdown', () => {
  it('sessionTaskList 为空时从 taskDetailsMap 兜底，并解析 react- 前缀名', () => {
    seedMapTask('task-a', 'react-hostscan-AbCdEf12')
    seedMapTask('task-b', 'react-portscan-XyZ12345')

    render(<AITaskSelectDropdown taskId="task-a" taskName="父级标题" value="task-a" onChange={onChange} />)

    const menu = screen.getByTestId('task-dropdown-menu')
    // 初始任务优先 props.taskName；其它 map 项走 execution.task_name 并剥 react- 前缀
    expect(within(menu).getByText('父级标题')).toBeInTheDocument()
    expect(within(menu).getByText('portscan')).toBeInTheDocument()
    expect(screen.getByLabelText('AITaskExecutionDetails.selectTask')).toHaveTextContent('父级标题')
  })

  it('点击当前选中项：不触发 onChange / sync', () => {
    sessionStore.setState({ sessionTaskList: twoTasks })
    render(<AITaskSelectDropdown taskId="task-a" taskName="任务甲" value="task-a" onChange={onChange} />)

    fireEvent.click(within(screen.getByTestId('task-dropdown-menu')).getByText('任务甲'))
    expect(onChange).not.toHaveBeenCalled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('点击其他任务：先 sync 成功后再 onChange', () => {
    sessionStore.setState({ sessionTaskList: twoTasks })
    render(<AITaskSelectDropdown taskId="task-a" taskName="任务甲" value="task-a" onChange={onChange} />)

    fireEvent.click(within(screen.getByTestId('task-dropdown-menu')).getByText('任务乙'))

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-1',
        params: expect.objectContaining({
          IsSyncMessage: true,
          SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TASK_SNAPSHOT,
          SyncJsonInput: JSON.stringify({ task_id: 'task-b' }),
        }),
      }),
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('task-b')
  })

  it('onSend 返回 false：不切换选中，再次点击可重试', () => {
    sessionStore.setState({ sessionTaskList: twoTasks })
    onSend.mockReturnValueOnce(false).mockReturnValue(true)
    render(<AITaskSelectDropdown taskId="task-a" taskName="任务甲" value="task-a" onChange={onChange} />)

    const menu = screen.getByTestId('task-dropdown-menu')
    fireEvent.click(within(menu).getByText('任务乙'))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.click(within(menu).getByText('任务乙'))
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('task-b')
  })
})
