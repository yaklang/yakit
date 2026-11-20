import { describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import type { PageNodeItemProps } from '@/store/pageInfo'
import { patchPageHeaderVisibility, type PageHeaderVisibilityField } from '../pageHeaderVisibility'

const fields: PageHeaderVisibilityField[] = [
  'requestHeadersHidden',
  'responseHeadersHidden',
  'previewRequestHeadersHidden',
  'previewResponseHeadersHidden',
]

const makeItem = (overrides: Record<string, unknown> = {}) =>
  ({
    pageId: 'page-1',
    pageParamsInfo: {
      webFuzzerPageInfo: {
        request: 'GET / HTTP/1.1',
        hotPatchCode: 'patch',
        requestHeadersHidden: false,
        responseHeadersHidden: false,
        previewRequestHeadersHidden: false,
        previewResponseHeadersHidden: false,
        advancedConfigValue: {},
        ...overrides,
      },
    },
  }) as unknown as PageNodeItemProps

describe('patchPageHeaderVisibility', () => {
  it.each(fields)('只更新 %s 并保留页面其他字段', (field) => {
    const current = makeItem()
    const query = vi.fn(() => current)
    const update = vi.fn()
    patchPageHeaderVisibility('page-1', field, true, query, update)

    expect(query).toHaveBeenCalledWith(YakitRoute.HTTPFuzzer, 'page-1')
    expect(update).toHaveBeenCalledOnce()
    const [route, next] = update.mock.calls[0]
    expect(route).toBe(YakitRoute.HTTPFuzzer)
    expect(next).not.toBe(current)
    expect(next.pageParamsInfo.webFuzzerPageInfo[field]).toBe(true)
    expect(next.pageParamsInfo.webFuzzerPageInfo.request).toBe('GET / HTTP/1.1')
    expect(next.pageParamsInfo.webFuzzerPageInfo.hotPatchCode).toBe('patch')
    for (const other of fields.filter((item) => item !== field)) {
      expect(next.pageParamsInfo.webFuzzerPageInfo[other]).toBe(false)
    }
  })

  it('页面不存在或缺少 WebFuzzer 参数时不写入', () => {
    const update = vi.fn()
    patchPageHeaderVisibility('page-1', 'requestHeadersHidden', true, () => undefined, update)
    patchPageHeaderVisibility(
      'page-1',
      'requestHeadersHidden',
      true,
      () => ({ pageId: 'page-1', pageParamsInfo: {} }) as unknown as PageNodeItemProps,
      update,
    )
    patchPageHeaderVisibility('', 'requestHeadersHidden', true, vi.fn(), update)
    expect(update).not.toHaveBeenCalled()
  })
})
