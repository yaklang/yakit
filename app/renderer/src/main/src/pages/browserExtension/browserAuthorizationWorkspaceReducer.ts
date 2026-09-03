import type { BrowserAuthorizationMode } from './browserAuthorizationPresentation'
import type {
  AuthContextState,
  BaselineCaptureState,
  BrowserAuthorizationWorkspaceResult,
  BrowserFirefoxManagedContainer,
  DeviceInspectionState,
  IdentitySlot,
  ManagedFirefoxContainerReference,
  TransformProfileState,
  WorkspaceProof,
} from './browserAuthorizationTypes'

export interface BrowserAuthorizationWorkspaceState {
  mode: BrowserAuthorizationMode
  left: IdentitySlot
  right: IdentitySlot
  inspections: Record<string, DeviceInspectionState>
  proof?: WorkspaceProof
  workspaceId: string
  workspaceState?: BrowserAuthorizationWorkspaceResult['state']
  workspace?: BrowserAuthorizationWorkspaceResult
  checking: boolean
  authContexts: Record<'left' | 'right', AuthContextState>
  baselineCapture: BaselineCaptureState
  selectedResource: string
  canaryPathText: string
  transformProfiles: Record<'left' | 'right', TransformProfileState>
  selectedTransforms: Record<'left' | 'right', string>
  createdContainer?: ManagedFirefoxContainerReference
  managedContainers: Record<string, BrowserFirefoxManagedContainer[]>
  planning: boolean
  bindingLogical: boolean
  executing: boolean
  workspaceClock: number
}

export type BrowserAuthorizationWorkspaceField = keyof BrowserAuthorizationWorkspaceState

type StateUpdate<T> = T | ((current: T) => T)

export type BrowserAuthorizationWorkspaceAction =
  | {
      type: 'field.set'
      field: BrowserAuthorizationWorkspaceField
      value: unknown
    }
  | {
      type: 'workspace.apply'
      workspace: BrowserAuthorizationWorkspaceResult
      identities?: { left: IdentitySlot; right: IdentitySlot }
    }
  | {
      type: 'selection.change'
      mode?: BrowserAuthorizationMode
      left?: StateUpdate<IdentitySlot>
      right?: StateUpdate<IdentitySlot>
    }
  | { type: 'workspace.clear' }

export function createBrowserAuthorizationWorkspaceState(
  leftDeviceId: string,
  rightDeviceId: string,
): BrowserAuthorizationWorkspaceState {
  return {
    mode: 'horizontal',
    left: { deviceId: leftDeviceId, accountLabel: '资源所有者' },
    right: { deviceId: rightDeviceId, accountLabel: '对照账号' },
    inspections: {},
    workspaceId: '',
    checking: false,
    authContexts: {
      left: { loading: false },
      right: { loading: false },
    },
    baselineCapture: { phase: 'idle', candidates: [] },
    selectedResource: '',
    canaryPathText: '',
    transformProfiles: {
      left: { loading: false, profiles: [] },
      right: { loading: false, profiles: [] },
    },
    selectedTransforms: { left: '', right: '' },
    managedContainers: {},
    planning: false,
    bindingLogical: false,
    executing: false,
    workspaceClock: Date.now(),
  }
}

function workspaceProof(next: BrowserAuthorizationWorkspaceResult): WorkspaceProof {
  return {
    id: next.proof.id,
    level: next.proof.level,
    sameOrigin: next.proof.sameOrigin,
    source: next.proof.source,
    reasons: next.staleReason ? [...next.proof.reasons, next.staleReason] : next.proof.reasons,
    expiresAt: next.proof.expiresAt,
  }
}

function selectedTransforms(
  current: Record<'left' | 'right', string>,
  next: BrowserAuthorizationWorkspaceResult,
): Record<'left' | 'right', string> {
  if (next.plan?.operation?.transform) {
    return { left: next.plan.operation.transform.profileId, right: '' }
  }
  if (next.plan?.transforms) {
    return {
      left: next.plan.transforms.left.profileId,
      right: next.plan.transforms.right.profileId,
    }
  }
  if (next.baselines.left?.logicalRequest && next.baselines.right?.logicalRequest) {
    return {
      left: next.baselines.left.logicalRequest.profileId,
      right: next.baselines.right.logicalRequest.profileId,
    }
  }
  return current
}

export function selectAuthorizationResource(current: string, next: BrowserAuthorizationWorkspaceResult): string {
  if (next.plan?.candidateId) return next.plan.candidateId
  if (next.mode === 'vertical') {
    if (next.baselinePair.operationCandidates.some((candidate) => candidate.id === current)) {
      return current
    }
    const preferred =
      next.baselinePair.operationCandidates.find(
        (candidate) => candidate.eligible && !candidate.requiresDynamicRebuild,
      ) ||
      next.baselinePair.operationCandidates.find((candidate) => candidate.eligible) ||
      next.baselinePair.operationCandidates[0]
    return preferred?.id || ''
  }

  const candidates = next.baselinePair.resourceCandidates
  const selected = candidates.find((candidate) => candidate.id === current)
  const preferredLogical =
    candidates.find((candidate) => candidate.source === 'logical' && candidate.confidence === 'high') ||
    candidates.find((candidate) => candidate.source === 'logical')
  if (selected?.requiresLogicalBinding && preferredLogical) return preferredLogical.id
  if (selected) return current
  return (
    (preferredLogical || candidates.find((candidate) => candidate.confidence === 'high') || candidates[0])?.id || ''
  )
}

function clearWorkspaceBoundState(state: BrowserAuthorizationWorkspaceState): BrowserAuthorizationWorkspaceState {
  return {
    ...state,
    proof: undefined,
    workspaceId: '',
    workspaceState: undefined,
    workspace: undefined,
    authContexts: {
      left: { loading: false },
      right: { loading: false },
    },
    baselineCapture: { phase: 'idle', candidates: [] },
    selectedResource: '',
    canaryPathText: '',
    transformProfiles: {
      left: { loading: false, profiles: [] },
      right: { loading: false, profiles: [] },
    },
    selectedTransforms: { left: '', right: '' },
    planning: false,
    bindingLogical: false,
    executing: false,
  }
}

function resolveStateUpdate<T>(current: T, update?: StateUpdate<T>): T {
  if (update === undefined) return current
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update
}

export function browserAuthorizationWorkspaceReducer(
  state: BrowserAuthorizationWorkspaceState,
  action: BrowserAuthorizationWorkspaceAction,
): BrowserAuthorizationWorkspaceState {
  if (action.type === 'field.set') {
    const previous = state[action.field]
    const next =
      typeof action.value === 'function'
        ? (action.value as (value: typeof previous) => typeof previous)(previous)
        : action.value
    return { ...state, [action.field]: next }
  }
  if (action.type === 'selection.change') {
    const nextMode = action.mode ?? state.mode
    const nextLeft = resolveStateUpdate(state.left, action.left)
    const nextRight = resolveStateUpdate(state.right, action.right)
    const identityBoundaryChanged =
      nextMode !== state.mode ||
      nextLeft.deviceId !== state.left.deviceId ||
      nextLeft.tabId !== state.left.tabId ||
      nextRight.deviceId !== state.right.deviceId ||
      nextRight.tabId !== state.right.tabId
    const nextState = identityBoundaryChanged ? clearWorkspaceBoundState(state) : state
    return {
      ...nextState,
      mode: nextMode,
      left: nextLeft,
      right: nextRight,
    }
  }
  if (action.type === 'workspace.clear') {
    return clearWorkspaceBoundState(state)
  }

  const next = action.workspace
  const contextError = next.state === 'stale' ? next.staleReason || '认证上下文实时复核失败' : undefined
  return {
    ...state,
    ...(action.identities || {}),
    mode: next.mode,
    workspace: next,
    workspaceId: next.id,
    workspaceState: next.state,
    proof: workspaceProof(next),
    authContexts: {
      left: { loading: false, handle: next.left, error: contextError },
      right: { loading: false, handle: next.right, error: contextError },
    },
    canaryPathText: next.plan?.canaryPaths?.length ? next.plan.canaryPaths.join(', ') : state.canaryPathText,
    selectedTransforms: selectedTransforms(state.selectedTransforms, next),
    selectedResource: selectAuthorizationResource(state.selectedResource, next),
    workspaceClock: Date.now(),
  }
}
