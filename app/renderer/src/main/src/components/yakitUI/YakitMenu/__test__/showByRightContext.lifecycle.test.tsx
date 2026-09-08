import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { showByRightContext } from '../showByRightContext'
import emiter from '@/utils/eventBus/eventBus'

const ContextMenuId = 'yakit-right-context'

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

vi.mock('../YakitMenu', () => ({
  YakitMenu: () => <div data-testid="mock-yakit-menu" />,
}))

/** showByRightContext 的 render 经 setTimeout(0) 异步挂载，等一拍再断言 */
const waitForRender = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
}

describe('showByRightContext', () => {
  const handles: { destroy: () => void }[] = []

  afterEach(() => {
    // 必须经 destroy 句柄清单例 rightContextRoot：直接 el.remove() 会留 Root 指向游离 div，污染下个用例
    handles.splice(0).forEach((h) => h.destroy())
    document.getElementById(ContextMenuId)?.remove()
    vi.mocked(emiter.emit).mockClear()
  })

  const menuNode = (label: string): ReactNode => <div data-testid={`ctx-${label}`}>{label}</div>

  it('唤起创建菜单节点，重复唤起复用同一 div 并替换内容', async () => {
    handles.push(showByRightContext(menuNode('a'), 10, 20))
    await waitForRender()
    const div1 = document.getElementById(ContextMenuId)
    expect(div1).toBeInTheDocument()
    expect(screen.getByTestId('ctx-a')).toBeInTheDocument()

    handles.push(showByRightContext(menuNode('b'), 30, 40))
    await waitForRender()
    expect(document.querySelectorAll(`#${ContextMenuId}`)).toHaveLength(1)
    expect(document.getElementById(ContextMenuId)).toBe(div1)
    expect(screen.getByTestId('ctx-b')).toBeInTheDocument()
    expect(screen.queryByTestId('ctx-a')).not.toBeInTheDocument()
  })

  it('isForce=true 时换新 div 且旧 div 被移除', async () => {
    handles.push(showByRightContext(menuNode('a'), 10, 20))
    await waitForRender()
    const div1 = document.getElementById(ContextMenuId)

    handles.push(showByRightContext(menuNode('b'), 30, 40, true))
    await waitForRender()
    expect(div1?.isConnected).toBe(false)
    const div2 = document.getElementById(ContextMenuId)
    expect(div2).not.toBe(div1)
    expect(screen.getByTestId('ctx-b')).toBeInTheDocument()
  })

  it('点击外部（capture once）销毁菜单，destroy 句柄幂等', async () => {
    const handle = showByRightContext(menuNode('a'), 10, 20)
    handles.push(handle)
    await waitForRender()
    expect(document.getElementById(ContextMenuId)).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(document.body)
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    expect(document.getElementById(ContextMenuId)).not.toBeInTheDocument()

    // 已销毁后再调 destroy 不应抛错（root 已置空、div 已移除）
    expect(() => handle.destroy()).not.toThrow()
  })

  it('菜单开/关与 setYakitHeaderDraggable 事件配对', async () => {
    const handle = showByRightContext(menuNode('a'), 10, 20)
    handles.push(handle)
    await waitForRender()
    expect(emiter.emit).toHaveBeenCalledWith('setYakitHeaderDraggable', false)

    handle.destroy()
    expect(emiter.emit).toHaveBeenCalledWith('setYakitHeaderDraggable', true)
    expect(document.getElementById(ContextMenuId)).not.toBeInTheDocument()
  })
})
