import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import type { MultipleNodeInfo } from '../../MainOperatorContentType'
import { resetSubPageKeepAliveForTests } from '@/utils/subPageKeepAlive'

vi.mock('@/routes/newRoute', () => ({ NoPaddingRoute: [] }))
vi.mock('@/store/fuzzerSequence', () => ({ useFuzzerSequence: () => [] }))
vi.mock('@/store/pageInfo', () => ({ usePageInfo: () => '' }))
vi.mock('../../PageItem', () => ({
  default: ({ params }: { params?: { id?: string } }) => <div data-testid={`page-${params?.id}`} />,
}))

import { RenderSubPage } from '../RenderSubPage'

const makeSubPages = (count: number): MultipleNodeInfo[] =>
  Array.from({ length: count }, (_, index) => {
    const id = `tab-${index + 1}`
    return { id, verbose: id, groupId: '0', sortFieId: index + 1, pageParams: { id } }
  })

/** 依次选中每个二级页签，模拟用户逐个打开后切走 */
const selectEachSubPage = (route: YakitRoute, count: number) => {
  const subPages = makeSubPages(count)
  const view = render(<RenderSubPage renderSubPage={subPages} route={route} selectSubMenuId={subPages[0].id} />)
  for (const subPage of subPages.slice(1)) {
    view.rerender(<RenderSubPage renderSubPage={subPages} route={route} selectSubMenuId={subPage.id} />)
  }
  return view
}

const mountedIds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-testid^="page-"]'), (ele) =>
    ele.getAttribute('data-testid')!.replace('page-', ''),
  )

describe('RenderSubPage keep-alive scope', () => {
  afterEach(() => {
    cleanup()
    resetSubPageKeepAliveForTests()
  })

  it('非 Web Fuzzer 路由的二级页签常驻，超出空闲上限也不淘汰', () => {
    const { container } = selectEachSubPage(YakitRoute.Mod_ScanPort, 10)
    expect(mountedIds(container)).toEqual(makeSubPages(10).map((item) => item.id))
  })

  it('Web Fuzzer 路由仍按空闲上限淘汰最久未访问的页签', () => {
    const { container } = selectEachSubPage(YakitRoute.HTTPFuzzer, 10)
    // 前台 tab-10 + 最近 6 个闲置 [tab-4..tab-9]，最旧的 tab-1..tab-3 已卸
    expect(mountedIds(container)).toEqual(
      makeSubPages(10)
        .slice(3)
        .map((item) => item.id),
    )
  })
})
