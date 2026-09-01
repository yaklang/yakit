import { describe, expect, it } from 'vitest'
import {
  createBrowserCryptoTask,
  reduceBrowserCryptoTask,
  retryPromptForBrowserCryptoTask,
} from '../browserCryptoTaskState'

const context = {
  deviceId: 'browser-1',
  target: { tabId: 7, frameId: 0, documentId: 'document-1' },
  reviewPolicy: 'manual' as const,
  traceId: 'trace-1',
}

function output(
  state: ReturnType<typeof createBrowserCryptoTask>,
  Type: string,
  payload: Record<string, unknown>,
  NodeId?: string,
) {
  return reduceBrowserCryptoTask(state, {
    type: 'ai-output',
    event: { Type, NodeId, TaskId: 'task-1' },
    content: JSON.stringify(payload),
    now: state.updatedAt + 1,
  })
}

describe('browser crypto task state machine', () => {
  it('tracks deterministic Agent tools instead of chat copy', () => {
    let state = createBrowserCryptoTask(context, 1_000)
    state = output(state, 'tool_call_start', {
      call_tool_id: 'trace-call',
      tool: { name: 'recording.trace.list' },
    })
    expect(state).toMatchObject({
      status: 'running',
      stage: 'inspect',
      activeToolName: 'recording.trace.list',
      taskId: 'task-1',
    })

    state = output(state, 'tool_call_done', { call_tool_id: 'trace-call' })
    expect(state.stage).toBe('analyze')
    expect(state.completedStages).toContain('inspect')

    state = output(state, 'tool_call_start', {
      call_tool_id: 'capture-call',
      tool: { name: 'browser.capability.call' },
    })
    state = output(state, 'tool_call_param', {
      call_tool_id: 'capture-call',
      params: {
        method: 'browser.deep_capture.start',
        params: { matcher: { operation: 'encrypt' } },
      },
    })
    expect(state).toMatchObject({
      status: 'waiting-user',
      stage: 'capture',
    })
    expect(state.message).toContain('重复一次真实业务操作')

    state = output(state, 'tool_call_done', { call_tool_id: 'capture-call' })
    expect(state.status).toBe('waiting-user')

    state = output(state, 'tool_call_start', {
      call_tool_id: 'validate-call',
      tool: { name: 'profile.validate' },
    })
    state = output(state, 'tool_call_done', { call_tool_id: 'validate-call' })
    expect(state.stage).toBe('confirm')
    expect(state.completedStages).toContain('validate')

    state = reduceBrowserCryptoTask(state, {
      type: 'validation-available',
      draftId: 'draft-1',
      now: 2_000,
    })
    expect(state).toMatchObject({
      status: 'waiting-user',
      stage: 'confirm',
      validationDraftId: 'draft-1',
    })

    state = reduceBrowserCryptoTask(state, { type: 'profile-loaded', now: 2_001 })
    expect(state.status).toBe('completed')
    expect(state.completedStages).toHaveLength(6)
  })

  it('makes review, rejection and retry explicit and recoverable', () => {
    let state = createBrowserCryptoTask(context, 1_000)
    state = output(state, 'tool_use_review_require', {
      id: 'review-1',
      tool: 'browser.capability.call',
      params: { method: 'browser.deep_capture.start' },
    })
    expect(state).toMatchObject({
      status: 'waiting-user',
      stage: 'capture',
      pendingReviewId: 'review-1',
    })
    expect(state.message).toContain('手动审批')

    state = output(state, 'tool_call_start', {
      call_tool_id: 'capture-call',
      tool: { name: 'browser.capability.call' },
    })
    state = output(state, 'tool_call_user_cancel', { call_tool_id: 'capture-call' })
    expect(state.failure).toMatchObject({
      kind: 'user-rejected',
      recoverable: true,
      stage: 'analyze',
    })
    expect(retryPromptForBrowserCryptoTask(state)).toContain('Review')

    state = reduceBrowserCryptoTask(state, { type: 'retry', now: 2_000 })
    expect(state.failure).toBeUndefined()
    expect(state.status).toBe('running')
  })

  it.each([
    ['manual', '手动审批'],
    ['ai', 'AI 风险判断'],
    ['yolo', '强制审批边界'],
  ] as const)('keeps %s review policy observable', (reviewPolicy, expected) => {
    let state = createBrowserCryptoTask({ ...context, reviewPolicy }, 1_000)
    state = output(state, 'tool_use_review_require', {
      id: `review-${reviewPolicy}`,
      tool: 'browser.capability.call',
      params: { method: 'browser.deep_capture.start' },
    })
    expect(state.message).toContain(expected)
  })

  it('distinguishes reconnectable offline failures from stale document failures', () => {
    let state = createBrowserCryptoTask(context, 1_000)
    state = reduceBrowserCryptoTask(state, { type: 'connection', online: false, now: 1_001 })
    expect(state).toMatchObject({
      status: 'blocked',
      failure: { kind: 'offline', recoverable: true },
    })

    state = reduceBrowserCryptoTask(state, { type: 'connection', online: true, now: 1_002 })
    expect(state).toMatchObject({
      status: 'failed',
      failure: { kind: 'offline', recoverable: true },
    })

    state = output(state, 'tool_call_start', {
      call_tool_id: 'inspect-call',
      tool: { name: 'recording.trace.list' },
    })
    state = output(state, 'tool_call_error', {
      call_tool_id: 'inspect-call',
      error: 'stale_document: 目标页面已经刷新',
    })
    expect(state).toMatchObject({
      status: 'failed',
      failure: { kind: 'stale', recoverable: false },
    })
  })

  it('ignores synchronized history events from older chat sessions', () => {
    const state = createBrowserCryptoTask(context, 1_000)
    const next = reduceBrowserCryptoTask(state, {
      type: 'ai-output',
      event: { Type: 'tool_call_start', IsSync: true },
      content: JSON.stringify({
        call_tool_id: 'old-call',
        tool: { name: 'profile.validate' },
      }),
      now: 2_000,
    })
    expect(next).toBe(state)
  })

  it.each([
    ['deadline exceeded while waiting for deep capture', 'timeout', true],
    ['grant expired for browser.debugger.control', 'authorization', false],
    ['failed to attach chrome debugger', 'debugger', true],
    ['packet validation comparison failed', 'validation', true],
    ['stale_document: page navigated', 'stale', false],
  ] as const)('classifies recovery boundary: %s', (message, kind, recoverable) => {
    let state = createBrowserCryptoTask(context, 1_000)
    state = reduceBrowserCryptoTask(state, {
      type: 'failure',
      stage: 'capture',
      message,
      now: 1_001,
    })
    expect(state.failure).toMatchObject({ kind, recoverable, stage: 'capture' })
  })

  it('keeps an incomplete or aborted AI run observable', () => {
    let state = createBrowserCryptoTask(context, 1_000)
    state = output(
      state,
      'structured',
      {
        react_task_now_status: 'completed',
      },
      'react_task_status_changed',
    )
    expect(state).toMatchObject({
      status: 'waiting-user',
      stage: 'inspect',
    })
    expect(state.message).toContain('尚缺业务证据')

    state = output(
      state,
      'structured',
      {
        react_task_now_status: 'aborted',
      },
      'react_task_status_changed',
    )
    expect(state.status).toBe('cancelled')
  })
})
