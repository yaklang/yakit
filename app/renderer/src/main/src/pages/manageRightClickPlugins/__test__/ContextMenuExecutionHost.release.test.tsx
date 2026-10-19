import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextMenuExecutionType, ContextMenuResultMode, ContextMenuScene, type ContextMenuAction } from '../types'
import { getContextMenuExecution, removeContextMenuExecution } from '../executionRegistry'
import emiter from '@/utils/eventBus/eventBus'

const ids = vi.hoisted(() => ({ n: 0 }))
const overlays = vi.hoisted(() => {
  const opened: Array<{ onCancel?: () => void; destroy: ReturnType<typeof vi.fn> }> = []
  const show = (props: { onCancel?: () => void }) => {
    const destroy = vi.fn()
    opened.push({ onCancel: props.onCancel, destroy })
    return { destroy }
  }
  return { opened, show }
})

vi.hoisted(() => {
  ;(window as unknown as { require: () => { ipcRenderer: Record<string, () => void> } }).require = () => ({
    ipcRenderer: {
      on: () => undefined,
      off: () => undefined,
      invoke: () => undefined,
      removeListener: () => undefined,
    },
  })
})

vi.mock('uuid', () => ({
  v4: () => `exec-${++ids.n}`,
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn(async () => ''), setRemoteValue: vi.fn() }))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({
  getMainOperatorPageBodyContainer: () => document.body,
}))
vi.mock('@/components/pluginHasParamsDrawer/PluginHasParamsDrawer', () => ({
  PluginHasParamsModal: () => null,
}))
vi.mock('@/components/yakitUI/YakitDrawer/YakitDrawer', () => ({ showYakitDrawer: overlays.show }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ showYakitModal: overlays.show }))

import { ContextMenuExecutionHost } from '../ContextMenuExecutionHost'

const action = (mode: ContextMenuResultMode): ContextMenuAction => ({
  PluginUUID: 'u',
  PluginName: 'plugin',
  ActionID: 'a',
  HookName: 'hook',
  Enabled: true,
  Locked: false,
  Sort: 0,
  Shortcut: '',
  ResultMode: mode,
  AskBeforeRun: false,
  Params: [],
  IsCorePlugin: false,
  Scene: ContextMenuScene.HTTPPacket,
  PluginType: 'yak',
  ExecutionType: ContextMenuExecutionType.ContextMenu,
  Help: '',
  HeadImg: '',
  SupportsResultMode: true,
  IsAIPlugin: false,
})

const emitRun = (mode: ContextMenuResultMode) => {
  act(() => {
    emiter.emit('runContextMenuAction', {
      action: action(mode),
      request: {
        Source: 'test',
        Trigger: 'context-menu',
        HttpsState: 'http',
        HTTPFlowIDs: [],
        HasRequest: false,
        HasResponse: false,
        PacketRevision: '',
      },
    })
  })
}

describe('ContextMenuExecutionHost 结果窗口关闭释放注册项', () => {
  afterEach(() => {
    cleanup()
    for (let i = 1; i <= ids.n; i++) removeContextMenuExecution(`exec-${i}`)
    overlays.opened.length = 0
    ids.n = 0
  })

  it('子组件未挂载时关闭弹窗会移除注册项', async () => {
    render(<ContextMenuExecutionHost />)
    emitRun(ContextMenuResultMode.Dialog)
    await waitFor(() => expect(overlays.opened).toHaveLength(1))
    expect(getContextMenuExecution('exec-1')).toBeTruthy()

    act(() => {
      overlays.opened[0].onCancel?.()
    })

    expect(getContextMenuExecution('exec-1')).toBeUndefined()
    expect(overlays.opened[0].destroy).toHaveBeenCalled()
  })

  it('加载完成前替换抽屉会释放上一次注册项', async () => {
    render(<ContextMenuExecutionHost />)
    emitRun(ContextMenuResultMode.Drawer)
    await waitFor(() => expect(overlays.opened).toHaveLength(1))
    emitRun(ContextMenuResultMode.Drawer)
    await waitFor(() => expect(overlays.opened).toHaveLength(2))

    expect(getContextMenuExecution('exec-1')).toBeUndefined()
    expect(getContextMenuExecution('exec-2')).toBeTruthy()
    expect(overlays.opened[0].destroy).toHaveBeenCalled()
  })
})
