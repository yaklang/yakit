import type React from 'react'
import { act, cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { pinSubPageKeepAlive, resetSubPageKeepAliveForTests, useSubPageKeepAlive } from '../subPageKeepAlive'

const makeView = (tabs: string[], maxIdle: number) => {
  const Panel: React.FC<{ id: string; active: boolean }> = ({ id, active }) => {
    const mounted = useSubPageKeepAlive({ scope: 'subpage:HTTPFuzzer', id, active, maxIdle })
    return mounted ? <div data-testid={`mounted-${id}`} /> : null
  }
  return ({ selected }: { selected: string }) => (
    <>
      {tabs.map((id) => (
        <Panel key={id} id={id} active={selected === id} />
      ))}
    </>
  )
}

describe('useSubPageKeepAlive', () => {
  afterEach(() => {
    cleanup()
    resetSubPageKeepAliveForTests()
  })

  it('keeps never-visited tabs unmounted', () => {
    const { result } = renderHook(() =>
      useSubPageKeepAlive({ scope: 'subpage:HTTPFuzzer', id: 'never-opened', active: false }),
    )
    expect(result.current).toBe(false)
  })

  it('evicts oldest hidden tabs when exceeding maxIdle and remounts on re-select', () => {
    const View = makeView(['t1', 't2', 't3', 't4', 't5', 't6'], 3)
    const { rerender, queryByTestId } = render(<View selected="t1" />)

    for (const id of ['t2', 't3', 't4', 't5']) {
      rerender(<View selected={id} />)
    }

    // 保留前台 t5 + 最近 3 个闲置 [t2, t3, t4]；最旧 t1 已卸，未访问 t6 不挂
    expect(queryByTestId('mounted-t1')).toBeNull()
    expect(queryByTestId('mounted-t2')).not.toBeNull()
    expect(queryByTestId('mounted-t3')).not.toBeNull()
    expect(queryByTestId('mounted-t4')).not.toBeNull()
    expect(queryByTestId('mounted-t5')).not.toBeNull()
    expect(queryByTestId('mounted-t6')).toBeNull()

    // 切回 t1：立刻挂回，并淘汰此时最旧的 t2
    rerender(<View selected="t1" />)
    expect(queryByTestId('mounted-t1')).not.toBeNull()
    expect(queryByTestId('mounted-t2')).toBeNull()
  })

  it('protects pinned tabs from eviction and evicts overflow once unpinned', () => {
    const View = makeView(['sending', 'a', 'b', 'c'], 2)
    const { rerender, queryByTestId } = render(<View selected="sending" />)

    let unpin = () => {}
    act(() => {
      unpin = pinSubPageKeepAlive('sending')
    })

    // 访问 a -> b -> c，sending 因加锁不被淘汰，idle=[a, b]
    rerender(<View selected="a" />)
    rerender(<View selected="b" />)
    rerender(<View selected="c" />)
    expect(queryByTestId('mounted-sending')).not.toBeNull()
    expect(queryByTestId('mounted-a')).not.toBeNull()
    expect(queryByTestId('mounted-b')).not.toBeNull()
    expect(queryByTestId('mounted-c')).not.toBeNull()

    // 解锁后 sending 进闲置池，超过上限 2，立即淘汰最旧的 a
    act(() => {
      unpin()
    })
    expect(queryByTestId('mounted-a')).toBeNull()
    expect(queryByTestId('mounted-b')).not.toBeNull()
    expect(queryByTestId('mounted-sending')).not.toBeNull()
    expect(queryByTestId('mounted-c')).not.toBeNull()
  })
})
