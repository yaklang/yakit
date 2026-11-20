import { YakitRoute } from '@/enums/yakitRoute'
import type { PageNodeItemProps } from '@/store/pageInfo'

export type PageHeaderVisibilityField =
  | 'requestHeadersHidden'
  | 'responseHeadersHidden'
  | 'previewRequestHeadersHidden'
  | 'previewResponseHeadersHidden'

/** 把某个页签的头部隐藏状态写回页面缓存，只更新指定字段。 */
export const patchPageHeaderVisibility = (
  pageId: string,
  field: PageHeaderVisibilityField,
  hidden: boolean,
  queryPagesDataById: (route: YakitRoute, id: string) => PageNodeItemProps | undefined,
  updatePagesDataCacheById: (route: YakitRoute, item: PageNodeItemProps) => void,
) => {
  if (!pageId) return
  const current = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
  if (!current?.pageParamsInfo.webFuzzerPageInfo) return
  updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {
    ...current,
    pageParamsInfo: {
      ...current.pageParamsInfo,
      webFuzzerPageInfo: {
        ...current.pageParamsInfo.webFuzzerPageInfo,
        [field]: hidden,
      },
    },
  })
}
