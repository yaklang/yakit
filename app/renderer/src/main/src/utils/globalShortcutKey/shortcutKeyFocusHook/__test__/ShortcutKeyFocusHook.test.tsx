import type React from 'react'
import { createRef, useEffect, useState } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ShortcutKeyFocusHook from '../ShortcutKeyFocusHook'
import useFocusContextStore from '../hooks/useStore'
import { getCurrentShortcutFocus, registerShortcutFocusHandle } from '../../utils'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** 把 Provider 下发的 shortcutIds 渲染出来，方便断言 */
const FocusProbe: React.FC = () => {
  const { shortcutIds } = useFocusContextStore()
  return <div data-testid="focus-probe">{JSON.stringify(shortcutIds)}</div>
}

const readProbe = (): string[] | undefined => JSON.parse(screen.getByTestId('focus-probe').textContent || 'null')

describe('ShortcutKeyFocusHook', () => {
  beforeEach(() => {
    // 模块级 currentFocus 在用例之间不会自动清空，先置空数组作为「无聚焦」
    registerShortcutFocusHandle([])
  })
  afterEach(() => {
    cleanup()
  })

  it('未传 focusId 时生成一个 uuid，且外部重渲染不会重新生成', () => {
    const view = render(
      <ShortcutKeyFocusHook>
        <FocusProbe />
      </ShortcutKeyFocusHook>,
    )
    const first = readProbe()
    expect(first).toHaveLength(1)
    expect(first![0]).toMatch(UUID_V4)

    view.rerender(
      <ShortcutKeyFocusHook>
        <FocusProbe />
      </ShortcutKeyFocusHook>,
    )
    expect(readProbe()).toEqual(first)
  })

  it('focusId 内容变化时同步到上下文', () => {
    const view = render(
      <ShortcutKeyFocusHook focusId={['page-a', 'page-b']}>
        <FocusProbe />
      </ShortcutKeyFocusHook>,
    )
    expect(readProbe()).toEqual(['page-a', 'page-b'])

    // 内容真的变了：必须更新（修复不能牺牲合法更新）
    view.rerender(
      <ShortcutKeyFocusHook focusId={['page-c']}>
        <FocusProbe />
      </ShortcutKeyFocusHook>,
    )
    expect(readProbe()).toEqual(['page-c'])
  })

  // 回归 React #185：调用点常写成 focusId={[id]} 内联数组，
  // 内容没变但每次渲染都是新引用。若 effect 用引用比较，就会 setState→重渲染→再 setState。
  it('focusId 传入内容相同的新数组时，不产生额外渲染', () => {
    let childRenders = 0
    const Child: React.FC = () => {
      childRenders += 1
      useFocusContextStore()
      return null
    }
    const Host: React.FC = () => (
      <ShortcutKeyFocusHook focusId={['fixed-id']}>
        <Child />
      </ShortcutKeyFocusHook>
    )

    const view = render(<Host />)
    const afterMount = childRenders

    // 每次外部重渲染，子树只该渲染一次（新引用不应再触发一轮 setState）
    view.rerender(<Host />)
    view.rerender(<Host />)
    view.rerender(<Host />)
    expect(childRenders - afterMount).toBe(3)
  })

  // 真实链路：WebFuzzerPage 内联 focusId → YakitEditor 消费上下文、
  // 把 shortcutIds 合并进本地 focusIds 再往下传。旧实现会让整棵树在每次重渲染时级联。
  it('多级编辑器镜像上下文时，外部重渲染不会沿树级联放量', () => {
    const DEPTH = 4
    const renders: number[] = []

    const Editor: React.FC<{ level: number }> = ({ level }) => {
      renders[level] = (renders[level] || 0) + 1
      const { shortcutIds } = useFocusContextStore()
      const [focusIds, setFocusIds] = useState<string[]>([`editor-${level}`])

      useEffect(() => {
        if (Array.isArray(shortcutIds)) {
          setFocusIds((prev) => Array.from(new Set([...prev, ...shortcutIds])))
        }
      }, [shortcutIds])

      return (
        <ShortcutKeyFocusHook focusId={focusIds}>
          {level > 0 ? <Editor level={level - 1} /> : <FocusProbe />}
        </ShortcutKeyFocusHook>
      )
    }

    const Root: React.FC = () => (
      <ShortcutKeyFocusHook focusId={['root-focus']}>
        <Editor level={DEPTH} />
      </ShortcutKeyFocusHook>
    )

    const view = render(<Root />)
    // 挂载期允许上下文下发引起的合法更新，记录稳态
    const steady = renders.slice()

    view.rerender(<Root />)
    for (let level = 0; level <= DEPTH; level++) {
      expect(renders[level] - steady[level]).toBe(1)
    }

    // 逐级合并仍然生效：最内层能看到从 root 一路传下来的 id
    expect(readProbe()).toEqual(expect.arrayContaining(['editor-0', `editor-${DEPTH}`, 'root-focus']))
  })

  it('获得焦点时注册当前 id，失焦时注销', () => {
    const boxRef = createRef<HTMLDivElement>()
    render(
      <ShortcutKeyFocusHook focusId={['focus-a']} boxRef={boxRef}>
        <FocusProbe />
      </ShortcutKeyFocusHook>,
    )

    act(() => boxRef.current!.focus())
    expect(getCurrentShortcutFocus()).toEqual(['focus-a'])

    act(() => boxRef.current!.blur())
    expect(getCurrentShortcutFocus()).toEqual([])
  })

  it('isUpdateFocus=false 时聚焦/失焦都不改写当前聚焦', () => {
    registerShortcutFocusHandle(['other'])

    const boxRef = createRef<HTMLDivElement>()
    render(<ShortcutKeyFocusHook focusId={['focus-a']} isUpdateFocus={false} boxRef={boxRef} />)

    act(() => boxRef.current!.focus())
    expect(getCurrentShortcutFocus()).toEqual(['other'])

    act(() => boxRef.current!.blur())
    expect(getCurrentShortcutFocus()).toEqual(['other'])
  })
})
