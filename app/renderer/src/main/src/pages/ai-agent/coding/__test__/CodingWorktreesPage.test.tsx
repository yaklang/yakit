import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CodingWorktreesPage from '../CodingWorktreesPage'
import { CodingProjects } from '../CodingProjects'
import emiter from '@/utils/eventBus/eventBus'
import { setCodingProjectHidden, setCodingProjectPinned } from '../projectPreferences'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  trees: vi.fn(),
  sessions: vi.fn(),
  details: vi.fn(),
  openDirectory: vi.fn(),
  openChat: vi.fn(),
  openProject: vi.fn(),
  openWorktrees: vi.fn(),
  notify: vi.fn(),
}))
vi.mock('../api', () => ({
  queryCodingWorkspaces: mocks.query,
  listCodingWorktrees: mocks.trees,
  listCodingSessions: mocks.sessions,
  queryCodingSessionDetails: mocks.details,
  openCodingDirectory: mocks.openDirectory,
}))
vi.mock('../navigation', () => ({ openCodingProject: mocks.openProject, openCodingWorktrees: mocks.openWorktrees }))
vi.mock('../../historyChat/HistoryChat', () => ({ openAIAgentChatTab: mocks.openChat }))
vi.mock('../../useContext/useStore', () => ({
  default: () => ({ setting: { CodingWorkspaceID: 'project' }, activeChat: { SessionID: 'live' } }),
}))
vi.mock('../experimentalCodingStore', () => ({ useExperimentalCoding: () => true }))
vi.mock('../CodingWorkspaceCreate', () => ({ CodingWorkspaceCreate: () => null }))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, icon, onClick, disabled, 'aria-label': label }: any) => (
    <button aria-label={label} onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: ({ prefix, allowClear, ...props }: any) => <input {...props} />,
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: ({ options, value, onChange, 'aria-label': label }: any) => (
    <select aria-label={label} value={value || ''} onChange={(event) => onChange(event.target.value || undefined)}>
      <option value="">All</option>
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

const workspace = { ID: 'project', Name: 'Yakit', RootPath: '/source/yakit', RootPaths: ['/source/yakit'], IsGit: true }
const tree = {
  ID: 'tree',
  WorkspaceID: 'project',
  Path: '/trees/yakit',
  Branch: 'refs/heads/feature/workspaces',
  Head: '123456789',
  BaseRef: 'refs/remotes/origin/master',
  State: 'ready',
  BaseCommit: '123456789',
}
const live = { SessionID: 'live', Title: 'Implement workspace sidebar', LastUsedAt: 100 }
const bindings = [
  { SessionID: 'live', WorkspaceID: 'project', WorktreeID: 'tree', SessionDeletedAt: '0' },
  {
    SessionID: 'deleted',
    WorkspaceID: 'project',
    WorktreeID: 'tree',
    SessionDeletedAt: '1700000000',
    SessionTitle: 'Earlier layout',
  },
  { SessionID: 'other-db', WorkspaceID: 'project', WorktreeID: 'tree' },
]
beforeEach(() => {
  vi.clearAllMocks()
  setCodingProjectHidden('project', false)
  setCodingProjectPinned('project', false)
  mocks.query.mockResolvedValue({ Data: [workspace] })
  mocks.trees.mockResolvedValue({ Data: [tree] })
  mocks.sessions.mockResolvedValue({ Data: bindings })
  mocks.details.mockResolvedValue({ Data: [live] })
  mocks.openDirectory.mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('worktree management page', () => {
  it('shows the actual branch, opens linked chats and the worktree directory', async () => {
    render(<CodingWorktreesPage />)
    await screen.findByText('feature/workspaces')
    await waitFor(() => expect(screen.getByRole('button', { name: live.Title })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: live.Title }))
    expect(mocks.openChat).toHaveBeenCalledWith(live)
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.openDirectory' }))
    expect(mocks.openDirectory).toHaveBeenCalledWith('/trees/yakit')
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.newSessionInWorktree' }))
    expect(mocks.openProject).toHaveBeenCalledWith(workspace, tree)
  })
  it('retains explicitly deleted chats without mislabeling missing chats from another database', async () => {
    render(<CodingWorktreesPage />)
    await screen.findByText('Earlier layout')
    expect(screen.getByRole('button', { name: 'Earlier layout' })).toBeDisabled()
    expect(screen.getAllByText('CodingAgent.sessionDeleted')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'other-db' })).toBeDisabled()
    expect(screen.getByText('CodingAgent.sessionUnavailable')).toBeInTheDocument()
    expect(mocks.details).toHaveBeenCalledWith(['live', 'other-db'])
  })
  it('refreshes a visible tree after its chat is deleted and preserves the folder action', async () => {
    render(<CodingWorktreesPage />)
    await screen.findByRole('button', { name: live.Title })
    mocks.sessions.mockResolvedValue({
      Data: [{ ...bindings[0], SessionDeletedAt: 1700000001, SessionTitle: live.Title }],
    })
    mocks.details.mockResolvedValue({ Data: [] })
    act(() => emiter.emit('sessionData', JSON.stringify({ type: 'refresh' })))
    await waitFor(() => expect(screen.getByRole('button', { name: live.Title })).toBeDisabled())
    expect(screen.getByText('CodingAgent.sessionDeleted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CodingAgent.openDirectory' })).not.toBeDisabled()
  })
  it('does not present a failed session lookup as deletion', async () => {
    mocks.sessions.mockResolvedValue({ Data: [bindings[0]] })
    mocks.details.mockRejectedValue(new Error('offline'))
    render(<CodingWorktreesPage />)
    await screen.findByText('Error: offline')
    expect(screen.queryByText('CodingAgent.sessionDeleted')).toBeNull()
    expect(screen.getByRole('button', { name: 'live' })).toBeDisabled()
  })
  it('searches branch and chat titles and disables missing directory actions', async () => {
    mocks.trees.mockResolvedValue({ Data: [{ ...tree, State: 'unavailable' }] })
    render(<CodingWorktreesPage />)
    await screen.findByText('CodingAgent.state_unavailable')
    expect(screen.getByRole('button', { name: 'CodingAgent.openDirectory' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'CodingAgent.newSessionInWorktree' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'no-match' } })
    expect(screen.getByText('CodingAgent.noMatchingWorktrees')).toBeInTheDocument()
  })
  it('reports a folder-open error', async () => {
    mocks.openDirectory.mockRejectedValue(new Error('missing folder'))
    render(<CodingWorktreesPage />)
    await screen.findByText('feature/workspaces')
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.openDirectory' }))
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('error', 'Error: missing folder'))
  })
})

describe('project sidebar', () => {
  it('groups active chats below projects and opens a new project chat', async () => {
    render(<CodingProjects />)
    await screen.findByRole('button', { name: live.Title })
    expect(screen.queryByText('Earlier layout')).toBeNull()
    expect(mocks.trees).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: live.Title }))
    expect(mocks.openChat).toHaveBeenCalledWith(live)
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.newSessionInProject' }))
    expect(mocks.openProject).toHaveBeenCalledWith(workspace)
    fireEvent.click(screen.getByRole('button', { name: 'Yakit' }))
    expect(screen.queryByRole('button', { name: live.Title })).toBeNull()
  })
  it('filters project groups by chat title', async () => {
    const { rerender } = render(<CodingProjects search="sidebar" />)
    await screen.findByRole('button', { name: live.Title })
    rerender(<CodingProjects search="missing" />)
    expect(screen.queryByRole('button', { name: 'Yakit' })).toBeNull()
  })
})

describe('project list management', () => {
  it('pins a project ahead of others', async () => {
    mocks.query.mockResolvedValue({ Data: [{ ...workspace, ID: 'second', Name: 'Second' }, workspace] })
    render(<CodingProjects />)
    await screen.findByRole('button', { name: 'Yakit' })
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Yakit' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'CodingAgent.pinProject' }))
    const names = screen
      .getAllByRole('button')
      .filter((button) => ['Second', 'Yakit'].includes(button.textContent || ''))
    expect(names.map((button) => button.textContent)).toEqual(['Yakit', 'Second'])
  })

  it('removes a project after confirmation and restores its chat group', async () => {
    render(<CodingProjects />)
    await screen.findByRole('button', { name: live.Title })
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Yakit' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'CodingAgent.removeProject' }))
    fireEvent.click(await screen.findByRole('button', { name: 'CodingAgent.removeProject' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Yakit' })).toBeNull())
    expect(screen.queryByRole('button', { name: live.Title })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.restoreProject' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Yakit' }))
    expect(await screen.findByRole('button', { name: live.Title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yakit' })).toBeInTheDocument()
  })
})
