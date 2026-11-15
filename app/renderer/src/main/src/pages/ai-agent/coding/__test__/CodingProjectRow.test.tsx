import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodingProjectRow } from '../CodingProjectRow'

const mocks = vi.hoisted(() => ({ open: vi.fn(), newChat: vi.fn(), pin: vi.fn(), notify: vi.fn() }))
vi.mock('../api', () => ({ openCodingDirectory: mocks.open }))
vi.mock('../navigation', () => ({ openCodingProject: mocks.newChat }))
vi.mock('../projectPreferences', () => ({ setCodingProjectPinned: mocks.pin }))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string, args?: any) => `${key}${args?.count != null ? ` ${args.count}` : ''}` }),
}))

const workspace = {
  ID: 'project',
  Name: 'Frontend',
  RootPath: '/repo/front',
  RootPaths: ['/repo/front', '/repo/back'],
  IsGit: true,
}
const setup = (overrides = {}) => {
  const props = {
    workspace,
    expanded: true,
    selected: false,
    disabled: false,
    pinned: false,
    sessionCount: 3,
    unreadCount: 1,
    onToggle: vi.fn(),
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    onMarkRead: vi.fn(),
    ...overrides,
  }
  render(<CodingProjectRow {...props} />)
  return props
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.open.mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('project row interactions', () => {
  it('shows delayed hover details and allows editing from the card', async () => {
    const props = setup()
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Frontend' }))
    expect(screen.queryByText('/repo/front')).toBeNull()
    await screen.findByText('/repo/front')
    expect(screen.getByText('/repo/back')).toBeInTheDocument()
    expect(screen.getByText('CodingAgent.projectSessionCount 3 · CodingAgent.projectUnreadCount 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.editProject' }))
    expect(props.onEdit).toHaveBeenCalledOnce()
    expect(props.onToggle).not.toHaveBeenCalled()
  })

  it.each(['button', 'context'])('opens the same actions through %s', async (trigger) => {
    const props = setup()
    if (trigger === 'button') fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.projectActionsFor' }))
    else fireEvent.contextMenu(screen.getByRole('button', { name: 'Frontend' }))
    await screen.findByRole('menuitem', { name: 'CodingAgent.editProject' })
    expect(screen.getByRole('menuitem', { name: 'CodingAgent.pinProject' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'CodingAgent.markProjectRead' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'CodingAgent.removeProject' })).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(5)
    fireEvent.click(screen.getByRole('menuitem', { name: 'CodingAgent.editProject' }))
    expect(props.onEdit).toHaveBeenCalledOnce()
    expect(props.onToggle).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })

  it('pins and unpins without toggling the project', async () => {
    const props = setup({ pinned: true })
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.projectActionsFor' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'CodingAgent.unpinProject' }))
    expect(mocks.pin).toHaveBeenCalledWith(workspace.ID, false)
    expect(props.onToggle).not.toHaveBeenCalled()
  })

  it('opens the selected source folder from the submenu', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.projectActionsFor' }))
    fireEvent.mouseEnter(await screen.findByText('CodingAgent.openProjectDirectory'))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'back' }))
    expect(mocks.open).toHaveBeenCalledWith('/repo/back')
  })

  it.each([
    ['CodingAgent.markProjectRead', 'onMarkRead'],
    ['CodingAgent.removeProject', 'onRemove'],
  ] as const)('dispatches %s', async (label, callback) => {
    const props = setup()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.projectActionsFor' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: label }))
    expect(props[callback]).toHaveBeenCalledOnce()
  })

  it('starts a project chat directly and disables the action when opted out', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.newSessionInProject' }))
    expect(mocks.newChat).toHaveBeenCalledWith(workspace)
    cleanup()
    setup({ disabled: true })
    expect(screen.getByRole('button', { name: 'CodingAgent.newSessionInProject' })).toBeDisabled()
  })

  it('reports an inaccessible source folder', async () => {
    mocks.open.mockRejectedValue(new Error('Missing directory'))
    setup({ workspace: { ...workspace, RootPaths: ['/repo/front'] } })
    fireEvent.click(screen.getByRole('button', { name: 'CodingAgent.projectActionsFor' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'CodingAgent.openProjectDirectory' }))
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('error', 'Error: Missing directory'))
  })
})
