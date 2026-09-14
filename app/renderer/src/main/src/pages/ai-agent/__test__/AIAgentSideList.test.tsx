import type React from 'react'
import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { AIAgentSideList } from '../AIAgentSideList'
import { SwitchAIAgentTabEventEnum } from '../defaultConstant'
import type { YakitSideTabProps } from '@/components/yakitSideTab/YakitSideTabType'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/components/yakitSideTab/YakitSideTab', () => ({
  YakitSideTab: ({ yakitTabs, onActiveKey, activeKey, show, children }: React.PropsWithChildren<YakitSideTabProps>) => (
    <div>
      <output aria-label="active">{activeKey}</output>
      <output aria-label="show">{String(show)}</output>
      {yakitTabs.map((tab) => (
        <button key={tab.value} onClick={() => onActiveKey?.(tab.value)}>
          {tab.value}
        </button>
      ))}
      {children}
    </div>
  ),
}))
vi.mock('../aiChatWelcome/FileTreeList/FileTreeList', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div>
      文件列表
      <button onClick={onClose}>关闭文件系统</button>
    </div>
  ),
}))
vi.mock('../aiMCP/AIMCP', () => ({ default: () => <div>MCP 内容</div> }))
vi.mock('../aiScheduledTasks/AIScheduledTasks', () => ({ default: () => <div>定时任务</div> }))

const SideList = () => {
  const [show, setShow] = useState(true)
  return <AIAgentSideList show={show} setShow={setShow} />
}

describe('AIAgentSideList', () => {
  it('隐藏会话标签，保留文件系统内容与定时任务、MCP 入口', async () => {
    render(<SideList />)
    expect(screen.queryByRole('button', { name: 'session' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'scheduled' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'mcp' })).toBeInTheDocument()
    expect(screen.queryByText('会话列表')).not.toBeInTheDocument()
    expect(screen.getByText('文件列表')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'scheduled' }))
    expect(await screen.findByText('定时任务')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'mcp' }))
    expect(await screen.findByText('MCP 内容')).toBeInTheDocument()
    act(() => {
      emiter.emit(
        'switchAIAgentTab',
        JSON.stringify({ type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE, params: { active: 'session', show: true } }),
      )
    })
    expect(screen.getByText('文件列表')).toBeInTheDocument()
    expect(screen.queryByText('会话列表')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭文件系统' }))
    expect(screen.getByLabelText('show')).toHaveTextContent('false')
    act(() => {
      emiter.emit(
        'switchAIAgentTab',
        JSON.stringify({ type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE, params: { active: 'session', show: true } }),
      )
    })
    expect(screen.getByLabelText('show')).toHaveTextContent('true')
  })

  it('事件切换、旧 history 映射和显隐仍有效，卸载后移除监听', async () => {
    const off = vi.spyOn(emiter, 'off')
    const result = render(<SideList />)
    const emit = (type: SwitchAIAgentTabEventEnum, params: object) =>
      act(() => {
        emiter.emit('switchAIAgentTab', JSON.stringify({ type, params }))
      })
    emit(SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE, { active: 'mcp' })
    expect(await screen.findByText('MCP 内容')).toBeInTheDocument()
    expect(screen.getByLabelText('show')).toHaveTextContent('true')
    emit(SwitchAIAgentTabEventEnum.SET_TAB_SHOW, { show: false })
    expect(screen.getByLabelText('show')).toHaveTextContent('false')
    emit(SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE, { active: 'history' })
    expect(screen.getByLabelText('active')).toHaveTextContent('session')
    expect(screen.queryByText('会话列表')).not.toBeInTheDocument()
    result.unmount()
    expect(off).toHaveBeenCalledWith('switchAIAgentTab', expect.any(Function))
    off.mockRestore()
  })
})
