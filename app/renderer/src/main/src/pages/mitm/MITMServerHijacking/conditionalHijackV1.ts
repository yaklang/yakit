import { ManualHijackType } from '@/defaultConstants/mitmV2'
import type { ManualHijackTypeProps } from '../MITMManual/MITMManualType'
import { isConditionalHijackTask, isHijackEditorMode } from '../MITMManual/conditionalHijackMode'
import type { MITMHijackTaskSource } from '../MITMManual/conditionalHijackMode'

export enum V1HijackMessageAction {
  Ignore = 'ignore',
  InvalidResponse = 'invalid-response',
  ForwardRequest = 'forward-request',
  ForwardResponse = 'forward-response',
  InterceptRequest = 'intercept-request',
  InterceptResponse = 'intercept-response',
}

interface ResolveV1HijackMessageActionParams {
  mode: ManualHijackTypeProps
  forResponse: boolean
  hasRequest: boolean
  hasResponse: boolean
  responseId?: number
  taskSource?: MITMHijackTaskSource
  legacyHijackFilterEnabled: boolean
}

export interface V1HijackMessageDecision {
  action: V1HijackMessageAction
  conditionalHijackTask: boolean
  shouldActivateConditionalView: boolean
}

export const resolveV1HijackMessageAction = ({
  mode,
  forResponse,
  hasRequest,
  hasResponse,
  responseId,
  taskSource,
  legacyHijackFilterEnabled,
}: ResolveV1HijackMessageActionParams): V1HijackMessageDecision => {
  const conditionalHijackTask = isConditionalHijackTask(taskSource, legacyHijackFilterEnabled)
  const decision = (action: V1HijackMessageAction, shouldActivateConditionalView = false): V1HijackMessageDecision => ({
    action,
    conditionalHijackTask,
    shouldActivateConditionalView,
  })

  if (forResponse) {
    if (!hasResponse || !responseId) return decision(V1HijackMessageAction.InvalidResponse)

    const hijackEditor = isHijackEditorMode(mode)
    if (!hijackEditor && !conditionalHijackTask) return decision(V1HijackMessageAction.ForwardResponse)

    return decision(V1HijackMessageAction.InterceptResponse, !hijackEditor && conditionalHijackTask)
  }

  if (!hasRequest) return decision(V1HijackMessageAction.Ignore)

  const manualHijack = mode === ManualHijackType.Manual
  if (manualHijack || conditionalHijackTask) {
    return decision(V1HijackMessageAction.InterceptRequest, !manualHijack && conditionalHijackTask)
  }

  return decision(V1HijackMessageAction.ForwardRequest)
}

export type V1ConditionalHijackCompletion =
  | { action: 'discard' }
  | { action: 'forward-response' }
  | {
      action: 'forward-request'
      isManual: boolean
      hijackResponseType: 'onlyOne' | 'all' | 'never'
    }

export const resolveV1ConditionalHijackModeAfterCompletion = (
  mode: ManualHijackTypeProps,
  completion: V1ConditionalHijackCompletion,
): ManualHijackTypeProps => {
  if (mode !== ManualHijackType.HijackFilter) return mode

  if (completion.action === 'forward-request' && (completion.isManual || completion.hijackResponseType !== 'never')) {
    return mode
  }

  return ManualHijackType.Log
}
