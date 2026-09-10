import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { AIHorizontalScrollCard } from '../AIHorizontalScrollCard'

const store = createStore(() => ({ card: [] as { title: string }[] }))
const { newChat } = vi.hoisted(() => ({ newChat: vi.fn() }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => store }))
vi.mock('../../../useContext/useStore', () => ({ default: () => ({ activeChat: { Title: '当前会话' } }) }))
vi.mock('../../../historyChat/HistoryChat', () => ({ onNewChat: newChat }))
vi.mock('../../AIContextToken/AIContextToken', () => ({ default: () => <div>Token 统计</div> }))
vi.mock('../../AIContextToken/ContextDetailPopover', () => ({ default: () => <button>上下文详情</button> }))
vi.mock('@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard', () => ({
  HorizontalScrollCard: () => <div>执行结果</div>,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))

beforeEach(() => {
  vi.clearAllMocks()
  store.setState({ card: [] })
})

describe('AIHorizontalScrollCard', () => {
  it('头部保留上下文与新建会话入口，不展示任务详情和更多操作', () => {
    render(<AIHorizontalScrollCard />)
    expect(screen.getByText('当前会话')).toBeVisible()
    expect(screen.getByText('Token 统计')).toBeVisible()
    expect(screen.getByRole('button', { name: '上下文详情' })).toBeVisible()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[1])
    expect(newChat).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('执行结果')).not.toBeInTheDocument()
  })

  it('移除操作按钮后，执行结果仍支持展开和收起', () => {
    store.setState({ card: [{ title: '结果' }] })
    render(<AIHorizontalScrollCard />)
    expect(screen.getByText('执行结果')).toBeInTheDocument()
    fireEvent.click(screen.getByText('YakitButton.collapse'))
    expect(screen.getByText('YakitButton.expand')).toBeInTheDocument()
    fireEvent.click(screen.getByText('YakitButton.expand'))
    expect(screen.getByText('YakitButton.collapse')).toBeInTheDocument()
  })
})
