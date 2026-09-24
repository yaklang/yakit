import { describe, expect, it } from 'vitest'
import { ManualHijackType } from '@/defaultConstants/mitmV2'
import { MITMHijackTaskSource, resolveConditionalHijackViewMode } from '../../MITMManual/conditionalHijackMode'
import {
  resolveV1ConditionalHijackModeAfterCompletion,
  resolveV1HijackMessageAction,
  V1HijackMessageAction,
} from '../conditionalHijackV1'

const resolveRequest = ({
  mode = ManualHijackType.Log,
  source,
  legacyHijackFilterEnabled = false,
}: {
  mode?: ManualHijackType
  source?: MITMHijackTaskSource
  legacyHijackFilterEnabled?: boolean
}) =>
  resolveV1HijackMessageAction({
    mode,
    forResponse: false,
    hasRequest: true,
    hasResponse: false,
    taskSource: source,
    legacyHijackFilterEnabled,
  })

const resolveResponse = ({
  mode = ManualHijackType.Log,
  source,
  hasResponse = true,
  responseId = 1,
  legacyHijackFilterEnabled = false,
}: {
  mode?: ManualHijackType
  source?: MITMHijackTaskSource
  hasResponse?: boolean
  responseId?: number
  legacyHijackFilterEnabled?: boolean
}) =>
  resolveV1HijackMessageAction({
    mode,
    forResponse: true,
    hasRequest: true,
    hasResponse,
    responseId,
    taskSource: source,
    legacyHijackFilterEnabled,
  })

describe('MITMHijackedContent V1 conditional hijack wiring', () => {
  describe('incoming request and response decisions', () => {
    it('intercepts an explicitly conditional request even while the async legacy flag is stale', () => {
      expect(
        resolveRequest({
          source: MITMHijackTaskSource.Conditional,
          legacyHijackFilterEnabled: false,
        }),
      ).toEqual({
        action: V1HijackMessageAction.InterceptRequest,
        conditionalHijackTask: true,
        shouldActivateConditionalView: true,
      })
    })

    it('keeps intercepting repeated conditional requests while the conditional view is already active', () => {
      expect(
        resolveRequest({
          mode: ManualHijackType.HijackFilter,
          source: MITMHijackTaskSource.Conditional,
        }).action,
      ).toBe(V1HijackMessageAction.InterceptRequest)
    })

    it('silently forwards an explicitly manual request outside manual mode despite a stale true legacy flag', () => {
      expect(
        resolveRequest({
          source: MITMHijackTaskSource.Manual,
          legacyHijackFilterEnabled: true,
        }),
      ).toEqual({
        action: V1HijackMessageAction.ForwardRequest,
        conditionalHijackTask: false,
        shouldActivateConditionalView: false,
      })
    })

    it('retains the old-engine fallback when no explicit task source is available', () => {
      expect(
        resolveRequest({
          source: MITMHijackTaskSource.Unspecified,
          legacyHijackFilterEnabled: true,
        }).action,
      ).toBe(V1HijackMessageAction.InterceptRequest)
    })

    it('intercepts ordinary tasks while manual hijacking is active without opening the conditional view', () => {
      expect(
        resolveRequest({
          mode: ManualHijackType.Manual,
          source: MITMHijackTaskSource.Manual,
        }),
      ).toEqual({
        action: V1HijackMessageAction.InterceptRequest,
        conditionalHijackTask: false,
        shouldActivateConditionalView: false,
      })
    })

    it('forwards an unrelated response in log mode but intercepts a conditional response', () => {
      expect(resolveResponse({ source: MITMHijackTaskSource.Manual }).action).toBe(
        V1HijackMessageAction.ForwardResponse,
      )
      expect(resolveResponse({ source: MITMHijackTaskSource.Conditional })).toEqual({
        action: V1HijackMessageAction.InterceptResponse,
        conditionalHijackTask: true,
        shouldActivateConditionalView: true,
      })
    })

    it('intercepts the awaited response while the conditional view is active', () => {
      expect(
        resolveResponse({
          mode: ManualHijackType.HijackFilter,
          source: MITMHijackTaskSource.Conditional,
        }),
      ).toEqual({
        action: V1HijackMessageAction.InterceptResponse,
        conditionalHijackTask: true,
        shouldActivateConditionalView: false,
      })
    })

    it.each([
      { hasResponse: false, responseId: 1 },
      { hasResponse: true, responseId: 0 },
    ])('rejects an incomplete intercepted response: %o', ({ hasResponse, responseId }) => {
      expect(resolveResponse({ hasResponse, responseId }).action).toBe(V1HijackMessageAction.InvalidResponse)
    })
  })

  describe('conditional view close timing', () => {
    it('closes immediately after discarding a conditional task', () => {
      expect(resolveV1ConditionalHijackModeAfterCompletion(ManualHijackType.HijackFilter, { action: 'discard' })).toBe(
        ManualHijackType.Log,
      )
    })

    it('closes after forwarding a conditional request that will not wait for a response', () => {
      expect(
        resolveV1ConditionalHijackModeAfterCompletion(ManualHijackType.HijackFilter, {
          action: 'forward-request',
          isManual: false,
          hijackResponseType: 'never',
        }),
      ).toBe(ManualHijackType.Log)
    })

    it.each(['onlyOne', 'all'] as const)('stays open while a %s response is awaited', (hijackResponseType) => {
      expect(
        resolveV1ConditionalHijackModeAfterCompletion(ManualHijackType.HijackFilter, {
          action: 'forward-request',
          isManual: false,
          hijackResponseType,
        }),
      ).toBe(ManualHijackType.HijackFilter)
    })

    it('closes after the awaited response is forwarded', () => {
      expect(
        resolveV1ConditionalHijackModeAfterCompletion(ManualHijackType.HijackFilter, {
          action: 'forward-response',
        }),
      ).toBe(ManualHijackType.Log)
    })

    it('never changes the real manual hijack mode', () => {
      expect(
        resolveV1ConditionalHijackModeAfterCompletion(ManualHijackType.Manual, {
          action: 'forward-request',
          isManual: true,
          hijackResponseType: 'never',
        }),
      ).toBe(ManualHijackType.Manual)
    })
  })
})

it.each([ManualHijackType.Log, ManualHijackType.PluginOutput, ManualHijackType.HijackFilter])(
  'V1 promotes conditional-manual messages from %s and stays manual after completion',
  (mode) => {
    const source = MITMHijackTaskSource.ConditionalManual
    for (const resolve of [resolveRequest, resolveResponse]) {
      const decision = resolve({ mode, source })
      expect(decision.shouldActivateConditionalView).toBe(true)
      expect(decision.conditionalHijackTask).toBe(true)
      const nextMode = resolveConditionalHijackViewMode(source)
      expect(nextMode).toBe(ManualHijackType.Manual)
      expect(resolveV1ConditionalHijackModeAfterCompletion(nextMode, { action: 'discard' })).toBe(
        ManualHijackType.Manual,
      )
      expect(resolveV1ConditionalHijackModeAfterCompletion(nextMode, { action: 'forward-response' })).toBe(
        ManualHijackType.Manual,
      )
      expect(
        resolveV1ConditionalHijackModeAfterCompletion(nextMode, {
          action: 'forward-request',
          isManual: false,
          hijackResponseType: 'never',
        }),
      ).toBe(ManualHijackType.Manual)
    }
  },
)

it('does not reopen the V1 editor or notify again once conditional-manual mode is active', () => {
  for (const resolve of [resolveRequest, resolveResponse]) {
    expect(
      resolve({ mode: ManualHijackType.Manual, source: MITMHijackTaskSource.ConditionalManual })
        .shouldActivateConditionalView,
    ).toBe(false)
  }
})
