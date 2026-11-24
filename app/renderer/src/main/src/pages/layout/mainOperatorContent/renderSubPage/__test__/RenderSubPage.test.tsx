import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import { resetSubPageKeepAliveForTests } from '@/utils/subPageKeepAlive'
import type { MultipleNodeInfo } from '../../MainOperatorContentType'

vi.mock('@/routes/newRoute', () => ({ NoPaddingRoute: [] }))
vi.mock('@/store/fuzzerSequence', () => ({ useFuzzerSequence: () => [] }))
vi.mock('@/store/pageInfo', () => ({ usePageInfo: () => '' }))
vi.mock('../../PageItem', () => ({
  default: ({ params }: { params?: { id?: string } }) => <div data-testid={`page-${params?.id}`} />,
}))

import { RenderSubPage } from '../RenderSubPage'

const makeTabs = (ids: string[]): MultipleNodeInfo[] =>
  ids.map((id, idx) => ({
    id,
    verbose: id,
    groupId: '0',
    sortFieId: idx + 1,
    pageParams: { id },
  }))

describe('RenderSubPage', () => {
  afterEach(() => {
    cleanup()
    resetSubPageKeepAliveForTests()
  })

  it('caps mounted HTTPFuzzer sub-pages at 7 (1 active + 6 idle) and remounts evicted tab on re-select', () => {
    const ids = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']
    const tabs = makeTabs(ids)
    const { rerender, queryByTestId } = render(
      <RenderSubPage renderSubPage={tabs} route={YakitRoute.HTTPFuzzer} selectSubMenuId="t1" />,
    )

    for (const id of ids.slice(1)) {
      rerender(<RenderSubPage renderSubPage={tabs} route={YakitRoute.HTTPFuzzer} selectSubMenuId={id} />)
    }

    // t1 是最久未访问页签，已被淘汰；其余 7 个（t2..t8）保持挂载
    expect(queryByTestId('page-t1')).toBeNull()
    for (const id of ids.slice(1)) {
      expect(queryByTestId(`page-${id}`)).not.toBeNull()
    }

    // 重新选中 t1：立即挂回，并淘汰此时最旧的 t2
    rerender(<RenderSubPage renderSubPage={tabs} route={YakitRoute.HTTPFuzzer} selectSubMenuId="t1" />)
    expect(queryByTestId('page-t1')).not.toBeNull()
    expect(queryByTestId('page-t2')).toBeNull()
  })

  it('keeps non-HTTPFuzzer sub-pages mounted without LRU eviction', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const tabs = makeTabs(ids)
    const { rerender, queryByTestId } = render(
      <RenderSubPage renderSubPage={tabs} route={YakitRoute.Mod_ScanPort} selectSubMenuId="p1" />,
    )

    for (const id of ids.slice(1)) {
      rerender(<RenderSubPage renderSubPage={tabs} route={YakitRoute.Mod_ScanPort} selectSubMenuId={id} />)
    }

    for (const id of ids) {
      expect(queryByTestId(`page-${id}`)).not.toBeNull()
    }
  })

  it('prunes closed tabs from pageRenderList and does not re-add stale selectSubMenuId', () => {
    const tabs = makeTabs(['a', 'b'])
    const { rerender, queryByTestId } = render(
      <RenderSubPage renderSubPage={tabs} route={YakitRoute.HTTPFuzzer} selectSubMenuId="a" />,
    )
    rerender(<RenderSubPage renderSubPage={tabs} route={YakitRoute.HTTPFuzzer} selectSubMenuId="b" />)
    expect(queryByTestId('page-a')).not.toBeNull()
    expect(queryByTestId('page-b')).not.toBeNull()

    // 关闭 a 并同时新增 c（总长度不变），即使 selectSubMenuId 短暂仍指向 a 也不应残留
    const nextTabs = makeTabs(['b', 'c'])
    rerender(<RenderSubPage renderSubPage={nextTabs} route={YakitRoute.HTTPFuzzer} selectSubMenuId="a" />)
    expect(queryByTestId('page-a')).toBeNull()
    expect(queryByTestId('page-b')).not.toBeNull()
    expect(queryByTestId('page-c')).toBeNull()
  })
})
