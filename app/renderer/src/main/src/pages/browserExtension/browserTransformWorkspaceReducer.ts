import type {
  BrowserTab,
  BrowserTransformValidatedSuggestion,
  DirectionName,
  PageCallable,
  TransformExecution,
  TransformProfile,
  TransformProfileInput,
} from './browserTransformTypes'

export interface BrowserTransformValidatedBaseline {
  draft: string
  proofLevel: BrowserTransformValidatedSuggestion['proofLevel']
  comparisonSummary?: string
}

export interface BrowserTransformWorkspaceState {
  tabs: BrowserTab[]
  profiles: TransformProfile[]
  callables: PageCallable[]
  selectedID: string
  draft?: TransformProfileInput
  activeDirection: DirectionName
  loading: boolean
  error: string
  testMethod: string
  testURL: string
  testHeaders: string
  testBody: string
  testSample?: { body: string; label: string }
  testResult?: TransformExecution
  editorMode: 'guided' | 'advanced'
  confirmDeleteCallableID: string
  validatedBaseline?: BrowserTransformValidatedBaseline
}

export type BrowserTransformWorkspaceField = keyof BrowserTransformWorkspaceState

export type BrowserTransformWorkspaceAction =
  | { type: 'field.set'; field: BrowserTransformWorkspaceField; value: unknown }
  | {
      type: 'profile.open'
      profile?: TransformProfileInput
      selectedID: string
      callables?: PageCallable[]
      direction?: DirectionName
      editorMode?: 'guided' | 'advanced'
    }
  | {
      type: 'replay.seed'
      method?: string
      url?: string
      body?: string
      headers?: string
      sample?: { body: string; label: string }
      clearSample?: boolean
    }
  | {
      type: 'suggestion.apply'
      callable: PageCallable
      profile: TransformProfileInput
      method: string
      url: string
      body?: string
      headers?: string
      sample?: { body: string; label: string }
    }
  | {
      type: 'validation.apply'
      profile: TransformProfileInput
      baseline: BrowserTransformValidatedBaseline
      editorMode: 'guided' | 'advanced'
      method: string
      url: string
    }

export function createBrowserTransformWorkspaceState(testURL = ''): BrowserTransformWorkspaceState {
  return {
    tabs: [],
    profiles: [],
    callables: [],
    selectedID: '',
    activeDirection: 'request',
    loading: false,
    error: '',
    testMethod: 'POST',
    testURL,
    testHeaders: '{\n  "Content-Type": "application/json"\n}',
    testBody: '{\n  "value": "plain"\n}',
    editorMode: 'guided',
    confirmDeleteCallableID: '',
  }
}

export function browserTransformWorkspaceReducer(
  state: BrowserTransformWorkspaceState,
  action: BrowserTransformWorkspaceAction,
): BrowserTransformWorkspaceState {
  if (action.type === 'field.set') {
    const previous = state[action.field]
    const next =
      typeof action.value === 'function'
        ? (action.value as (value: typeof previous) => typeof previous)(previous)
        : action.value
    return { ...state, [action.field]: next }
  }
  if (action.type === 'profile.open') {
    return {
      ...state,
      selectedID: action.selectedID,
      draft: action.profile,
      callables: action.callables || state.callables,
      activeDirection: action.direction || 'request',
      editorMode: action.editorMode || 'guided',
      validatedBaseline: undefined,
      testResult: undefined,
      error: '',
    }
  }
  if (action.type === 'replay.seed') {
    return {
      ...state,
      testMethod: action.method ?? state.testMethod,
      testURL: action.url ?? state.testURL,
      testBody: action.body ?? state.testBody,
      testHeaders: action.headers ?? state.testHeaders,
      testSample: action.sample ?? (action.clearSample ? undefined : state.testSample),
      testResult: undefined,
    }
  }
  if (action.type === 'suggestion.apply') {
    return {
      ...state,
      callables: [...state.callables.filter((item) => item.id !== action.callable.id), action.callable],
      selectedID: '',
      draft: action.profile,
      activeDirection: 'request',
      editorMode: 'guided',
      validatedBaseline: undefined,
      testMethod: action.method,
      testURL: action.url,
      testBody: action.body ?? state.testBody,
      testHeaders: action.headers ?? state.testHeaders,
      testSample: action.sample,
      testResult: undefined,
      error: '',
    }
  }
  return {
    ...state,
    selectedID: '',
    draft: action.profile,
    activeDirection: action.profile.request.enabled ? 'request' : 'response',
    editorMode: action.editorMode,
    validatedBaseline: action.baseline,
    testMethod: action.method,
    testURL: action.url,
    testSample: undefined,
    testResult: undefined,
    error: '',
  }
}
