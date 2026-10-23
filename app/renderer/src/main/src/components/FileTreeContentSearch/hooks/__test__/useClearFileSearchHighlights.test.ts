import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useClearFileSearchHighlights } from '../useClearFileSearchHighlights'

describe('useClearFileSearchHighlights', () => {
  it('搜索结束与关闭面板时调用 onClear；首次 inactive 不触发', () => {
    const onClear = vi.fn()
    const { result, rerender } = renderHook(({ active }) => useClearFileSearchHighlights(active, onClear), {
      initialProps: { active: false },
    })
    expect(onClear).not.toHaveBeenCalled()

    rerender({ active: true })
    expect(onClear).not.toHaveBeenCalled()

    act(() => {
      result.current.onSearchSettled()
    })
    expect(onClear).toHaveBeenCalledTimes(1)

    rerender({ active: false })
    expect(onClear).toHaveBeenCalledTimes(2)
  })
})
