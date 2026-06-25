import { TFunction } from '@/i18n/useI18nNamespaces'
import { HTTPFlow } from '../HTTPFlowTable'
import { HTTPHistorySourcePageType } from '@/components/HTTPHistory'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { HTTPFlowDetail } from '@/components/HTTPFlowDetail'

export const onExpandHTTPFlow = (
  flow: HTTPFlow | undefined,
  onClosed: () => any,
  downstreamProxyStr: string,
  t?: TFunction,
  pageType?: HTTPHistorySourcePageType,
) => {
  if (!flow) {
    return (
      <YakitEmpty
        title={t?.('HTTPFlowTable.requestDetailsNotFound')}
      ></YakitEmpty>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <HTTPFlowDetail pageType={pageType} id={flow.Id} onClose={onClosed} downstreamProxyStr={downstreamProxyStr} />
    </div>
  )
}
