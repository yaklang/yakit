import { showResponseViaHTTPFlowID } from '@/components/ShowInBrowser'
import type { HTTPFlow } from '@/components/HTTPFlowTable/HTTPFlowTable.constants'
import type { SingleManualHijackInfoMessage } from '@/pages/mitm/MITMHacker/utils'
import { generateCSRFPocByRequest } from '@/pages/invoker/fromPacketToYakCode'
import { newWebsocketFuzzerTab } from '@/pages/websocket/WebsocketFuzzer'
import { setClipboardText } from '@/utils/clipboard'
import { ShortcutKeyFocusType } from '@/utils/globalShortcutKey/events/global'
import { YakitMultipleShortcutKey } from '@/utils/globalShortcutKey/events/multiple/yakitMultiple'
import useShortcutKeyTrigger from '@/utils/globalShortcutKey/events/useShortcutKeyTrigger'
import { openExternalWebsite } from '@/utils/openWebsite'
import { yakitNotify } from '@/utils/notification'
import type { YakDeleteHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'

const isMonacoFocused = (focus?: string[] | null) =>
  (focus || []).some((item) => item.startsWith(ShortcutKeyFocusType.Monaco))

export interface UseHTTPFlowTableShortcutKeysOptions {
  inViewport: boolean
  getSelected: () => HTTPFlow | undefined
  downstreamProxyStr: string
  fromMITM: boolean
  t: (...args: any[]) => any
  getUrlWithoutQuery: (url?: string) => string
  onSendToTab: (
    rowData?: HTTPFlow | SingleManualHijackInfoMessage,
    openFlag?: boolean,
    downstreamProxyStr?: string,
    fromMITM?: boolean,
  ) => Promise<void>
  onShieldRecord: (v: HTTPFlow) => void
  onShieldURL: (v: HTTPFlow) => void
  onShieldDomain: (v: HTTPFlow) => void
  onRemoveHttpHistory: (query: YakDeleteHTTPFlowRequest) => void
}

export const useHTTPFlowTableShortcutKeys = (options: UseHTTPFlowTableShortcutKeysOptions) => {
  const {
    inViewport,
    getSelected,
    downstreamProxyStr,
    fromMITM,
    t,
    getUrlWithoutQuery,
    onSendToTab,
    onShieldRecord,
    onShieldURL,
    onShieldDomain,
    onRemoveHttpHistory,
  } = options

  useShortcutKeyTrigger('sendAndJump*common', (focus) => {
    const selected = getSelected?.()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    selected.IsWebsocket
      ? newWebsocketFuzzerTab(selected.IsHTTPS, selected.Request)
      : onSendToTab(selected, true, downstreamProxyStr, fromMITM)
  })

  useShortcutKeyTrigger('send*common', (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    selected.IsWebsocket
      ? newWebsocketFuzzerTab(selected.IsHTTPS, selected.Request, false)
      : onSendToTab(selected, false, downstreamProxyStr, fromMITM)
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableCopyUrlWithQuery, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    setClipboardText(selected.Url || '')
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableCopyUrlWithoutQuery, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    const nextUrl = getUrlWithoutQuery(selected.Url)
    if (!nextUrl) {
      yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.urlNotExist'))
      return
    }
    setClipboardText(nextUrl)
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableOpenUrlInBrowser, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    selected.Url && openExternalWebsite(selected.Url)
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableViewResponseInBrowser, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    showResponseViaHTTPFlowID(selected)
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableBlockRecord, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    onShieldRecord(selected)
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableBlockURL, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    onShieldURL(selected)
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableBlockDomain, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    onShieldDomain(selected)
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableDeleteRecord, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    onRemoveHttpHistory({ Id: [selected.Id] })
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableDeleteURL, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    onRemoveHttpHistory({ URLPrefix: selected.Url })
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableDeleteDomain, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    onRemoveHttpHistory({ URLPrefix: selected?.HostPort?.split(':')[0] })
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableCopyAsCsrfPocBasic, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    generateCSRFPocByRequest(selected.Request, selected.IsHTTPS, (e) => setClipboardText(e), false)
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableCopyAsCsrfPocAutoSubmit, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    generateCSRFPocByRequest(selected.Request, selected.IsHTTPS, (e) => setClipboardText(e), true)
  })
}
