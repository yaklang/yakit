import { describe, expect, it } from 'vitest'
import { newCodingSessionDraft, restoreCodingSession } from '../binding'
import { getAgentMode, isCodingAgent } from '../../agentMode'

describe('agent mode compatibility', () => {
  it('defaults to security and reads historical coding flags', () => {
    expect(getAgentMode()).toBe('security')
    expect(getAgentMode({})).toBe('security')
    expect(getAgentMode({ CodingMode: false })).toBe('security')
    expect(restoreCodingSession({ CodingMode: true }).AgentMode).toBe('coding')
    expect(newCodingSessionDraft({ CodingMode: true }).AgentMode).toBe('coding')
    expect(isCodingAgent({ AgentMode: 'coding', CodingMode: false })).toBe(true)
  })
  it('uses explicit mode before legacy flags and preserves unknown values for server validation', () => {
    expect(getAgentMode({ AgentMode: 'security', CodingMode: true })).toBe('security')
    expect(getAgentMode({ AgentMode: 'future-mode', CodingMode: true })).toBe('future-mode')
    expect(isCodingAgent({ AgentMode: 'future-mode', CodingMode: true })).toBe(false)
  })
})

describe('coding session lifecycle', () => {
  const binding = {
    AgentMode: 'coding',
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
      AgentMode: 'coding',
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
