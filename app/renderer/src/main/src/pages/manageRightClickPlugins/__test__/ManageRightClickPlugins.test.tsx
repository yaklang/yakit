import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
vi.mock('antd', () => ({
  Avatar: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  notification: { config: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))
import type { ContextMenuAction } from '../types'
import { ContextMenuResultMode, ContextMenuScene, ContextMenuExecutionType } from '../types'

const mocks = vi.hoisted(() => ({
  fetchSceneActions: vi.fn(),
  grpcSetContextMenuActionBinding: vi.fn(),
  emit: vi.fn(),
  /** 由 DragDropContext mock 捕获的组件 onDragEnd，供拖拽用例直接调用 */
  dragEndHandler: null as ((result: unknown) => void) | null,
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
  yakitFailed: vi.fn(),
}))
vi.mock('../utils', () => ({
  fetchSceneActions: mocks.fetchSceneActions,
  isSameAction: (a: ContextMenuAction, b: ContextMenuAction) =>
    a.PluginUUID === b.PluginUUID && a.ActionID === b.ActionID,
  patchAction: (list: ContextMenuAction[], target: ContextMenuAction, patch: Partial<ContextMenuAction>) =>
    list.map((item) =>
      item.PluginUUID === target.PluginUUID && item.ActionID === target.ActionID ? { ...item, ...patch } : item,
    ),
}))
vi.mock('../api', () => ({ grpcSetContextMenuActionBinding: mocks.grpcSetContextMenuActionBinding }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { on: vi.fn(), off: vi.fn(), emit: mocks.emit } }))
vi.mock('@/store/pageInfo', () => ({ usePageInfo: () => undefined }))
vi.mock('ahooks', async () => {
  const actual = await vi.importActual<typeof import('ahooks')>('ahooks')
  return {
    ...actual,
    useInViewport: () => [true],
    useHover: () => false,
    useThrottleFn: (fn: unknown) => ({ run: fn }),
  }
})
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18nRefresh: 0,
  }),
}))
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (result: unknown) => void }) => {
    mocks.dragEndHandler = onDragEnd
    return <>{children}</>
  },
  Droppable: ({
    children,
  }: {
    children: (provided: { droppableProps: {}; innerRef: () => void; placeholder: null }) => React.ReactNode
  }) => children({ droppableProps: {}, innerRef: () => {}, placeholder: null }),
  Draggable: ({
    children,
  }: {
    children: (
      provided: { draggableProps: { style: {} }; dragHandleProps: {}; innerRef: () => void },
      snapshot: { isDragging: boolean },
    ) => React.ReactNode
  }) => children({ draggableProps: { style: {} }, dragHandleProps: {}, innerRef: () => {} }, { isDragging: false }),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: { Search: () => <input aria-label="search" /> },
}))
vi.mock('@/components/yakitUI/YakitPopconfirm/YakitPopconfirm', () => ({
  YakitPopconfirm: ({ children, onConfirm }: { children: React.ReactNode; onConfirm: () => void }) => (
    <div>
      {children}
      <button onClick={onConfirm}>confirm-clear</button>
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({
  YakitEmpty: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({ YakitModal: () => null }))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({ getMainOperatorPageBodyContainer: () => document.body }))
vi.mock('@/pages/pluginEditor/modifyYakitPlugin/ModifyYakitPlugin', () => ({ ModifyYakitPlugin: () => null }))

import ManageRightClickPlugins from '../ManageRightClickPlugins'

const action = (id: string, overrides: Partial<ContextMenuAction> = {}): ContextMenuAction => ({
  PluginUUID: `plugin-${id}`,
  PluginName: `Plugin ${id}`,
  ActionID: `action-${id}`,
  HookName: 'hook',
  Enabled: true,
  Locked: false,
  Sort: 0,
  Shortcut: '',
  ResultMode: ContextMenuResultMode.Tab,
  AskBeforeRun: false,
  Params: [],
  IsCorePlugin: false,
  Scene: ContextMenuScene.HistorySingle,
  PluginType: 'context-menu',
  ExecutionType: ContextMenuExecutionType.ContextMenu,
  Help: '',
  HeadImg: '',
  SupportsResultMode: true,
  IsAIPlugin: false,
  ...overrides,
})

/** 引擎可能返回字符串 Sort，绕开接口类型构造该形态数据 */
const actionWithStringSort = (id: string, sort: number) =>
  action(id, { Sort: String(sort) as unknown as ContextMenuAction['Sort'] })

describe('ManageRightClickPlugins clear action', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mocks.fetchSceneActions.mockReset()
    mocks.grpcSetContextMenuActionBinding.mockReset()
    mocks.emit.mockReset()
  })

  it('unbinds removable actions and refreshes after all requests settle', async () => {
    const removable = action('one')
    const core = action('core', { IsCorePlugin: true, Locked: true })
    mocks.fetchSceneActions.mockResolvedValueOnce([removable, core]).mockResolvedValueOnce([core])
    mocks.grpcSetContextMenuActionBinding.mockResolvedValue(true)

    render(<ManageRightClickPlugins />)
    await waitFor(() => expect(screen.getAllByText('Plugin one').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByText('confirm-clear'))

    await waitFor(() => expect(mocks.grpcSetContextMenuActionBinding).toHaveBeenCalledTimes(1))
    expect(mocks.grpcSetContextMenuActionBinding).toHaveBeenCalledWith(
      expect.objectContaining({ PluginUUID: removable.PluginUUID, Enabled: false, Shortcut: '', ResultMode: 'tab' }),
    )
    await waitFor(() => expect(mocks.fetchSceneActions).toHaveBeenCalledTimes(2))
    expect(mocks.emit).toHaveBeenCalledWith('refreshContextMenuActions')
  })

  it('still refreshes when one unbind request fails', async () => {
    const first = action('first')
    const second = action('second')
    mocks.fetchSceneActions.mockResolvedValueOnce([first, second]).mockResolvedValueOnce([])
    mocks.grpcSetContextMenuActionBinding.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('failed'))

    render(<ManageRightClickPlugins />)
    await waitFor(() => expect(screen.getAllByText('Plugin first').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByText('confirm-clear'))

    await waitFor(() => expect(mocks.grpcSetContextMenuActionBinding).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.fetchSceneActions).toHaveBeenCalledTimes(2))
    expect(mocks.emit).toHaveBeenCalledWith('refreshContextMenuActions')
  })
})

describe('ManageRightClickPlugins string Sort regression', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mocks.fetchSceneActions.mockReset()
    mocks.grpcSetContextMenuActionBinding.mockReset()
    mocks.emit.mockReset()
    mocks.dragEndHandler = null
  })

  /**
   * 引擎可能返回字符串 Sort：插入新项时，仅「新插入项 + Number(Sort) 变化的既有项」应被保存。
   * 旧实现的严格 !== 比较会把字符串 Sort 全量误判为变化，多保存既有项；此处回归该修复。
   */
  it('only saves the new action when existing numeric-string Sorts match their indices', async () => {
    // 既有两项：字符串 Sort 恰好等于当前下标（'0' / '1'），插入新项后位置不变、Sort 不应变
    const existingA = actionWithStringSort('a', 0)
    const existingB = actionWithStringSort('b', 1)
    // 新项初始为未启用（在右侧可用列表中），模拟真实从右侧添加
    const incoming = action('c', { Enabled: false })
    mocks.fetchSceneActions.mockResolvedValueOnce([existingA, existingB, incoming])
    mocks.grpcSetContextMenuActionBinding.mockResolvedValue(true)

    render(<ManageRightClickPlugins />)
    await waitFor(() => expect(screen.getAllByText('Plugin a').length).toBeGreaterThan(0))

    // 右侧可用列表中点击新项的「添加」按钮（已选列表无添加按钮，取最后一个即可）
    fireEvent.click(screen.getAllByText('YakitButton.add').at(-1) as HTMLElement)

    // 等保存循环走完（新项保存一次），再冲刷一轮微任务：若旧代码误判 Sort 变化，多余的保存会在此后发生
    await waitFor(() => expect(mocks.grpcSetContextMenuActionBinding).toHaveBeenCalledTimes(1))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    // 冲刷后总数仍必须是 1：既有项字符串 Sort 归一后与下标一致，不应触发保存
    expect(mocks.grpcSetContextMenuActionBinding).toHaveBeenCalledTimes(1)
    expect(mocks.grpcSetContextMenuActionBinding).toHaveBeenCalledWith(
      expect.objectContaining({ PluginUUID: incoming.PluginUUID, Enabled: true, Sort: 2 }),
    )
  })

  it('saves only reordered items when existing Sorts are numeric strings', async () => {
    // 4 项字符串 Sort：把第 2 项拖到开头，仅前 3 项 Sort 变化；末项（'3'）不变、不应保存
    const items = [0, 1, 2, 3].map((i) => actionWithStringSort(`item-${i}`, i))
    mocks.fetchSceneActions.mockResolvedValueOnce(items)
    mocks.grpcSetContextMenuActionBinding.mockResolvedValue(true)

    render(<ManageRightClickPlugins />)
    await waitFor(() => expect(screen.getAllByText('Plugin item-0').length).toBeGreaterThan(0))

    act(() => {
      mocks.dragEndHandler?.({
        source: { droppableId: 'droppable-selected', index: 2 },
        destination: { droppableId: 'droppable-selected', index: 0 },
      })
    })

    await waitFor(() => expect(mocks.grpcSetContextMenuActionBinding).toHaveBeenCalledTimes(3))
    const savedUUIDs = mocks.grpcSetContextMenuActionBinding.mock.calls.map(
      ([req]) => (req as { PluginUUID: string }).PluginUUID,
    )
    // 重排后顺序 [i2, i0, i1, i3]，按新下标顺序保存前三个
    expect(savedUUIDs).toEqual([items[2].PluginUUID, items[0].PluginUUID, items[1].PluginUUID])
  })
})
