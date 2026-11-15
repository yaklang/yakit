import { ipcRendererMock } from '@/pages/ai-re-act/hooks/__test__/setupElectron'
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodingAgentControls, CodingSessionControls } from '../CodingAgentControls'
import { setExperimentalCoding } from '../experimentalCodingStore'
import { SystemInfo } from '@/constants/hardware'
import { CodingWorkspaceCreate } from '../CodingWorkspaceCreate'
import emiter from '@/utils/eventBus/eventBus'

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
  update: vi.fn(),
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
  updateCodingWorkspace: mocks.update,
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
  YakitModal: ({ open, children, onOk, onCancel, footerExtra, okButtonProps }: any) =>
    open ? (
      <div>
        {children}
        {footerExtra}
        <button onClick={onCancel}>Cancel workspace</button>
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
  ipcRendererMock.invoke.mockReset().mockResolvedValue(undefined)
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
    const composerKeyDown = vi.fn()
    render(
      <div onKeyDown={composerKeyDown}>
        <CodingSessionControls />
      </div>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Project One' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'CodingAgent.searchProjects' }), {
      target: { value: 'Two' },
    })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'CodingAgent.searchProjects' }), { key: 'Enter' })
    expect(composerKeyDown).not.toHaveBeenCalled()
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
  const dropData = (...paths: string[]) => ({
    dataTransfer: {
      types: ['Files'],
      files: paths.map((path) => Object.assign(new File([], path.split('/').pop() || 'folder'), { path })),
    },
  })

  it.each([
    ['/work/frontend/', 'frontend', ''],
    ['C:\\work\\my.app\\', 'my.app', '   '],
    ['/', '/', ''],
    [`/work/${'项目'.repeat(60)}`, '项目'.repeat(50), ''],
  ])('defaults an empty name to the selected folder %s', async (path, expected, input) => {
    mocks.chooseFolders.mockResolvedValue({ filePaths: [path] })
    mocks.create.mockResolvedValue(one)
    render(<CodingWorkspaceCreate onClose={() => {}} onCreated={() => {}} />)
    fireEvent.change(screen.getByLabelText('CodingAgent.name'), { target: { value: input } })
    expect(screen.getByText('Save workspace')).toBeDisabled()
    fireEvent.click(screen.getByText('CodingAgent.chooseFolder'))
    await screen.findByText(path)
    expect(screen.getByLabelText('CodingAgent.name')).toHaveAttribute('placeholder', expected)
    expect(screen.getByText('Save workspace')).not.toBeDisabled()
    fireEvent.click(screen.getByText('Save workspace'))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expected, [path]))
  })

  it('updates the default name when the primary dropped folder changes', async () => {
    ipcRendererMock.invoke.mockResolvedValue(true)
    mocks.create.mockResolvedValue(one)
    render(<CodingWorkspaceCreate onClose={() => {}} onCreated={() => {}} />)
    fireEvent.drop(screen.getByRole('group', { name: 'CodingAgent.sourceFolder' }), dropData('/frontend', '/backend'))
    await screen.findByText('/frontend')
    const input = screen.getByLabelText('CodingAgent.name')
    expect(input).toHaveAttribute('placeholder', 'frontend')
    fireEvent.click(screen.getByText('CodingAgent.makePrimary'))
    expect(input).toHaveAttribute('placeholder', 'backend')
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.removeDirectory 1' }))
    expect(input).toHaveAttribute('placeholder', 'frontend')
    fireEvent.click(screen.getByText('Save workspace'))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('frontend', ['/frontend']))
  })

  it('accepts dropped folders in order, deduplicates additions and rejects ordinary files', async () => {
    ipcRendererMock.invoke.mockImplementation(async (channel, path) => {
      expect(channel).toBe('fetch-file-is-dir-by-path')
      return ['/front.end', '/backend', '/docs'].includes(path)
    })
    mocks.create.mockResolvedValue(one)
    const parentDrop = vi.fn()
    render(
      <div onDrop={parentDrop}>
        <CodingWorkspaceCreate onClose={() => {}} onCreated={() => {}} />
      </div>,
    )
    fireEvent.change(screen.getByLabelText('CodingAgent.name'), { target: { value: 'Dropped project' } })
    const zone = screen.getByRole('group', { name: 'CodingAgent.sourceFolder' })
    expect(fireEvent.drop(zone, dropData('/front.end', '/backend', '/front.end', '/LICENSE'))).toBe(false)
    await screen.findByText('/front.end')
    expect(screen.getByText('/backend')).toBeInTheDocument()
    expect(screen.queryByText('/LICENSE')).not.toBeInTheDocument()
    expect(screen.getByText('CodingAgent.dropFoldersOnly')).toBeInTheDocument()
    expect(ipcRendererMock.invoke).toHaveBeenCalledTimes(3)
    expect(parentDrop).not.toHaveBeenCalled()

    fireEvent.drop(zone, dropData('/backend', '/docs'))
    await screen.findByText('/docs')
    expect(screen.getAllByText('/backend')).toHaveLength(1)
    expect(screen.queryByText('CodingAgent.dropFoldersOnly')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Save workspace'))
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith('Dropped project', ['/front.end', '/backend', '/docs']),
    )
  })

  it('keeps the drop highlight across child elements and clears it when leaving', () => {
    render(<CodingWorkspaceCreate onClose={() => {}} onCreated={() => {}} />)
    const zone = screen.getByRole('group', { name: 'CodingAgent.sourceFolder' })
    const button = screen.getByText('CodingAgent.chooseFolder')
    fireEvent.dragEnter(zone, dropData('/frontend'))
    expect(screen.getByText('CodingAgent.dropFolders')).toBeInTheDocument()
    fireEvent.dragEnter(button, dropData('/frontend'))
    fireEvent.dragLeave(button)
    expect(screen.getByText('CodingAgent.dropFolders')).toBeInTheDocument()
    fireEvent.dragLeave(zone)
    expect(screen.getByText('CodingAgent.localFolderTip')).toBeInTheDocument()
    fireEvent.dragEnter(zone, { dataTransfer: { types: ['text/plain'], files: [] } })
    expect(screen.queryByText('CodingAgent.dropFolders')).not.toBeInTheDocument()
  })

  it('rejects files without a native path and ignores text drops', async () => {
    render(<CodingWorkspaceCreate onClose={() => {}} onCreated={() => {}} />)
    const zone = screen.getByRole('group', { name: 'CodingAgent.sourceFolder' })
    fireEvent.drop(zone, { dataTransfer: { types: ['text/plain'], files: [] } })
    expect(screen.queryByText('CodingAgent.dropFoldersOnly')).not.toBeInTheDocument()
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [new File([], 'folder')] } })
    await screen.findByText('CodingAgent.dropFoldersOnly')
    expect(ipcRendererMock.invoke).not.toHaveBeenCalled()
    expect(screen.getByText('Save workspace')).toBeDisabled()
  })

  it('blocks creation and additional drops while checking folders', async () => {
    let finishCheck!: (isDirectory: boolean) => void
    ipcRendererMock.invoke.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finishCheck = resolve
        }),
    )
    mocks.chooseFolders.mockResolvedValue({ filePaths: ['/existing'] })
    mocks.create.mockResolvedValue(one)
    render(<CodingWorkspaceCreate onClose={() => {}} onCreated={() => {}} />)
    fireEvent.change(screen.getByLabelText('CodingAgent.name'), { target: { value: 'Pending project' } })
    fireEvent.click(screen.getByText('CodingAgent.chooseFolder'))
    await screen.findByText('/existing')
    const zone = screen.getByRole('group', { name: 'CodingAgent.sourceFolder' })
    fireEvent.drop(zone, dropData('/new'))
    expect(zone).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Save workspace')).toBeDisabled()
    expect(screen.getByText('CodingAgent.addDirectory')).toBeDisabled()
    fireEvent.drop(zone, dropData('/ignored'))
    expect(ipcRendererMock.invoke).toHaveBeenCalledTimes(1)
    await act(async () => finishCheck(true))
    expect(screen.getByText('Save workspace')).not.toBeDisabled()
    fireEvent.click(screen.getByText('Save workspace'))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('Pending project', ['/existing', '/new']))
  })

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

describe('project editing', () => {
  it('loads existing fields, updates ordered directories and preserves the workspace ID', async () => {
    const saved = { ...one, Name: 'Renamed', RootPath: '/back', RootPaths: ['/back', '/docs'] }
    mocks.update.mockResolvedValue(saved)
    mocks.chooseFolders.mockResolvedValue({ filePaths: ['/docs'] })
    const onSaved = vi.fn()
    render(<CodingWorkspaceCreate workspace={one} onClose={() => {}} onCreated={onSaved} />)
    expect(screen.getByLabelText('CodingAgent.name')).toHaveValue('Project One')
    expect(screen.getByText('/front')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('CodingAgent.name'), { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.makePrimary' }))
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.removeDirectory 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.addDirectory' }))
    await screen.findByText('/docs')
    fireEvent.click(screen.getByText('Save workspace'))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('one', 'Renamed', ['/back', '/docs']))
    expect(onSaved).toHaveBeenCalledWith(saved)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(one.RootPaths).toEqual(['/front', '/back'])
  })

  it('discards unsaved edits on cancel and keeps errors available for retry', async () => {
    const onClose = vi.fn()
    const onSaved = vi.fn()
    render(<CodingWorkspaceCreate workspace={one} onClose={onClose} onCreated={onSaved} />)
    fireEvent.change(screen.getByLabelText('CodingAgent.name'), { target: { value: 'Retry name' } })
    fireEvent.click(screen.getByText('Cancel workspace'))
    expect(onClose).toHaveBeenCalledOnce()
    expect(mocks.update).not.toHaveBeenCalled()
    mocks.update.mockRejectedValueOnce(new Error('Engine unavailable')).mockResolvedValueOnce(one)
    fireEvent.click(screen.getByText('Save workspace'))
    await screen.findByText('Error: Engine unavailable')
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByLabelText('CodingAgent.name')).toHaveValue('Retry name')
    fireEvent.click(screen.getByText('Save workspace'))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(one))
  })
})

describe('edited project bindings', () => {
  it('refreshes draft roots after a project edit and clears a stale branch selection', async () => {
    setExperimentalCoding(true)
    mocks.setting = {
      CodingMode: true,
      CodingWorkspaceID: 'one',
      CodingSourceRoots: one.RootPaths,
      CodingCreateWorktree: true,
      CodingWorktreeBaseRef: 'refs/heads/front-only',
    }
    render(<CodingSessionControls />)
    await screen.findByRole('button', { name: 'Project One' })
    expect(mocks.setSetting).not.toHaveBeenCalled()
    mocks.query.mockResolvedValue({
      Data: [{ ...one, Name: 'Edited', RootPath: '/back', RootPaths: ['/back', '/front'] }],
    })
    act(() => emiter.emit('sessionData', JSON.stringify({ type: 'refresh' })))
    await screen.findByRole('button', { name: 'Edited' })
    await waitFor(() => expect(mocks.setSetting).toHaveBeenCalled())
    expect(mocks.setSetting.mock.calls.at(-1)![0](mocks.setting)).toMatchObject({
      CodingSourceRoots: ['/back', '/front'],
      CodingCreateWorktree: false,
      CodingWorktreeBaseRef: '',
    })
  })

  it('preserves source roots for an existing session when the project changes', async () => {
    setExperimentalCoding(true)
    mocks.activeChat = { SessionID: 'started' }
    mocks.setting = {
      CodingMode: true,
      CodingWorkspaceID: 'one',
      CodingSourceRoots: ['/old/root'],
      CodingWorktreeID: 'existing-tree',
    }
    render(<CodingSessionControls />)
    await screen.findByRole('button', { name: 'Project One' })
    expect(screen.getByTitle('/old/root')).toBeInTheDocument()
    mocks.query.mockResolvedValue({
      Data: [{ ...one, Name: 'Edited', RootPath: '/different', RootPaths: ['/different'] }],
    })
    act(() => emiter.emit('sessionData', JSON.stringify({ type: 'refresh' })))
    await screen.findByRole('button', { name: 'Edited' })
    expect(screen.getByTitle('/old/root')).toBeInTheDocument()
    expect(mocks.setSetting).not.toHaveBeenCalled()
  })
})

it('shows the original source directory when starting a chat in an existing worktree', async () => {
  setExperimentalCoding(true)
  mocks.setting = {
    CodingMode: true,
    CodingWorkspaceID: 'one',
    CodingWorktreeID: 'tree',
    CodingSourceRoots: ['/original/root'],
  }
  render(<CodingSessionControls />)
  await screen.findByRole('button', { name: 'Project One' })
  expect(screen.getByTitle('/original/root')).toBeInTheDocument()
  expect(mocks.setSetting).not.toHaveBeenCalled()
})
