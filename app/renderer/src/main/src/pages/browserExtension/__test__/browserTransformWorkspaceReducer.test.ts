import { describe, expect, it } from 'vitest'
import type { TransformProfileInput } from '../browserTransformTypes'
import {
  browserTransformWorkspaceReducer,
  createBrowserTransformWorkspaceState,
  type BrowserTransformWorkspaceState,
} from '../browserTransformWorkspaceReducer'

const profile: TransformProfileInput = {
  name: 'AES 网关',
  enabled: true,
  target: { tabId: 1, frameId: 0 },
  origin: 'http://127.0.0.1',
  match: { methods: ['POST'], urlPattern: '*/encrypt' },
  request: { enabled: true, nodes: [] },
  response: { enabled: false, nodes: [] },
  failMode: 'closed',
  maxConcurrency: 1,
}

describe('browserTransformWorkspaceReducer', () => {
  it('keeps replay input while opening an existing profile', () => {
    const seeded = browserTransformWorkspaceReducer(createBrowserTransformWorkspaceState(), {
      type: 'replay.seed',
      method: 'POST',
      url: 'http://127.0.0.1/encrypt',
      body: '{"username":"admin"}',
      sample: { body: '{"username":"admin"}', label: '短时样本' },
    })
    const opened = browserTransformWorkspaceReducer(seeded, {
      type: 'profile.open',
      selectedID: 'profile-1',
      profile: { ...profile, id: 'profile-1' },
    })

    expect(opened.testBody).toBe('{"username":"admin"}')
    expect(opened.testSample?.label).toBe('短时样本')
    expect(opened.selectedID).toBe('profile-1')
  })

  it('applies a validated profile and proof in one transition', () => {
    const state = browserTransformWorkspaceReducer(createBrowserTransformWorkspaceState(), {
      type: 'validation.apply',
      profile,
      baseline: { draft: JSON.stringify(profile), proofLevel: 'exact' },
      editorMode: 'guided',
      method: 'POST',
      url: 'http://127.0.0.1/encrypt',
    })

    expect(state.draft).toEqual(profile)
    expect(state.activeDirection).toBe('request')
    expect(state.validatedBaseline?.proofLevel).toBe('exact')
    expect(state.testResult).toBeUndefined()
  })

  it('invalidates only replay output when replay data changes', () => {
    const initial = {
      ...createBrowserTransformWorkspaceState(),
      testResult: { durationMs: 1 } as BrowserTransformWorkspaceState['testResult'],
    }
    const state = browserTransformWorkspaceReducer(initial, {
      type: 'replay.seed',
      method: 'PUT',
      url: '/profile',
      body: '{}',
    })

    expect(state.testMethod).toBe('PUT')
    expect(state.testResult).toBeUndefined()
  })
})
