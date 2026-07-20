import { NoPaddingRoute, RouteToPageItem } from '@/routes/newRoute'
import React, { useEffect, useMemo, useRef } from 'react'
import { useMap, useMemoizedFn } from 'ahooks'
import styles from './RenderSubPage.module.scss'
import { PageItemProps, RenderFuzzerSequenceProps, RenderSubPageProps } from './RenderSubPageType'
import FuzzerSequence from '@/pages/fuzzer/FuzzerSequence/FuzzerSequence'
import { useFuzzerSequence } from '@/store/fuzzerSequence'
import { PageLoading } from '@ant-design/pro-layout'
import { usePageInfo } from '@/store/pageInfo'
import { YakitRoute } from '@/enums/yakitRoute'
import { shallow } from 'zustand/shallow'
import { MultipleNodeInfo } from '../MainOperatorContentType'

const FuzzerSequenceWrapper = React.lazy(() => import('@/pages/fuzzer/WebFuzzerPage/FuzzerSequenceWrapper'))

const EMPTY_FUZZER_SEQUENCE_LIST: never[] = []

/** 单个二级页签面板：display 切换不触发 PageItem 重渲染 */
const RenderSubPagePanel = React.memo(
  ({ route, subItem, isSelected }: { route: YakitRoute; subItem: MultipleNodeInfo; isSelected: boolean }) => (
    <div
      id={subItem.id}
      tabIndex={isSelected ? 1 : -1}
      style={{
        display: isSelected ? '' : 'none',
        padding: NoPaddingRoute.includes(route) ? 0 : '8px 16px 13px 16px',
      }}
      className={styles['page-body']}
    >
      <PageItem routeKey={route} params={subItem.pageParams} />
    </div>
  ),
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.route === next.route &&
    prev.subItem.id === next.subItem.id &&
    prev.subItem.pageParams === next.subItem.pageParams,
)

export const RenderSubPage: React.FC<RenderSubPageProps> = React.memo(
  (props) => {
    const { renderSubPage, route, selectSubMenuId = '0' } = props
    const pageRenderListRef = useRef<Map<string, boolean>>(new Map<string, boolean>())
    const pageRenderList = useMemo(() => {
      if (selectSubMenuId === '0') return pageRenderListRef.current
      pageRenderListRef.current.set(selectSubMenuId, true)
      return pageRenderListRef.current
    }, [selectSubMenuId])
    return (
      <>
        {renderSubPage.map((subItem) => {
          return (
            pageRenderList.get(subItem.id) && (
              <RenderSubPagePanel
                key={subItem.id}
                route={route}
                subItem={subItem}
                isSelected={selectSubMenuId === subItem.id}
              />
            )
          )
        })}
      </>
    )
  },
  (preProps, nextProps) => {
    if (preProps.renderSubPage.length !== nextProps.renderSubPage.length) {
      return false
    }
    if (preProps.selectSubMenuId !== nextProps.selectSubMenuId) {
      return false
    }
    if (preProps.route !== nextProps.route) {
      return false
    }
    return true
  },
)

export const RenderFuzzerSequence: React.FC<RenderFuzzerSequenceProps> = React.memo((props) => {
  const { route, type, setType } = props
  const isWebFuzzerRoute = route === YakitRoute.HTTPFuzzer
  const isSequenceOrConcurrencyType = ['sequence', 'concurrency'].includes(type)

  const [pageSequenceRenderList, { set: setPageSequenceRenderList, get: getPageSequenceRenderList }] = useMap<
    string,
    boolean
  >(new Map<string, boolean>())
  const fuzzerSequenceList = useFuzzerSequence(
    (s) => (isWebFuzzerRoute ? s.fuzzerSequenceList : EMPTY_FUZZER_SEQUENCE_LIST),
    shallow,
  )
  const selectGroupId = usePageInfo(
    (s) => (isWebFuzzerRoute ? s.selectGroupId.get(YakitRoute.HTTPFuzzer) || '' : ''),
    shallow,
  )
  useEffect(() => {
    if (!isWebFuzzerRoute) return
    updateRender(selectGroupId)
  }, [type, selectGroupId, isWebFuzzerRoute])
  const updateRender = useMemoizedFn((id: string) => {
    if (getPageSequenceRenderList(id)) return
    if (isSequenceOrConcurrencyType && id !== '0') {
      setPageSequenceRenderList(id, true)
    }
  })
  if (!isWebFuzzerRoute) {
    return null
  }
  return (
    <div
      className={styles['fuzzer-sequence-list']}
      tabIndex={isSequenceOrConcurrencyType ? 1 : -1}
      style={{ display: isSequenceOrConcurrencyType ? '' : 'none' }}
    >
      {fuzzerSequenceList.map(
        (ele) =>
          getPageSequenceRenderList(ele.groupId) && (
            <div
              key={ele.groupId}
              className={styles['fuzzer-sequence-list-item']}
              style={{ display: selectGroupId === ele.groupId ? '' : 'none' }}
            >
              <React.Suspense fallback={<PageLoading />}>
                <FuzzerSequenceWrapper type={type}>
                  <FuzzerSequence groupId={ele.groupId} setType={setType} type={type} />
                </FuzzerSequenceWrapper>
              </React.Suspense>
            </div>
          ),
      )}
    </div>
  )
})

const PageItem: React.FC<PageItemProps> = React.memo(
  (props) => {
    return <RouteToPageItem {...props} />
  },
  (preProps, nextProps) => {
    if (preProps.routeKey !== nextProps.routeKey) return false
    if (preProps.yakScriptId !== nextProps.yakScriptId) return false
    return true
  },
)

export default PageItem
