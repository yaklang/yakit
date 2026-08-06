import { describe, expect, it } from 'vitest'
import type { BrowserAuthorizationWorkspaceResult } from '../browserAuthorizationTypes'
import {
  browserAuthorizationWorkspaceReducer,
  createBrowserAuthorizationWorkspaceState,
  selectAuthorizationResource,
} from '../browserAuthorizationWorkspaceReducer'

function workspace(patch: Partial<BrowserAuthorizationWorkspaceResult> = {}): BrowserAuthorizationWorkspaceResult {
  return {
    version: 1,
    id: 'workspace-1',
    engineInstanceId: 'engine-1',
    mode: 'horizontal',
    state: 'ready',
    proof: {
      id: 'proof-1',
      level: 'strong',
      sameOrigin: true,
      source: 'extension-cookie-store',
      cookieStoreRelation: 'different',
      accountEvidenceRelation: 'different',
      requestCredentialRelation: 'different',
      refreshCheck: 'passed',
      reasons: [],
      createdAt: 1_000,
      expiresAt: 2_000,
    },
    left: {} as BrowserAuthorizationWorkspaceResult['left'],
    right: {} as BrowserAuthorizationWorkspaceResult['right'],
    baselines: {},
    baselinePair: {
      state: 'waiting',
      reasons: [],
      resourceCandidates: [],
      operationCandidates: [],
    },
    createdAt: 1_000,
    expiresAt: 2_000,
    ...patch,
  }
}

describe('browserAuthorizationWorkspaceReducer', () => {
  it('applies one workspace result atomically', () => {
    const initial = createBrowserAuthorizationWorkspaceState('device-a', 'device-b')
    const next = workspace({
      staleReason: '页面已变化',
      state: 'stale',
      plan: {
        candidateId: 'resource-1',
        canaryPaths: ['body.owner'],
      } as BrowserAuthorizationWorkspaceResult['plan'],
    })
    const state = browserAuthorizationWorkspaceReducer(initial, {
      type: 'workspace.apply',
      workspace: next,
    })

    expect(state.workspaceId).toBe('workspace-1')
    expect(state.workspaceState).toBe('stale')
    expect(state.selectedResource).toBe('resource-1')
    expect(state.canaryPathText).toBe('body.owner')
    expect(state.proof?.reasons).toContain('页面已变化')
    expect(state.authContexts.left.error).toBe('页面已变化')
  })

  it('keeps a valid current candidate and prefers high-confidence logical candidates', () => {
    const next = workspace({
      baselinePair: {
        state: 'matched',
        reasons: [],
        resourceCandidates: [
          {
            id: 'wire',
            source: 'wire',
            location: 'query',
            path: 'query.id',
            category: 'resource',
            confidence: 'high',
            requiresLogicalBinding: true,
            reasons: [],
          },
          {
            id: 'logical',
            source: 'logical',
            location: 'body',
            path: 'body.userId',
            category: 'resource',
            confidence: 'high',
            requiresLogicalBinding: false,
            reasons: [],
          },
        ],
        operationCandidates: [],
      },
    })

    expect(selectAuthorizationResource('wire', next)).toBe('logical')
    expect(selectAuthorizationResource('logical', next)).toBe('logical')
  })

  it('clears workspace-bound state without discarding selected devices', () => {
    const initial = browserAuthorizationWorkspaceReducer(
      createBrowserAuthorizationWorkspaceState('device-a', 'device-b'),
      { type: 'workspace.apply', workspace: workspace() },
    )
    const state = browserAuthorizationWorkspaceReducer(initial, { type: 'workspace.clear' })

    expect(state.left.deviceId).toBe('device-a')
    expect(state.right.deviceId).toBe('device-b')
    expect(state.workspace).toBeUndefined()
    expect(state.workspaceId).toBe('')
  })

  it('keeps a completed handoff when its restored identity selection is applied atomically', () => {
    const initial = createBrowserAuthorizationWorkspaceState('device-a', 'device-a')
    const completed = workspace({
      left: {
        deviceId: 'device-a',
        target: { tabId: 11 },
      } as BrowserAuthorizationWorkspaceResult['left'],
      right: {
        deviceId: 'device-a',
        target: { tabId: 22 },
      } as BrowserAuthorizationWorkspaceResult['right'],
      execution: {
        id: 'execution-1',
        evidenceAvailable: true,
      } as BrowserAuthorizationWorkspaceResult['execution'],
    })
    const restored = browserAuthorizationWorkspaceReducer(initial, {
      type: 'workspace.apply',
      workspace: completed,
      identities: {
        left: { deviceId: 'device-a', tabId: 11, accountLabel: 'admin' },
        right: { deviceId: 'device-a', tabId: 22, accountLabel: 'user' },
      },
    })
    const sameSelection = browserAuthorizationWorkspaceReducer(restored, {
      type: 'selection.change',
      left: (current) => ({ ...current, accountLabel: '管理员' }),
    })

    expect(sameSelection.workspaceId).toBe('workspace-1')
    expect(sameSelection.workspace?.execution?.id).toBe('execution-1')
    expect(sameSelection.workspace?.execution?.evidenceAvailable).toBe(true)
    expect(sameSelection.left.accountLabel).toBe('管理员')
  })

  it('invalidates a restored workspace only when the user changes an identity boundary', () => {
    const initial = browserAuthorizationWorkspaceReducer(
      createBrowserAuthorizationWorkspaceState('device-a', 'device-a'),
      {
        type: 'workspace.apply',
        workspace: workspace(),
        identities: {
          left: { deviceId: 'device-a', tabId: 11, accountLabel: 'A' },
          right: { deviceId: 'device-a', tabId: 22, accountLabel: 'B' },
        },
      },
    )
    const changed = browserAuthorizationWorkspaceReducer(initial, {
      type: 'selection.change',
      right: (current) => ({ ...current, tabId: 23 }),
    })

    expect(changed.right.tabId).toBe(23)
    expect(changed.workspace).toBeUndefined()
    expect(changed.workspaceId).toBe('')
  })
})
