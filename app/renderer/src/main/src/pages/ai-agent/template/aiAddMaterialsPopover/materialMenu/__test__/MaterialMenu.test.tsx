import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIMentionTabsEnum } from '../../../../defaultConstant'
import type { MaterialCategory, MaterialMenuItem } from '../../type'
import MaterialMenu from '../MaterialMenu'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (scrollIntoViewDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollIntoViewDescriptor)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

const createItems = (action: () => void): MaterialMenuItem[] => [
  { label: '附件', description: '选择附件', icon: null, action },
  { label: '文件系统', description: '打开侧栏', icon: null, action },
  { label: '技能', description: '选择技能', icon: null, category: 'forge', tab: AIMentionTabsEnum.Forge_Name },
  { label: '工具', description: '选择工具', icon: null, category: 'tool' },
  { label: '知识库', description: '选择知识库', icon: null, category: 'knowledgeBase' },
]

describe('添加资料菜单键盘操作', () => {
  it.each([
    ['@', 'AIAddMaterialsPopover.mentionShortcut'],
    ['/', 'AIAddMaterialsPopover.modeShortcut'],
  ] as const)('快捷入口 %s 点击和回车触发相同操作', (shortcut, label) => {
    const onShortcut = vi.fn()
    const editorKeyDown = vi.fn()
    render(
      <div onKeyDown={editorKeyDown}>
        <MaterialMenu items={createItems(vi.fn())} onOpenCategory={vi.fn()} onShortcut={onShortcut} />
      </div>,
    )
    const shortcuts = screen.getByRole('group', { name: 'AIAddMaterialsPopover.shortcuts' })
    expect(within(shortcuts).getAllByRole('menuitem')).toHaveLength(2)
    expect(
      within(screen.getByRole('group', { name: 'AIChatTextarea.addMaterials' })).getAllByRole('menuitem'),
    ).toHaveLength(5)
    const row = within(shortcuts).getByRole('menuitem', { name: new RegExp(label) })
    fireEvent.click(row)
    expect(onShortcut).toHaveBeenLastCalledWith(shortcut)
    act(() => row.focus())
    expect(fireEvent.keyDown(row, { key: 'Enter', keyCode: 13 })).toBe(false)
    expect(onShortcut).toHaveBeenCalledTimes(2)
    expect(onShortcut).toHaveBeenLastCalledWith(shortcut)
    expect(editorKeyDown).not.toHaveBeenCalled()
  })

  it('打开后聚焦首行，上下键循环切换并跳过被过滤的菜单', () => {
    render(
      <MaterialMenu
        items={createItems(vi.fn())}
        filterMode={[AIMentionTabsEnum.Forge_Name]}
        onShortcut={vi.fn()}
        onOpenCategory={vi.fn()}
      />,
    )
    const rows = screen.getAllByRole('menuitem')
    expect(rows).toHaveLength(6)
    expect(rows[0]).toHaveFocus()
    expect(screen.queryByRole('menuitem', { name: /选择技能/ })).not.toBeInTheDocument()

    fireEvent.keyDown(rows[0], { key: 'ArrowUp', keyCode: 38 })
    expect(rows[5]).toHaveFocus()
    expect(rows[5]).toHaveAttribute('tabindex', '0')
    expect(rows[0]).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(rows[5], { key: 'ArrowDown', keyCode: 40 })
    expect(rows[0]).toHaveFocus()
    fireEvent.keyDown(rows[0], { key: 'ArrowDown', keyCode: 40 })
    fireEvent.keyDown(rows[1], { key: 'ArrowDown', keyCode: 40 })
    fireEvent.keyDown(rows[2], { key: 'ArrowDown', keyCode: 40 })
    fireEvent.keyDown(rows[3], { key: 'ArrowDown', keyCode: 40 })
    expect(rows[4]).toHaveFocus()
    expect(rows[4]).toHaveTextContent('工具')
    expect(rows[4].scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' })
  })

  it.each([0, 1, 2, 3, 4])('第 %i 行回车与点击执行相同动作，且不会冒泡发送消息', (index) => {
    const action = vi.fn()
    const onOpenCategory = vi.fn()
    const editorKeyDown = vi.fn()
    const items = createItems(action)
    render(
      <div onKeyDown={editorKeyDown}>
        <MaterialMenu items={items} onShortcut={vi.fn()} onOpenCategory={onOpenCategory} />
      </div>,
    )
    const rows = screen.getAllByRole('menuitem')
    for (let step = 0; step < index + 2; step++) fireEvent.keyDown(rows[step], { key: 'ArrowDown', keyCode: 40 })

    expect(fireEvent.keyDown(rows[index + 2], { key: 'Enter', keyCode: 13 })).toBe(false)

    expect(editorKeyDown).not.toHaveBeenCalled()
    const callback = items[index].category ? onOpenCategory : action
    expect(callback).toHaveBeenCalledTimes(1)
    if (items[index].category) expect(onOpenCategory).toHaveBeenCalledWith(items[index].category)
    fireEvent.click(rows[index + 2])
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('忽略菜单外、组合键和输入法合成期间的回车', () => {
    const action = vi.fn()
    render(
      <>
        <input aria-label="菜单外输入框" />
        <MaterialMenu items={createItems(action)} onShortcut={vi.fn()} onOpenCategory={vi.fn()} />
      </>,
    )
    const first = screen.getAllByRole('menuitem')[2]
    act(() => first.focus())
    const enter = { key: 'Enter', keyCode: 13 }

    expect(fireEvent.keyDown(screen.getByRole('textbox'), enter)).toBe(true)
    expect(fireEvent.keyDown(first, { ...enter, shiftKey: true })).toBe(true)
    expect(fireEvent.keyDown(first, { ...enter, isComposing: true })).toBe(true)
    expect(action).not.toHaveBeenCalled()
  })

  it('进入子面板后由子面板处理键盘，返回菜单重新聚焦首行', () => {
    const pickerKeyDown = vi.fn()
    const Panels = () => {
      const [category, setCategory] = useState<MaterialCategory>()
      return category ? (
        <div>
          <input aria-label="子面板搜索" onKeyDown={pickerKeyDown} />
          <button onClick={() => setCategory(undefined)}>返回</button>
        </div>
      ) : (
        <MaterialMenu items={createItems(vi.fn()).slice(2)} onShortcut={vi.fn()} onOpenCategory={setCategory} />
      )
    }
    render(<Panels />)
    const category = screen.getAllByRole('menuitem')[2]
    act(() => category.focus())
    fireEvent.keyDown(category, { key: 'Enter', keyCode: 13 })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', keyCode: 13 })).toBe(true)
    expect(pickerKeyDown).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    expect(screen.getAllByRole('menuitem')[0]).toHaveFocus()
  })
})
