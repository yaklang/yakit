import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import { afterEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { openCodingProject, openCodingWorktrees } from '../navigation'

const mocks = vi.hoisted(() => ({ ensure: vi.fn(), update: vi.fn(), openChat: vi.fn() }))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { ensureSession: mocks.ensure, updateSessionConfig: mocks.update },
}))
vi.mock('../../historyChat/HistoryChat', () => ({ openAIAgentChatTab: mocks.openChat }))
vi.mock('../experimentalCodingStore', () => ({ isExperimentalCodingEnabled: () => true }))
afterEach(() => vi.clearAllMocks())

describe('coding navigation', () => {
  it('opens the standalone page through the parameterless menu dispatcher', () => {
    const open = vi.fn()
    emiter.on('menuOpenPage', open)
    try {
      openCodingWorktrees()
      expect(open).toHaveBeenCalledWith(JSON.stringify({ route: YakitRoute.AI_Worktrees }))
    } finally {
      emiter.off('menuOpenPage', open)
    }
  })

  it('carries the workspace binding in the draft route without creating a worktree', () => {
    openCodingProject({ ID: 'workspace', Name: 'App', RootPath: '/front', RootPaths: ['/front', '/back'], IsGit: true })
    const draft = mocks.openChat.mock.calls[0][0]
    expect(draft.isDraftSession).toBe(true)
    expect(draft.StartParams).toMatchObject({
      CodingMode: true,
      CodingWorkspaceID: 'workspace',
      CodingWorkingDirectory: '/front',
      CodingWorkspaceRoots: ['/front', '/back'],
      CodingCreateWorktree: false,
      CodingWorktreeID: '',
    })
    expect(mocks.ensure).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
