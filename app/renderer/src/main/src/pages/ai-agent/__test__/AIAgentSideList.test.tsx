import type React from 'react'
import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import type * as AIAgentSideListModule from '../AIAgentSideList'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { SwitchAIAgentTabEventEnum } from '../defaultConstant'
import type { YakitSideTabProps } from '@/components/yakitSideTab/YakitSideTabType'

const { AIAgentSideList } = await compileReactModule<typeof AIAgentSideListModule>(
  import.meta.url,
  '../AIAgentSideList.tsx',
)

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async () => ''),
  setRemoteValue: vi.fn(),
}))
let autoHidden = true
vi.mock('../store/sideHiddenModeStore', () => ({
  isSideAutoHidden: () => autoHidden,
  useSideHiddenMode: () => autoHidden,
  setSideHiddenMode: vi.fn(),
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
  default: ({
    onClose,
    selected,
    setSelected,
  }: {
    onClose: () => void
    selected?: FileNodeProps
    setSelected: (file: FileNodeProps) => void
  }) => (
    <div>
      文件列表
      <output aria-label="selected-file">{selected?.path}</output>
      <button
        onClick={() =>
          setSelected({ path: '/report.txt', name: 'report.txt', parent: null, isFolder: false, icon: '', depth: 0 })
        }
      >
        选择文件
      </button>
      <button onClick={onClose}>关闭文件系统</button>
    </div>
  ),
}))
vi.mock('../aiMCP/AIMCP', () => ({ default: () => <div>MCP 内容</div> }))
vi.mock('../aiScheduledTasks/AIScheduledTasks', () => ({
  default: ({ visible }: { visible: boolean }) => (
    <div data-testid="scheduled" data-visible={visible}>
      定时任务
    </div>
  ),
}))
vi.mock('../browserInstances/BrowserInstancesPanel', () => ({
  BrowserInstancesPanel: () => <div>浏览器实例</div>,
}))
vi.mock('../historyChat/HistoryChat', () => ({
  default: ({ headerActionsExtra }: { headerActionsExtra?: React.ReactNode }) => (
    <div data-testid="history-chat">
      <header>{headerActionsExtra}</header>
    </div>
  ),
}))

const SideList = () => {
  const [show, setShow] = useState(true)
  return <AIAgentSideList show={show} setShow={setShow} />
}

describe('AIAgentSideList', () => {
  autoHidden = true
  it('当前页签不变时更新选中文件和定时任务的可见状态', async () => {
    render(<SideList />)
    fireEvent.click(screen.getByText('选择文件'))
    expect(screen.getByLabelText('selected-file')).toHaveTextContent('/report.txt')
    fireEvent.click(screen.getByRole('button', { name: 'scheduled' }))
    expect(await screen.findByTestId('scheduled')).toHaveAttribute('data-visible', 'true')
    act(() =>
      emiter.emit(
        'switchAIAgentTab',
        JSON.stringify({ type: SwitchAIAgentTabEventEnum.SET_TAB_SHOW, params: { show: false } }),
      ),
    )
    expect(screen.getByTestId('scheduled')).toHaveAttribute('data-visible', 'false')
  })

  it('默认激活 File 页，按会话、文件系统、浏览器、定时任务、MCP 排列入口', async () => {
    render(<SideList />)
    expect(screen.getByLabelText('active')).toHaveTextContent('file')
    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter(
          (text) =>
            text === 'session' || text === 'file' || text === 'browser' || text === 'scheduled' || text === 'mcp',
        ),
    ).toEqual(['session', 'file', 'browser', 'scheduled', 'mcp'])
    expect(screen.queryByTestId('history-chat')).not.toBeInTheDocument()
    expect(screen.getByText('文件列表')).toBeInTheDocument()
  })

  it('点击 session 打开会话历史，事件可切换激活，关闭按钮收起侧栏', async () => {
    render(<SideList />)
    fireEvent.click(screen.getByRole('button', { name: 'session' }))
    expect(screen.getByLabelText('active')).toHaveTextContent('session')
    expect(screen.getByTestId('history-chat')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('history-chat').querySelector('header')!.lastElementChild!)
    expect(screen.getByLabelText('show')).toHaveTextContent('false')
    act(() => {
      emiter.emit(
        'switchAIAgentTab',
        JSON.stringify({
          type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
          params: { active: 'session', show: true, toggle: true },
        }),
      )
    })
    expect(screen.getByLabelText('active')).toHaveTextContent('session')
    expect(screen.getByLabelText('show')).toHaveTextContent('true')
    expect(screen.getByTestId('history-chat')).toBeInTheDocument()
  })

  it('点击 scheduled/browser/mcp 切换对应内容，file 切换显隐文件系统', async () => {
    render(<SideList />)
    fireEvent.click(screen.getByRole('button', { name: 'scheduled' }))
    expect(await screen.findByText('定时任务')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'browser' }))
    expect(await screen.findByText('浏览器实例')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'mcp' }))
    expect(await screen.findByText('MCP 内容')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'file' }))
    expect(screen.getByLabelText('active')).toHaveTextContent('file')
    expect(screen.getByText('文件列表')).toBeInTheDocument()
    expect(screen.queryByTestId('history-chat')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭文件系统' }))
    expect(screen.getByLabelText('show')).toHaveTextContent('false')
    act(() => {
      emiter.emit(
        'switchAIAgentTab',
        JSON.stringify({ type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE, params: { active: 'file', show: true } }),
      )
    })
    expect(screen.getByLabelText('show')).toHaveTextContent('true')
  })

  it('toggle 同一已展开页则收起，其它页或未展开则打开', async () => {
    render(<SideList />)
    expect(screen.getByLabelText('show')).toHaveTextContent('true')
    expect(screen.getByLabelText('active')).toHaveTextContent('file')
    act(() => {
      emiter.emit(
        'switchAIAgentTab',
        JSON.stringify({
          type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
          params: { active: 'file', show: true, toggle: true },
        }),
      )
    })
    expect(screen.getByLabelText('show')).toHaveTextContent('false')
    expect(screen.getByLabelText('active')).toHaveTextContent('file')
    act(() => {
      emiter.emit(
        'switchAIAgentTab',
        JSON.stringify({
          type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
          params: { active: 'file', show: true, toggle: true },
        }),
      )
    })
    expect(screen.getByLabelText('show')).toHaveTextContent('true')
    act(() => {
      emiter.emit(
        'switchAIAgentTab',
        JSON.stringify({
          type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
          params: { active: 'browser', show: true, toggle: true },
        }),
      )
    })
    expect(screen.getByLabelText('active')).toHaveTextContent('browser')
    expect(screen.getByLabelText('show')).toHaveTextContent('true')
    expect(await screen.findByText('浏览器实例')).toBeInTheDocument()
  })

  it('事件切换和显隐仍有效，卸载后移除监听', async () => {
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
    emit(SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE, { active: 'file' })
    expect(screen.getByLabelText('active')).toHaveTextContent('file')
    expect(screen.queryByTestId('history-chat')).not.toBeInTheDocument()
    result.unmount()
    expect(off).toHaveBeenCalledWith('switchAIAgentTab', expect.any(Function))
    off.mockRestore()
  })

  it('固定后失焦不收起，关闭按钮仍可收起', async () => {
    autoHidden = false
    render(<SideList />)
    act(() => {
      emiter.emit(
        'switchAIAgentTab',
        JSON.stringify({ type: SwitchAIAgentTabEventEnum.SET_TAB_SHOW, params: { show: false } }),
      )
    })
    expect(screen.getByLabelText('show')).toHaveTextContent('true')
    fireEvent.click(screen.getByRole('button', { name: '关闭文件系统' }))
    expect(screen.getByLabelText('show')).toHaveTextContent('false')
    autoHidden = true
  })
})
