import { describe, expect, it } from 'vitest'
import {
  browserAuthorizationLifecycleError,
  BrowserAuthorizationWorkspaceLifecycleError,
  canRefreshBrowserAuthorizationContext,
} from '../browserAuthorizationLifecycle'

const encode = (input: unknown) => new TextEncoder().encode(JSON.stringify(input))

describe('browser authorization workspace lifecycle', () => {
  it.each([
    ['expired', '自然过期'],
    ['evicted', '容量达到上限'],
    ['engine_instance_changed', '引擎已经重启'],
    ['not_found', '当前引擎中不存在'],
    ['replaced', '新工作区替换'],
  ] as const)('renders %s as actionable recovery', (reason, copy) => {
    const error = browserAuthorizationLifecycleError(
      encode({
        reason,
        workspaceId: 'workspace-old',
        engineInstanceId: 'engine-current',
        replacementWorkspaceId: reason === 'replaced' ? 'workspace-new' : undefined,
      }),
      'fallback',
    )

    expect(error).toBeInstanceOf(BrowserAuthorizationWorkspaceLifecycleError)
    expect(error.message).toContain(copy)
  })

  it('keeps malformed task data as an ordinary error', () => {
    const error = browserAuthorizationLifecycleError(encode({ reason: 'expired' }), 'fallback')
    expect(error).not.toBeInstanceOf(BrowserAuthorizationWorkspaceLifecycleError)
    expect(error.message).toBe('fallback')
  })

  it('refreshes a stale context only before evidence has been bound', () => {
    const stale = new Error('extension call failed (auth_context_stale)')
    expect(canRefreshBrowserAuthorizationContext(stale, false)).toBe(true)
    expect(canRefreshBrowserAuthorizationContext(stale, true)).toBe(false)
    expect(canRefreshBrowserAuthorizationContext(new Error('target_unavailable'), false)).toBe(false)
  })
})
