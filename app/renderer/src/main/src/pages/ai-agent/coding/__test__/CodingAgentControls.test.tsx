import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodingAgentControls, CodingSessionControls } from '../CodingAgentControls'
import { setExperimentalCoding } from '../experimentalCodingStore'
import { SystemInfo } from '@/constants/hardware'
import { CodingWorkspaceCreate } from '../CodingWorkspaceCreate'

const mocks = vi.hoisted(() => ({
  setting: {} as Record<string, unknown>,
  activeChat: undefined as undefined | { SessionID: string; isDraftSession?: boolean },
  setSetting: vi.fn(),
  setActiveChat: vi.fn(),
  query: vi.fn(),
  branches: vi.fn(),
  list: vi.fn(),
  sessions: vi.fn(),
  details: vi.fn(),
  create: vi.fn(),
  openChat: vi.fn(),
  openWorktrees: vi.fn(),
  chooseFolders: vi.fn(),
}))
vi.mock('../navigation', () => ({ openCodingWorktrees: mocks.openWorktrees }))
vi.mock('@/utils/fileSystemDialog', () => ({ handleOpenFileSystemDialog: mocks.chooseFolders }))
vi.mock('../../useContext/useStore', () => ({
  default: () => ({ setting: mocks.setting, activeChat: mocks.activeChat }),
}))
vi.mock('../../useContext/useDispatcher', () => ({
  default: () => ({ setSetting: mocks.setSetting, setActiveChat: mocks.setActiveChat }),
}))
vi.mock('../../historyChat/HistoryChat', () => ({ openAIAgentChatTab: mocks.openChat }))
vi.mock('../api', () => ({
  queryCodingWorkspaces: mocks.query,
  listCodingBranches: mocks.branches,
  listCodingWorktrees: mocks.list,
  listCodingSessions: mocks.sessions,
  queryCodingSessionDetails: mocks.details,
  createCodingWorkspace: mocks.create,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string, args?: any) => (args?.index ? `${key} ${args.index}` : key) }),
}))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({
  getMainOperatorPageBodyContainerOrBody: () => document.body,
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick, disabled, 'aria-label': label }: any) => (
    <button disabled={disabled} onClick={onClick} aria-label={label}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: ({ prefix, allowClear, wrapperClassName, ...props }: any) => <input {...props} />,
}))
vi.mock('@/components/yakitUI/YakitSwitch/YakitSwitch', () => ({
  YakitSwitch: ({ checked, onChange, ...props }: any) => (
    <input {...props} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  ),
}))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children, content, open, onOpenChange }: any) => (
    <div>
      <div onClick={() => onOpenChange?.(!open)}>{children}</div>
      {open && content}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ open, children, onOk, okButtonProps }: any) =>
    open ? (
      <div>
        {children}
        {onOk && (
          <button onClick={onOk} disabled={okButtonProps?.disabled}>
            Save workspace
          </button>
        )}
      </div>
    ) : null,
}))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ children, menu, dropdown }: any) => (
    <div>
      {children}
      {menu.data.map((item: any) => (
        <button
          key={item.key}
          disabled={dropdown.disabled || item.disabled}
          onClick={() => menu.onClick({ key: item.key })}
        >
          {item.key}
        </button>
      ))}
    </div>
  ),
}))

const one = { ID: 'one', Name: 'Project One', RootPath: '/front', RootPaths: ['/front', '/back'], IsGit: true }
const two = { ID: 'two', Name: 'Project Two', RootPath: '/two', RootPaths: ['/two'], IsGit: true }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.setting = {}
  mocks.activeChat = undefined
  SystemInfo.mode = 'remote'
  setExperimentalCoding(false)
  mocks.query.mockResolvedValue({ Data: [one, two] })
  mocks.branches.mockResolvedValue({
    Data: [
      { Name: 'main', Ref: 'refs/heads/main', Commit: 'abc', Remote: false },
      { Name: 'feature/ui', Ref: 'refs/heads/feature/ui', Commit: 'abc', Remote: false },
      { Name: 'origin/main', Ref: 'refs/remotes/origin/main', Commit: 'abc', Remote: true },
    ],
    CurrentBranch: 'main',
    CurrentCommit: 'abc',
    DefaultRef: 'refs/remotes/origin/main',
    HasLocalChanges: true,
  })
  mocks.list.mockResolvedValue({ Data: [] })
  mocks.sessions.mockResolvedValue({ Data: [] })
  mocks.details.mockResolvedValue({ Data: [] })
})
afterEach(() => {
  cleanup()
  SystemInfo.mode = undefined
})

describe('session environment', () => {
  it.each(['local', 'remote'] as const)('uses local folders even with the %s connection mode', async (mode) => {
    setExperimentalCoding(true)
    SystemInfo.mode = mode
    mocks.setting = { CodingMode: true }
    mocks.chooseFolders.mockResolvedValue({ filePaths: ['/frontend', '/backend'] })
    mocks.create.mockResolvedValue(one)
    render(<CodingSessionControls />)
    expect(screen.getByText('CodingAgent.thisComputer')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.selectWorkspace' }))
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.createWorkspace' }))
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.chooseFolder' }))
    await screen.findByText('/frontend')
    expect(screen.getByText('/backend')).toBeInTheDocument()
    expect(mocks.chooseFolders).toHaveBeenCalledWith({ properties: ['openDirectory', 'multiSelections'] })
    fireEvent.change(screen.getByLabelText('CodingAgent.name'), { target: { value: 'Local project' } })
    fireEvent.click(screen.getByText('Save workspace'))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('Local project', ['/frontend', '/backend']))
  })
  it('keeps canceled folder selection empty and lets the last folder be removed', async () => {
    setExperimentalCoding(true)
    mocks.setting = { CodingMode: true }
    mocks.chooseFolders
      .mockResolvedValueOnce({ canceled: true, filePaths: [] })
      .mockResolvedValueOnce({ canceled: false, filePaths: ['/frontend'] })
    render(<CodingSessionControls />)
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.selectWorkspace' }))
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.createWorkspace' }))
    fireEvent.change(screen.getByLabelText('CodingAgent.name'), { target: { value: 'Local project' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.chooseFolder' })))
    expect(screen.getByText('Save workspace')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.chooseFolder' }))
    await screen.findByText('/frontend')
    expect(screen.getByText('Save workspace')).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.removeDirectory 1' }))
    expect(screen.queryByText('/frontend')).toBeNull()
    expect(screen.getByRole('button', { name: 'CodingAgent.chooseFolder' })).toBeInTheDocument()
    expect(screen.getByText('Save workspace')).toBeDisabled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('searches and selects a project directly without opening worktree management', async () => {
    setExperimentalCoding(true)
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one', CodingWorktreeID: 'old-tree' }
    render(<CodingSessionControls />)
    fireEvent.click(await screen.findByRole('button', { name: 'Project One' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'CodingAgent.searchProjects' }), {
      target: { value: 'Two' },
    })
    expect(screen.queryByRole('menuitemradio', { name: 'Project One' })).toBeNull()
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Project Two' }))
    expect(mocks.setSetting.mock.calls.at(-1)![0](mocks.setting)).toMatchObject({
      CodingWorkspaceID: 'two',
      CodingWorktreeID: '',
      CodingCreateWorktree: false,
      CodingSourceRoots: ['/two'],
    })
    expect(screen.queryByRole('textbox', { name: 'CodingAgent.searchProjects' })).toBeNull()
    expect(mocks.list).not.toHaveBeenCalled()
  })
  it('creates a project from the picker and selects it for the draft', async () => {
    setExperimentalCoding(true)
    mocks.setting = { CodingMode: true }
    mocks.create.mockResolvedValue(one)
    mocks.chooseFolders.mockResolvedValue({ filePaths: ['/front'] })
    render(<CodingSessionControls />)
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.selectWorkspace' }))
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.createWorkspace' }))
    fireEvent.change(screen.getByLabelText('CodingAgent.name'), { target: { value: 'Project One' } })
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.chooseFolder' }))
    await screen.findByText('/front')
    fireEvent.click(screen.getByText('Save workspace'))
    await waitFor(() => expect(mocks.setSetting).toHaveBeenCalled())
    expect(mocks.create).toHaveBeenCalledWith('Project One', ['/front'])
    expect(mocks.setSetting.mock.calls.at(-1)![0]({})).toMatchObject({ CodingWorkspaceID: 'one' })
    expect(screen.queryByLabelText('CodingAgent.name')).toBeNull()
    expect(mocks.list).not.toHaveBeenCalled()
  })
  it('allows a draft with a reserved session ID to choose its mode, project and new worktree', async () => {
    setExperimentalCoding(true)
    mocks.activeChat = { SessionID: 'draft', isDraftSession: true }
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one' }
    render(
      <>
        <CodingAgentControls />
        <CodingSessionControls />
      </>,
    )
    expect(screen.getByRole('button', { name: 'security' })).not.toBeDisabled()
    fireEvent.click(await screen.findByRole('button', { name: 'Project One' }))
    expect(screen.getByRole('menuitemradio', { name: 'Project Two' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.configureEnvironment' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'CodingAgent.newWorktree' })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('checkbox', { name: 'CodingAgent.newWorktree' }))
    expect(mocks.setSetting.mock.calls.at(-1)![0](mocks.setting)).toMatchObject({ CodingCreateWorktree: true })
    expect(mocks.sessions).not.toHaveBeenCalled()
  })
  it('loads the server binding when a reserved draft becomes a started session with the same ID', async () => {
    setExperimentalCoding(true)
    mocks.activeChat = { SessionID: 'draft', isDraftSession: true }
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one' }
    mocks.sessions.mockResolvedValue({
      Data: [
        {
          SessionID: 'draft',
          WorkspaceID: 'one',
          WorktreeID: 'tree-one',
          WorkingDirectory: '/trees/one',
          SourceRoots: ['/front', '/back'],
          WorkspaceRoots: ['/trees/one', '/back'],
        },
      ],
    })
    const { rerender } = render(<CodingSessionControls />)
    await screen.findByRole('button', { name: 'Project One' })
    expect(mocks.sessions).not.toHaveBeenCalled()
    mocks.activeChat = { SessionID: 'draft', isDraftSession: false }
    rerender(<CodingSessionControls />)
    await waitFor(() => expect(mocks.sessions).toHaveBeenCalledWith('one'))
    await waitFor(() => expect(mocks.setSetting).toHaveBeenCalled())
    expect(mocks.setSetting.mock.calls.at(-1)![0](mocks.setting)).toMatchObject({
      CodingWorktreeID: 'tree-one',
      CodingWorkingDirectory: '/trees/one',
    })
  })
  it('keeps project management accessible but prevents rebinding a started session', async () => {
    setExperimentalCoding(true)
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one' }
    mocks.activeChat = { SessionID: 'started' }
    render(<CodingSessionControls />)
    fireEvent.click(await screen.findByRole('button', { name: 'Project One' }))
    expect(screen.getByRole('menuitemradio', { name: 'Project Two' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'CodingAgent.createWorkspace' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'CodingAgent.managedWorktrees' })).not.toBeDisabled()
    expect(screen.queryByRole('button', { name: 'CodingAgent.clearProject' })).toBeNull()
    expect(mocks.setSetting).not.toHaveBeenCalled()
  })
  it('is gated by the experiment and clears all binding fields when switching mode', () => {
    const { container } = render(
      <>
        <CodingAgentControls />
        <CodingSessionControls />
      </>,
    )
    expect(container.textContent).toBe('')
    act(() => setExperimentalCoding(true))
    fireEvent.click(screen.getByText('coding'))
    expect(mocks.setSetting.mock.calls[0][0]({ CodingWorktreeID: 'stale', CodingCreateWorktree: true })).toMatchObject({
      CodingMode: true,
      CodingWorkspaceID: '',
      CodingWorktreeID: '',
      CodingCreateWorktree: false,
    })
  })
  it('configures creation without calling a worktree creation RPC', async () => {
    setExperimentalCoding(true)
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one', CodingWorktreeID: 'previous' }
    render(
      <>
        <CodingAgentControls />
        <CodingSessionControls />
      </>,
    )
    await screen.findByText('Project One')
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.configureEnvironment' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'CodingAgent.newWorktree' })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('checkbox', { name: 'CodingAgent.newWorktree' }))
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toMatchObject({
      CodingCreateWorktree: true,
      CodingWorktreeID: '',
      CodingWorkingDirectory: '',
      CodingSourceRoots: ['/front', '/back'],
    })
    expect(mocks.list).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('disables isolation for a non-Git primary even if a secondary root is Git', async () => {
    setExperimentalCoding(true)
    mocks.query.mockResolvedValue({ Data: [{ ...one, IsGit: false }] })
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one' }
    render(
      <>
        <CodingAgentControls />
        <CodingSessionControls />
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.configureEnvironment' }))
    await screen.findByText('CodingAgent.noGit')
    expect(screen.getByRole('checkbox', { name: 'CodingAgent.newWorktree' })).toBeDisabled()
  })

  it('opens a searchable second panel, selects a real ref, and returns to the environment', async () => {
    setExperimentalCoding(true)
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one', CodingCreateWorktree: true }
    const { rerender } = render(<CodingSessionControls />)
    await screen.findByText('Project One')
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.configureEnvironment' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'CodingAgent.branch origin/main' })).not.toBeDisabled(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.branch origin/main' }))
    expect(screen.queryByRole('checkbox', { name: 'CodingAgent.newWorktree' })).toBeNull()
    expect(screen.getByRole('menuitemradio', { name: 'origin/main' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('CodingAgent.localChangesNotCopied')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'CodingAgent.searchBranches' }), {
      target: { value: 'feature/' },
    })
    expect(screen.queryByRole('menuitemradio', { name: 'origin/main' })).toBeNull()
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'feature/ui' }))
    mocks.setting = mocks.setSetting.mock.calls.at(-1)![0](mocks.setting)
    rerender(<CodingSessionControls />)
    expect(mocks.setting.CodingWorktreeBaseRef).toBe('refs/heads/feature/ui')
    expect(screen.getByRole('button', { name: 'CodingAgent.branch feature/ui' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.branch feature/ui' }))
    expect(screen.getByRole('textbox', { name: 'CodingAgent.searchBranches' })).toHaveValue('')
    expect(screen.getByRole('menuitemradio', { name: 'feature/ui' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.backToEnvironment' }))
    expect(screen.getByRole('checkbox', { name: 'CodingAgent.newWorktree' })).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('displays branch query errors and permits retry', async () => {
    setExperimentalCoding(true)
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one' }
    mocks.branches.mockRejectedValueOnce(new Error('Engine unavailable'))
    render(<CodingSessionControls />)
    await screen.findByText('Project One')
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.configureEnvironment' }))
    await screen.findByText('Error: Engine unavailable')
    expect(screen.getByRole('checkbox', { name: 'CodingAgent.newWorktree' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.retry' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'CodingAgent.newWorktree' })).not.toBeDisabled())
  })
  it('does not show a late branch response from the previous workspace', async () => {
    setExperimentalCoding(true)
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one', CodingCreateWorktree: true }
    let resolve!: (value: any) => void
    mocks.branches.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { rerender } = render(<CodingSessionControls />)
    await screen.findByText('Project One')
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.configureEnvironment' }))
    await waitFor(() => expect(mocks.branches).toHaveBeenCalledWith('one'))
    mocks.setting = { ...mocks.setting, CodingWorkspaceID: 'two' }
    rerender(<CodingSessionControls />)
    await act(async () => resolve({ CurrentBranch: 'stale', CurrentCommit: 'old', DefaultRef: 'stale', Data: [] }))
    expect(screen.queryByText('stale')).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'CodingAgent.newWorktree' })).toBeNull()
  })
  it('keeps history visible after opt-out and hydrates the resolved server binding', async () => {
    mocks.setting = { CodingMode: true, CodingWorkspaceID: 'one', CodingCreateWorktree: true }
    mocks.activeChat = { SessionID: 'history' }
    mocks.sessions.mockResolvedValue({
      Data: [
        {
          SessionID: 'history',
          WorkspaceID: 'one',
          WorktreeID: 'resolved',
          WorkingDirectory: '/actual/app',
          SourceRoots: ['/front', '/back'],
          WorkspaceRoots: ['/actual/app', '/back'],
        },
      ],
    })
    render(
      <>
        <CodingAgentControls />
        <CodingSessionControls />
      </>,
    )
    expect(screen.getByText('security')).toBeDisabled()
    await waitFor(() => expect(mocks.setSetting).toHaveBeenCalled())
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toMatchObject({
      CodingWorktreeID: 'resolved',
      CodingCreateWorktree: false,
      CodingWorkingDirectory: '/actual/app',
      CodingWorkspaceRoots: ['/actual/app', '/back'],
    })
  })
})

describe('project creation', () => {
  it('creates an ordered multi-directory workspace with the selected primary first', async () => {
    mocks.create.mockResolvedValue({ ...one, ID: 'created' })
    mocks.chooseFolders
      .mockResolvedValueOnce({ filePaths: ['/frontend'] })
      .mockResolvedValueOnce({ filePaths: ['/frontend', '/backend'] })
    render(<CodingWorkspaceCreate onClose={() => {}} onCreated={() => {}} />)
    fireEvent.change(screen.getByLabelText('CodingAgent.name'), { target: { value: 'Full stack' } })
    fireEvent.click(screen.getByText('CodingAgent.chooseFolder'))
    await screen.findByText('/frontend')
    fireEvent.click(screen.getByText('CodingAgent.addDirectory'))
    await screen.findByText('/backend')
    fireEvent.click(screen.getByText('CodingAgent.makePrimary'))
    fireEvent.click(screen.getByText('Save workspace'))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('Full stack', ['/backend', '/frontend']))
  })
})
