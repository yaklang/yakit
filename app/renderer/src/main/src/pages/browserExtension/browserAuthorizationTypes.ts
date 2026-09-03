import type { BrowserAuthorizationMode } from './browserAuthorizationPresentation'

export type IsolationLevel = 'strong' | 'conditional' | 'none'
export type AuthorizationBaselineSide = 'left' | 'right' | 'verification'
export type AuthorizationCaseID =
  | 'a-own'
  | 'b-own'
  | 'a-to-b'
  | 'b-to-a'
  | 'low-control'
  | 'privileged-baseline'
  | 'post-state-before'
  | 'low-privileged-probe'
  | 'post-state-after'

export interface BrowserAuthorizationResourceCandidate {
  id: string
  source: 'wire' | 'logical'
  location: 'header' | 'path' | 'query' | 'body'
  path: string
  category: string
  confidence: 'high' | 'medium' | 'low'
  requiresLogicalBinding: boolean
  reasons: string[]
}

export interface BrowserAuthorizationOperationCandidate {
  id: string
  templateSide: 'right'
  authContextSide: 'left'
  lowControlSide: 'left'
  method: string
  path: string
  actionFingerprint: string
  eligible: boolean
  sideEffect: boolean
  requiresDynamicRebuild: boolean
  authenticationPaths: string[]
  missingAuthPaths: string[]
  dynamicPaths: string[]
  reasons: string[]
}

export interface BrowserIsolationTab {
  id: number
  windowId: number
  title: string
  url: string
  incognito: boolean
  cookieStoreId?: string
  isolationContextId?: string
}

export interface BrowserIsolationContext {
  contextId: string
  kind:
    | 'browser-profile'
    | 'chrome-incognito-store'
    | 'firefox-container'
    | 'verified-tab-local'
    | 'managed-ephemeral-profile'
    | 'sequential-auth-snapshot'
  cookieStoreId?: string
  containerName?: string
  containerColor?: string
  managed?: boolean
  incognito: boolean
  level: IsolationLevel
  tabIds: number[]
  reasons: string[]
}

export interface BrowserIsolationInspection {
  version: 1
  inspectedAt: number
  browser: 'chromium' | 'firefox'
  capabilities: {
    incognitoAccess: 'allowed' | 'denied' | 'unsupported'
    containerTabs: boolean
    managedProfiles: boolean
  }
  contexts: BrowserIsolationContext[]
  tabs: BrowserIsolationTab[]
}

export interface BrowserAuthorizationContextSummary {
  side: 'left' | 'right'
  accountLabel?: string
  deviceId: string
  installationId: string
  isolationContextId: string
  cookieStoreId: string
  origin: string
  grantId: string
  target: {
    tabId: number
    frameId: number
    documentId: string
  }
  fingerprint: string
  contextReference: {
    kind: 'handle' | 'attestation'
    id: string
  }
  authentication: {
    status: 'authenticated' | 'unauthenticated' | 'unknown'
    cookieCount: number
    storageEntryCount: number
    authCookieNames: string[]
    authStorageKeys: string[]
  }
  expiresAt: number
}

export interface BrowserAuthorizationWorkspaceResult {
  version: 1
  id: string
  engineInstanceId: string
  mode: BrowserAuthorizationMode
  state: 'ready' | 'conditional' | 'blocked' | 'stale'
  left: BrowserAuthorizationContextSummary
  right: BrowserAuthorizationContextSummary
  proof: {
    id: string
    source: 'extension-cookie-store' | 'separate-installations'
    sourceProofId?: string
    level: IsolationLevel
    sameOrigin: boolean
    cookieStoreRelation: 'different' | 'same' | 'unknown'
    accountEvidenceRelation: 'different' | 'same' | 'unknown'
    requestCredentialRelation: 'different' | 'same' | 'unknown'
    refreshCheck: 'passed' | 'failed' | 'not-required'
    reasons: string[]
    createdAt: number
    expiresAt: number
  }
  baselines: {
    left?: BrowserAuthorizationBaseline
    right?: BrowserAuthorizationBaseline
    verification?: BrowserAuthorizationBaseline
  }
  baselinePair: {
    state: 'waiting' | 'matched' | 'mismatch'
    actionFingerprint?: string
    reasons: string[]
    resourceCandidates: BrowserAuthorizationResourceCandidate[]
    operationCandidates: BrowserAuthorizationOperationCandidate[]
  }
  plan?: {
    version: 1
    id: string
    workspaceId: string
    mode: BrowserAuthorizationMode
    proofId: string
    candidateId: string
    canaryPaths: string[]
    state: 'ready' | 'review-required' | 'blocked'
    selector: {
      source: 'wire' | 'logical' | 'operation'
      location: 'header' | 'path' | 'query' | 'body' | 'request'
      path: string
    }
    operation?: {
      templateBaselineSide: 'right'
      authContextSide: 'left'
      lowControlSide: 'left'
      authenticationPaths: string[]
      dynamicPaths: string[]
      verificationBaselineId?: string
      transform?: {
        version: 1
        profileId: string
        profileName: string
        profileUpdatedAt: number
        dynamicPaths: string[]
        bindingFingerprint: string
      }
    }
    cases: Array<{
      id: AuthorizationCaseID
      label: string
      requestBaselineSide: AuthorizationBaselineSide
      authContextSide: 'left' | 'right'
      resourceValueSide: 'left' | 'right' | ''
      method: string
      path: string
      sideEffect: boolean
    }>
    requestBudget: number
    requiresDynamicRebuild: boolean
    transforms?: {
      left: BrowserAuthorizationTransformBinding
      right: BrowserAuthorizationTransformBinding
    }
    reasons: string[]
    createdAt: number
    expiresAt: number
  }
  execution?: {
    version: 1
    id: string
    workspaceId: string
    planId: string
    state: 'completed' | 'partial'
    verdict: 'confirmed' | 'likely' | 'protected' | 'inconclusive' | 'invalid-controls'
    confidence: 'high' | 'medium' | 'low' | 'none'
    cases: Array<{
      id: AuthorizationCaseID
      label: string
      authContextSide: 'left' | 'right'
      resourceValueSide: 'left' | 'right' | ''
      state: 'completed' | 'failed' | 'skipped'
      result?: {
        method: string
        url: string
        status: number
        statusText: string
        outcome: 'success' | 'denied' | 'redirect' | 'client-error' | 'server-error' | 'opaque'
        response: {
          contentType: string
          contentEncoding?: string
          capturedBytes: number
          analysisBytes?: number
          declaredBytes?: number
          truncated: boolean
          decoded?: boolean
          analysisState?: 'identity' | 'decoded' | 'encoded-unavailable'
          analysisRepresentation?: 'json' | 'html' | 'form' | 'text' | 'binary' | 'encoded'
          valueFingerprint: string
          shapeFingerprint?: string
        }
        droppedHeaderNames: string[]
        durationMs: number
        timing: BrowserAuthorizationRequestTiming
        completedAt: number
      }
      error?: string
    }>
    requestCount: number
    evidence: Array<{
      direction: 'a-to-b' | 'b-to-a' | 'low-to-privileged' | string
      path: string
      valueFingerprint: string
      source: string
    }>
    evidenceAvailable: boolean
    reasons: string[]
    startedAt: number
    completedAt: number
  }
  createdAt: number
  expiresAt: number
  staleReason?: string
  recovery?: {
    code:
      | 'reconnect-device'
      | 'reselect-document'
      | 'rebind-transform'
      | 'recapture-baselines'
      | 'rebuild-identity-proof'
      | 'rebuild-workspace'
    scope: 'workspace' | 'identity' | 'baseline' | 'transform'
    message: string
    automatic: false
  }
}

export interface BrowserAuthorizationRequestTiming {
  dnsMs: number
  connectMs: number
  tlsMs: number
  ttfbMs: number
  transferMs: number
  totalMs: number
}

export interface BrowserAuthorizationEvidenceCase {
  id: AuthorizationCaseID
  label: string
  authContextSide: 'left' | 'right'
  resourceValueSide: 'left' | 'right' | ''
  state: 'completed' | 'failed' | 'skipped'
  status?: number
  outcome?: string
  timing: BrowserAuthorizationRequestTiming
  requestAvailable: boolean
  responseAvailable: boolean
  response?: {
    contentType: string
    contentEncoding?: string
    capturedBytes: number
    analysisBytes?: number
    declaredBytes?: number
    truncated: boolean
    decoded?: boolean
    analysisState?: 'identity' | 'decoded' | 'encoded-unavailable'
    analysisRepresentation?: 'json' | 'html' | 'form' | 'text' | 'binary' | 'encoded'
  }
}

export interface BrowserAuthorizationEvidenceComparison {
  id: string
  label: string
  leftCaseId: AuthorizationCaseID
  rightCaseId: AuthorizationCaseID
  purpose: 'control' | 'authorization' | 'state-change'
}

export interface BrowserAuthorizationEvidenceBundle {
  version: 1
  workspaceId: string
  executionId: string
  mode: BrowserAuthorizationMode
  verdict: NonNullable<BrowserAuthorizationWorkspaceResult['execution']>['verdict']
  confidence: NonNullable<BrowserAuthorizationWorkspaceResult['execution']>['confidence']
  cases: BrowserAuthorizationEvidenceCase[]
  comparisons: BrowserAuthorizationEvidenceComparison[]
  semantic: NonNullable<BrowserAuthorizationWorkspaceResult['execution']>['evidence']
  representations: string[]
  expiresAt: number
}

export interface BrowserAuthorizationEvidenceDiff {
  version: 1
  workspaceId: string
  executionId: string
  leftCaseId: AuthorizationCaseID
  rightCaseId: AuthorizationCaseID
  scope: 'request' | 'response'
  view: 'redacted' | 'raw'
  representation: 'structured' | 'raw'
  equal: boolean
  entries: Array<{
    path: string
    kind: 'added' | 'removed' | 'changed'
    left?: string
    right?: string
    volatile: boolean
    sensitive: boolean
    semantic: boolean
  }>
  omitted: number
}

export interface BrowserAuthorizationEvidencePacket {
  version: 1
  workspaceId: string
  executionId: string
  caseId: AuthorizationCaseID
  side: 'request' | 'response'
  view: 'redacted' | 'raw'
  packetBase64: string
  capturedBytes: number
  truncated: boolean
}

export interface BrowserAuthorizationEvidenceValidation {
  version: 1
  workspaceId: string
  executionId: string
  direction: 'a-to-b' | 'b-to-a' | 'low-to-privileged' | 'post-state'
  verified: boolean
  evidence: NonNullable<BrowserAuthorizationWorkspaceResult['execution']>['evidence']
  rejectedPaths: string[]
  verdict: NonNullable<BrowserAuthorizationWorkspaceResult['execution']>['verdict']
  confidence: NonNullable<BrowserAuthorizationWorkspaceResult['execution']>['confidence']
  verdictChanged: boolean
  reason: string
}

export interface BrowserAuthorizationBaseline {
  version: 1
  id: string
  deviceId: string
  installationId: string
  isolationContextId: string
  cookieStoreId: string
  origin: string
  grantId: string
  target: {
    tabId: number
    frameId: number
    documentId: string
  }
  authContextReference: {
    kind: 'handle' | 'attestation'
    id: string
  }
  networkRequestId: string
  request: {
    method: string
    url: string
    path: string
    contentType: string
    protocol?: 'graphql'
    operationFingerprint?: string
    operationNames?: string[]
    actionFingerprint: string
    headerNames: string[]
    fields: Array<{
      location: 'header' | 'path' | 'query' | 'body'
      path: string
      valueType: 'string' | 'number' | 'boolean' | 'null' | 'binary'
      byteLength: number
      valueFingerprint: string
      category: string
    }>
  }
  logicalRequest?: {
    version: 1
    source: 'local-replay-draft'
    baselineId: string
    profileId: string
    profileName: string
    isolationContextId: string
    cookieStoreId: string
    target: {
      tabId: number
      frameId: number
      documentId: string
    }
    origin: string
    request: BrowserAuthorizationBaseline['request']
    outputDestinations: string[]
    validation: {
      proofLevel: 'structure'
      summary: string
      warnings: string[]
    }
    bindingFingerprint: string
    profileUpdatedAt: number
    replayUpdatedAt: number
    createdAt: number
    expiresAt: number
  }
  createdAt: number
  expiresAt: number
}

export interface BrowserAuthorizationBaselineCandidate {
  id: string
  method: string
  url: string
  path: string
  resourceType: string
  startedAt: number
  completedAt?: number
  durationMs?: number
  statusCode?: number
  error?: string
  eligible: boolean
  reasons: string[]
}

export interface BrowserAuthorizationTransformBinding {
  version: 1
  baselineId: string
  profileId: string
  profileName: string
  isolationContextId: string
  cookieStoreId: string
  target: {
    tabId: number
    frameId: number
    documentId: string
  }
  origin: string
  dynamicPaths: string[]
  bindingFingerprint: string
  createdAt: number
  expiresAt: number
}

export interface BrowserTransformProfileSummary {
  id: string
  name: string
  enabled: boolean
  isolationContextId: string
  cookieStoreId?: string
  target: {
    tabId: number
    frameId: number
    documentId?: string
  }
  origin: string
  match: {
    methods: string[]
    urlPattern: string
  }
  request: {
    enabled: boolean
    nodes: Array<{
      kind: string
      destination?: string
    }>
  }
  recovery?: {
    state: 'ready' | 'stale' | 'capturing' | 'validation-required' | 'confirmation-required' | 'failed'
  }
}

export interface TransformProfileState {
  loading: boolean
  profiles: BrowserTransformProfileSummary[]
  error?: string
}

export interface BrowserAuthorizationDevice {
  id: string
  name: string
  installationId: string
  managedInstance?: {
    badge: string
  }
  client: string
  clientVersion: string
  capabilities: string[]
}

export interface BrowserAuthorizationAnalysisRequest {
  deviceId: string
  workspaceId: string
  mode: BrowserAuthorizationMode
  planId?: string
  executionId?: string
  requestBudget?: number
}

export interface BrowserAuthorizationWorkspaceProps {
  devices: BrowserAuthorizationDevice[]
  defaultDeviceId: string
  initialWorkspaceId?: string
  initialDeviceId?: string
  initialTabId?: number
  initialMode?: BrowserAuthorizationMode
  onInitialWorkspaceLoaded?: () => void
  onAnalyzeWithAI: (request: BrowserAuthorizationAnalysisRequest) => void
  onPreparePairing?: () => void | Promise<void>
  onRefreshDevices?: () => void | Promise<void>
}

export interface IdentitySlot {
  deviceId: string
  tabId?: number
  accountLabel: string
}

export interface DeviceInspectionState {
  loading: boolean
  error?: string
  inspection?: BrowserIsolationInspection
}

export interface WorkspaceProof {
  id: string
  level: IsolationLevel
  sameOrigin: boolean
  source: BrowserAuthorizationWorkspaceResult['proof']['source']
  reasons: string[]
  expiresAt?: number
}

export interface AuthContextState {
  loading: boolean
  handle?: BrowserAuthorizationContextSummary
  error?: string
}

export interface BaselineCaptureState {
  phase: 'idle' | 'starting' | 'recording' | 'loading' | 'selecting' | 'binding'
  side?: AuthorizationBaselineSide
  candidates: BrowserAuthorizationBaselineCandidate[]
}

export interface ManagedFirefoxContainerReference {
  deviceId: string
  cookieStoreId: string
  name: string
  tabCount?: number
}

export interface BrowserFirefoxContainerIdentityResult {
  container: {
    cookieStoreId: string
    name: string
    color: string
    managed: true
  }
}

export interface BrowserFirefoxManagedContainer {
  cookieStoreId: string
  name: string
  color: string
  createdAt: number
  tabCount: number
}
