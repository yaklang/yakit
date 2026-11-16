import { getAgentMode } from '../agentMode'
import type { AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'
import type { CodingSession, CodingWorkspace, CodingWorktree } from './api'

export const codingBindingKeys = [
  'AgentMode',
  'CodingWorkspaceID',
  'CodingWorkingDirectory',
  'CodingCreateWorktree',
  'CodingWorktreeBaseRef',
  'CodingWorktreeID',
  'CodingWorkspaceRoots',
  'CodingSourceRoots',
] as const

export const emptyCodingBinding = {
  AgentMode: 'security',
  CodingWorkspaceID: '',
  CodingWorkingDirectory: '',
  CodingCreateWorktree: false,
  CodingWorktreeBaseRef: '',
  CodingWorktreeID: '',
  CodingWorkspaceRoots: [] as string[],
  CodingSourceRoots: [] as string[],
}

export const selectCodingWorkspace = (workspace: CodingWorkspace, worktree?: CodingWorktree) => {
  const roots = [...workspace.RootPaths]
  if (worktree) roots[0] = worktree.SourceDirectory
  return {
    ...emptyCodingBinding,
    AgentMode: 'coding',
    CodingWorkspaceID: workspace.ID,
    CodingWorktreeID: worktree?.ID || '',
    CodingWorkingDirectory: worktree?.WorkingDirectory || roots[0],
    CodingSourceRoots: roots,
    CodingWorkspaceRoots: [worktree?.WorkingDirectory || roots[0], ...roots.slice(1)],
  }
}

export const codingSessionBinding = (session: CodingSession) => ({
  ...emptyCodingBinding,
  AgentMode: 'coding',
  CodingWorkspaceID: session.WorkspaceID,
  CodingWorktreeID: session.WorktreeID,
  CodingWorkingDirectory: session.WorkingDirectory,
  CodingSourceRoots: [...session.SourceRoots],
  CodingWorkspaceRoots: [...session.WorkspaceRoots],
})

// A new draft in the same workspace returns to source directories, never inherits
// the previous session's checkout or its one-shot creation request.
export const newCodingSessionDraft = (setting: AIStartParams) => ({
  ...emptyCodingBinding,
  AgentMode: getAgentMode(setting),
  CodingWorkspaceID: setting.CodingWorkspaceID || '',
  CodingWorkingDirectory: setting.CodingSourceRoots?.[0] || '',
  CodingSourceRoots: [...(setting.CodingSourceRoots || [])],
  CodingWorkspaceRoots: [...(setting.CodingSourceRoots || [])],
})

export const restoreCodingSession = (params?: AIStartParams) => ({
  ...emptyCodingBinding,
  AgentMode: getAgentMode(params),
  CodingWorkspaceID: params?.CodingWorkspaceID || '',
  CodingWorkingDirectory: params?.CodingWorkingDirectory || '',
  CodingWorktreeID: params?.CodingWorktreeID || '',
  CodingWorkspaceRoots: [...(params?.CodingWorkspaceRoots || [])],
  CodingSourceRoots: [...(params?.CodingSourceRoots || [])],
})
