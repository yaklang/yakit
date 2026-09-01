import userEvent from '@testing-library/user-event'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
// 先注册 electron stub，避免 '../utils' 顶层 window.require('electron') 报错
import '../../../../ai-re-act/hooks/__test__/setupElectron'
import AIScheduledTasksDetail from '../AIScheduledTasksDetail'
import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'

const mockGetAIReActSchedule = vi.fn()

vi.mock('../../utils', () => ({
  grpcGetAIReActSchedule: (...args: unknown[]) => mockGetAIReActSchedule(...args),
  grpcDeleteAIReActSchedule: vi.fn(),
  grpcSetAIReActScheduleEnabled: vi.fn(),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../useContext/useDispatcher', () => ({
  default: () => ({ setSetting: vi.fn(), setActiveChat: vi.fn() }),
}))

const makeSchedule = (overrides: Partial<AIReActSchedule> = {}): AIReActSchedule => ({
  UUID: 'u-1',
  Name: 'old-name',
  Status: 'active',
  TargetMode: 'new_session_per_run',
  Payload: {
    Prompt: 'old-prompt',
    StartParams: {} as AIReActSchedule['Payload']['StartParams'],
  },
  Schedule: { RRule: 'RRULE:FREQ=DAILY;INTERVAL=1', Timezone: 'UTC', StartAt: 0 },
  ...overrides,
})

const makeProps = (initialSchedule: AIReActSchedule) => ({
  uuid: 'u-1',
  initialSchedule,
  onClose: vi.fn(),
  onDataChange: vi.fn(),
})

describe('AIScheduledTasksDetail 数据同步', () => {
  beforeEach(() => {
    mockGetAIReActSchedule.mockReset()
  })

  it('打开详情时按 UUID 拉取最新数据，仅修正自身显示，不回写列表（onDataChange 不被调）', async () => {
    const latest = makeSchedule({ Name: 'latest-name' })
    mockGetAIReActSchedule.mockResolvedValue(latest)
    const onDataChange = vi.fn()
    render(<AIScheduledTasksDetail {...makeProps(makeSchedule())} onDataChange={onDataChange} />)

    await waitFor(() => expect(screen.getByText('latest-name')).toBeInTheDocument())
    expect(onDataChange).not.toHaveBeenCalled()
  })

  it('编辑保存/行内启停后（initialSchedule 刷新）详情同步展示最新数据', async () => {
    // 挂载时按 UUID 拉取无更新，保证数据变化只来自 prop 刷新
    mockGetAIReActSchedule.mockResolvedValue(undefined)
    const { rerender } = render(<AIScheduledTasksDetail {...makeProps(makeSchedule())} />)
    expect(screen.getByText('old-name')).toBeInTheDocument()

    const updated = makeSchedule({
      Name: 'new-name',
      Payload: { ...makeSchedule().Payload, Prompt: 'new-prompt' },
    })
    rerender(<AIScheduledTasksDetail {...makeProps(updated)} />)

    await waitFor(() => {
      expect(screen.getByText('new-name')).toBeInTheDocument()
      expect(screen.getByText('new-prompt')).toBeInTheDocument()
    })
    expect(screen.queryByText('old-name')).not.toBeInTheDocument()
    expect(screen.queryByText('old-prompt')).not.toBeInTheDocument()
  })

  it('仅修改 Prompt 时同步刷新「原始请求」区块显隐', async () => {
    mockGetAIReActSchedule.mockResolvedValue(undefined)
    const sameAsOriginal = makeSchedule({
      OriginalRequest: 'orig-text',
      Payload: { ...makeSchedule().Payload, Prompt: 'orig-text' },
    })
    const { rerender } = render(<AIScheduledTasksDetail {...makeProps(sameAsOriginal)} />)
    // Prompt 与 OriginalRequest 相同 → 区块隐藏
    expect(screen.queryByText('AIScheduledTasks.originalRequest')).not.toBeInTheDocument()

    const editedPrompt = makeSchedule({
      OriginalRequest: 'orig-text',
      Payload: { ...makeSchedule().Payload, Prompt: 'edited-prompt' },
    })
    rerender(<AIScheduledTasksDetail {...makeProps(editedPrompt)} />)

    await waitFor(() => expect(screen.getByText('AIScheduledTasks.originalRequest')).toBeInTheDocument())
    expect(screen.getByText('orig-text')).toBeInTheDocument()
  })

  it('详情内启停后拉取最新数据仅经 onDataChange 上抛，由父组件 prop 回流刷新详情', async () => {
    const { grpcSetAIReActScheduleEnabled } = await import('../../utils')
    mockGetAIReActSchedule.mockResolvedValue(undefined)
    const onDataChange = vi.fn()
    const { rerender } = render(<AIScheduledTasksDetail {...makeProps(makeSchedule())} onDataChange={onDataChange} />)

    // 详情头部动作区第一个按钮为启停（返回按钮在前，但动作区依次为：启停/编辑/运行/删除）
    const pauseButton = screen.getAllByRole('button')[1]
    await userEvent.click(pauseButton)

    await waitFor(() => {
      expect(grpcSetAIReActScheduleEnabled).toHaveBeenCalledWith({ UUID: 'u-1', Enabled: false })
      expect(mockGetAIReActSchedule).toHaveBeenCalledWith({ UUID: 'u-1' }, true)
    })

    // 启停路径只上抛数据；详情自身不直接 setSchedule，刷新经父组件 prop 回流实现
    const latest = makeSchedule({ Name: 'after-toggle-name', Status: 'paused' })
    mockGetAIReActSchedule.mockResolvedValue(latest)
    await userEvent.click(pauseButton)
    await waitFor(() => expect(onDataChange).toHaveBeenCalledWith(latest))
    // 模拟父组件回流新 prop，详情应展示启停后的最新数据
    rerender(<AIScheduledTasksDetail {...makeProps(latest)} onDataChange={onDataChange} />)
    await waitFor(() => expect(screen.getByText('after-toggle-name')).toBeInTheDocument())
  })
})
