import { describe, expect, it } from 'vitest'
import { ManualHijackListAction, ManualHijackType } from '@/defaultConstants/mitmV2'
import type { ManualHijackTypeProps } from '../MITMManualType'
import {
  isConditionalHijackTask,
  isHijackEditorMode,
  MITMHijackTaskSource,
  resolveConditionalHijackModeAfterTaskCount,
  resolveConditionalHijackModeOnMessage,
  shouldSyncAutoForwardMode,
} from '../conditionalHijackMode'

describe('conditionalHijackMode', () => {
  it('uses the task source even when the asynchronously loaded filter flag is stale', () => {
    expect(isConditionalHijackTask(MITMHijackTaskSource.Conditional, false)).toBe(true)
    expect(isConditionalHijackTask(MITMHijackTaskSource.Manual, true)).toBe(false)

    const conditionalTask = isConditionalHijackTask(MITMHijackTaskSource.Conditional, false)
    expect(
      resolveConditionalHijackModeOnMessage(
        ManualHijackType.Log,
        conditionalTask,
        ManualHijackListAction.Hijack_List_Add,
        true,
      ),
    ).toBe(ManualHijackType.HijackFilter)
  })

  it('falls back to the local filter flag only for old-engine task messages', () => {
    expect(isConditionalHijackTask(MITMHijackTaskSource.Unspecified, true)).toBe(true)
    expect(isConditionalHijackTask(MITMHijackTaskSource.Unspecified, false)).toBe(false)
    expect(isConditionalHijackTask(undefined, true)).toBe(true)
  })

  it.each([ManualHijackType.Log, ManualHijackType.PluginOutput])('opens the conditional editor from %s', (mode) => {
    expect(resolveConditionalHijackModeOnMessage(mode, true, ManualHijackListAction.Hijack_List_Add, true)).toBe(
      ManualHijackType.HijackFilter,
    )
    expect(resolveConditionalHijackModeOnMessage(mode, true, ManualHijackListAction.Hijack_List_Reload, true)).toBe(
      ManualHijackType.HijackFilter,
    )
  })

  it.each([
    [false, ManualHijackListAction.Hijack_List_Add, true],
    [true, ManualHijackListAction.Hijack_List_Add, false],
    [true, ManualHijackListAction.Hijack_List_Update, true],
    [true, ManualHijackListAction.Hijack_List_Delete, true],
    [false, ManualHijackListAction.Hijack_List_Reload, true],
  ])('does not open the conditional editor for unrelated messages', (enabled, action, hasTask) => {
    expect(resolveConditionalHijackModeOnMessage(ManualHijackType.Log, enabled, action, hasTask)).toBe(
      ManualHijackType.Log,
    )
  })

  it.each([ManualHijackType.Manual, ManualHijackType.HijackFilter])('preserves an existing editor mode: %s', (mode) => {
    expect(resolveConditionalHijackModeOnMessage(mode, true, ManualHijackListAction.Hijack_List_Add, true)).toBe(mode)
  })

  it('returns to traffic logs only after the final conditional task is removed', () => {
    expect(resolveConditionalHijackModeAfterTaskCount(ManualHijackType.HijackFilter, 2)).toBe(
      ManualHijackType.HijackFilter,
    )
    expect(resolveConditionalHijackModeAfterTaskCount(ManualHijackType.HijackFilter, 0)).toBe(ManualHijackType.Log)
    expect(resolveConditionalHijackModeAfterTaskCount(ManualHijackType.Manual, 0)).toBe(ManualHijackType.Manual)
  })

  it('keeps handling repeated conditional hits until the last task is removed', () => {
    let mode: ManualHijackTypeProps = ManualHijackType.Log
    for (let index = 0; index < 3; index += 1) {
      mode = resolveConditionalHijackModeOnMessage(mode, true, ManualHijackListAction.Hijack_List_Add, true)
      expect(mode).toBe(ManualHijackType.HijackFilter)
    }

    expect(resolveConditionalHijackModeAfterTaskCount(mode, 2)).toBe(ManualHijackType.HijackFilter)
    expect(resolveConditionalHijackModeAfterTaskCount(mode, 1)).toBe(ManualHijackType.HijackFilter)
    expect(resolveConditionalHijackModeAfterTaskCount(mode, 0)).toBe(ManualHijackType.Log)
  })

  it('renders the editor for manual and conditional modes', () => {
    expect(isHijackEditorMode(ManualHijackType.Manual)).toBe(true)
    expect(isHijackEditorMode(ManualHijackType.HijackFilter)).toBe(true)
    expect(isHijackEditorMode(ManualHijackType.Log)).toBe(false)
    expect(isHijackEditorMode(ManualHijackType.PluginOutput)).toBe(false)
  })

  it('keeps the backend auto-forward state unchanged for the conditional view', () => {
    expect(shouldSyncAutoForwardMode(ManualHijackType.HijackFilter)).toBe(false)
    expect(shouldSyncAutoForwardMode(ManualHijackType.Manual)).toBe(true)
    expect(shouldSyncAutoForwardMode(ManualHijackType.Log)).toBe(true)
    expect(shouldSyncAutoForwardMode(ManualHijackType.PluginOutput)).toBe(true)
  })
})
