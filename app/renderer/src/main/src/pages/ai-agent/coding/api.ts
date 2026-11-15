import type { AISession } from '../type/aiChat'

export interface CodingWorkspace {
  ID: string
  Name: string
  RootPath: string
  RootPaths: string[]
  IsGit: boolean
}
export interface CodingWorktree {
  ID: string
  WorkspaceID: string
  OwnerSessionID: string
  Path: string
  WorkingDirectory: string
  SourceDirectory: string
  RepositoryRoot: string
  GitCommonDir: string
  BaseRef: string
  BaseCommit: string
  State: 'creating' | 'ready' | 'failed' | 'unavailable'
  LastError: string
  SessionIDs: string[]
  Head: string
  Branch: string
  Detached: boolean
  Locked: boolean
  Prunable: boolean
  Bare: boolean
}
export interface CodingSession {
  SessionID: string
  WorkspaceID: string
  WorktreeID: string
  WorkingDirectory: string
  SourceRoots: string[]
  WorkspaceRoots: string[]
}
const { ipcRenderer } = window.require('electron')
export const queryCodingWorkspaces = (): Promise<{ Data: CodingWorkspace[] }> =>
  ipcRenderer.invoke('QueryAICodingWorkspaces', {})
export const createCodingWorkspace = (Name: string, RootPaths: string[]): Promise<CodingWorkspace> =>
  ipcRenderer.invoke('CreateAICodingWorkspace', { Name, RootPaths })
export const listCodingWorktrees = (WorkspaceID: string): Promise<{ Data: CodingWorktree[] }> =>
  ipcRenderer.invoke('ListAICodingWorktrees', { WorkspaceID })
export const listCodingSessions = (WorkspaceID: string): Promise<{ Data: CodingSession[] }> =>
  ipcRenderer.invoke('ListAICodingSessions', { WorkspaceID })
export const queryCodingSessionDetails = (sessionIDs: string[]): Promise<{ Data: AISession[] }> =>
  ipcRenderer.invoke('QueryAISession', {
    Pagination: { Page: 1, Limit: sessionIDs.length, OrderBy: 'last_used_at', Order: 'desc' },
    Filter: { SessionID: sessionIDs },
  })

export interface CodingBranch {
  Name: string
  Ref: string
  Commit: string
  Remote: boolean
}
export interface CodingBranches {
  Data: CodingBranch[]
  CurrentBranch: string
  CurrentCommit: string
  DefaultRef: string
  HasLocalChanges: boolean
}
export const listCodingBranches = (WorkspaceID: string): Promise<CodingBranches> =>
  ipcRenderer.invoke('ListAICodingBranches', { WorkspaceID })
