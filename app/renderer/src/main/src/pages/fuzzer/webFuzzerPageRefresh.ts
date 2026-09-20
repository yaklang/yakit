import type { WebFuzzerPageInfoProps } from '@/store/pageInfo'

export interface WebFuzzerPageRuntimeRefresh {
  request: string
  hotPatchCode: string
  advancedConfigValue: WebFuzzerPageInfoProps['advancedConfigValue']
  browserTransformSelection: WebFuzzerPageInfoProps['browserTransformSelection']
  refreshEditor: boolean
}

export interface WebFuzzerPageRuntimeTargets {
  requestRef: { current: string }
  hotPatchCodeRef: { current: string }
  isHttpsRef: { current: boolean }
  setAdvancedConfigValue: (value: WebFuzzerPageInfoProps['advancedConfigValue']) => void
  setBrowserTransformSelection: (value: WebFuzzerPageInfoProps['browserTransformSelection']) => void
  refreshEditor: () => void
}

/**
 * 将 page store 中的权威配置转换为 HTTPFuzzerPage 运行态刷新数据。
 * request / hotPatchCode 由 ref 持有，只有两者变化时才需要通知编辑器刷新；
 * 其余配置通过新的对象引用触发 React 子树更新。
 */
export const buildWebFuzzerPageRuntimeRefresh = (
  pageInfo: WebFuzzerPageInfoProps,
  currentRequest: string,
  currentHotPatchCode: string,
): WebFuzzerPageRuntimeRefresh => ({
  request: pageInfo.request,
  hotPatchCode: pageInfo.hotPatchCode,
  advancedConfigValue: { ...pageInfo.advancedConfigValue },
  browserTransformSelection: pageInfo.browserTransformSelection ? { ...pageInfo.browserTransformSelection } : undefined,
  refreshEditor: pageInfo.request !== currentRequest || pageInfo.hotPatchCode !== currentHotPatchCode,
})

/** 将刷新数据一次性应用到 HTTPFuzzerPage 的 refs 与 React state。 */
export const applyWebFuzzerPageRuntimeRefresh = (
  pageInfo: WebFuzzerPageInfoProps,
  targets: WebFuzzerPageRuntimeTargets,
) => {
  const refresh = buildWebFuzzerPageRuntimeRefresh(
    pageInfo,
    targets.requestRef.current,
    targets.hotPatchCodeRef.current,
  )
  targets.requestRef.current = refresh.request
  targets.hotPatchCodeRef.current = refresh.hotPatchCode
  targets.isHttpsRef.current = refresh.advancedConfigValue.isHttps
  targets.setAdvancedConfigValue(refresh.advancedConfigValue)
  targets.setBrowserTransformSelection(refresh.browserTransformSelection)
  if (refresh.refreshEditor) targets.refreshEditor()
}
