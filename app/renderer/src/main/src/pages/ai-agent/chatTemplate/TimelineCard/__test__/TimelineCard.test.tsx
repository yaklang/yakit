import type React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TimelineCard from '../TimelineCard'

const state = vi.hoisted(() => ({ reActTimelines: [] as unknown[], timelinesLoading: false }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => state }))
vi.mock('zustand', () => ({ useStore: (_: unknown, selector: (value: typeof state) => unknown) => selector(state) }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session' }))
vi.mock('@/pages/ai-re-act/hooks/useLoadHistory', () => ({ default: () => ({}) }))
vi.mock('@/pages/ai-re-act/hooks/useVirtuosoAutoScroll', () => ({ default: () => ({}) }))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({ globalSessionEngine: {} }))
vi.mock('@/utils/timeUtil', () => ({ formatTime: () => '' }))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>暂无数据</div> }))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: React.PropsWithChildren) => children,
}))
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, components }: { data: unknown[]; components: { EmptyPlaceholder: React.FC } }) =>
    data.length ? <div>时间线数据</div> : <components.EmptyPlaceholder />,
}))

describe('TimelineCard 空状态', () => {
  it('无数据时显示 YakitEmpty，加载中隐藏，收到数据后展示列表', () => {
    const result = render(<TimelineCard />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    state.timelinesLoading = true
    result.rerender(<TimelineCard />)
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
    state.timelinesLoading = false
    state.reActTimelines = [{}]
    result.rerender(<TimelineCard />)
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
    expect(screen.getByText('时间线数据')).toBeInTheDocument()
    state.reActTimelines = []
  })
})
