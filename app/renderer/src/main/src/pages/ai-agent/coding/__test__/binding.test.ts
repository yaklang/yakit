import { describe, expect, it } from 'vitest'
import { newCodingSessionDraft, restoreCodingSession } from '../binding'

describe('coding session lifecycle', () => {
  const binding = {
    CodingMode: true,
    CodingWorkspaceID: 'fullstack',
    CodingWorktreeID: 'previous',
    CodingCreateWorktree: true,
    CodingWorktreeBaseRef: 'main',
    CodingWorkingDirectory: '/trees/previous',
    CodingSourceRoots: ['/frontend', '/backend'],
    CodingWorkspaceRoots: ['/trees/previous', '/backend'],
  }
  it('returns new sessions to the same workspace sources without inheriting isolation', () => {
    expect(newCodingSessionDraft(binding)).toMatchObject({
      CodingMode: true,
      CodingWorkspaceID: 'fullstack',
      CodingCreateWorktree: false,
      CodingWorktreeID: '',
      CodingWorktreeBaseRef: '',
      CodingWorkingDirectory: '/frontend',
      CodingWorkspaceRoots: ['/frontend', '/backend'],
    })
  })
  it('restores the bound worktree but never replays a creation request', () => {
    const restored = restoreCodingSession(binding)
    expect(restored).toMatchObject({
      CodingCreateWorktree: false,
      CodingWorktreeBaseRef: '',
      CodingWorktreeID: 'previous',
      CodingWorkspaceRoots: ['/trees/previous', '/backend'],
    })
    restored.CodingWorkspaceRoots[0] = 'changed'
    expect(binding.CodingWorkspaceRoots[0]).toBe('/trees/previous')
  })
})
