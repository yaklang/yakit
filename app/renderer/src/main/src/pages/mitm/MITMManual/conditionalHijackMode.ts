import { ManualHijackListAction, ManualHijackType } from '@/defaultConstants/mitmV2'
import type { ManualHijackTypeProps } from './MITMManualType'

export enum MITMHijackTaskSource {
  Unspecified = 'MITM_HIJACK_TASK_SOURCE_UNSPECIFIED',
  Manual = 'MITM_HIJACK_TASK_SOURCE_MANUAL',
  Conditional = 'MITM_HIJACK_TASK_SOURCE_CONDITIONAL',
  ConditionalManual = 'MITM_HIJACK_TASK_SOURCE_CONDITIONAL_MANUAL',
}

export const isConditionalHijackTask = (
  source: MITMHijackTaskSource | undefined,
  legacyHijackFilterEnabled: boolean,
): boolean => {
  if (source === MITMHijackTaskSource.Conditional || source === MITMHijackTaskSource.ConditionalManual) return true
  if (source === MITMHijackTaskSource.Manual) return false

  // Old engines do not send a source. With proto-loader defaults enabled, that
  // arrives as UNSPECIFIED; direct mocks may leave the property undefined.
  return legacyHijackFilterEnabled
}

export const isHijackEditorMode = (mode: ManualHijackTypeProps): boolean => {
  return mode === ManualHijackType.Manual || mode === ManualHijackType.HijackFilter
}

export const shouldSyncAutoForwardMode = (mode: ManualHijackTypeProps): boolean => {
  return mode !== ManualHijackType.HijackFilter
}

export const resolveConditionalHijackModeOnMessage = (
  mode: ManualHijackTypeProps,
  conditionalHijackTask: boolean,
  action: ManualHijackListAction | undefined,
  hasTask: boolean,
  conditionalManualTask = false,
): ManualHijackTypeProps => {
  const canRevealConditionalTask =
    action === ManualHijackListAction.Hijack_List_Add || action === ManualHijackListAction.Hijack_List_Reload
  if (conditionalManualTask && canRevealConditionalTask && hasTask) return ManualHijackType.Manual
  if (!conditionalHijackTask || !canRevealConditionalTask || !hasTask || isHijackEditorMode(mode)) {
    return mode
  }

  return ManualHijackType.HijackFilter
}

export const resolveConditionalHijackModeAfterTaskCount = (
  mode: ManualHijackTypeProps,
  taskCount: number,
): ManualHijackTypeProps => {
  if (mode === ManualHijackType.HijackFilter && taskCount === 0) {
    return ManualHijackType.Log
  }

  return mode
}

export const resolveConditionalHijackViewMode = (source: MITMHijackTaskSource | undefined): ManualHijackTypeProps =>
  source === MITMHijackTaskSource.ConditionalManual ? ManualHijackType.Manual : ManualHijackType.HijackFilter
