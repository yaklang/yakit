import { useEffect } from 'react'
import { useMemoizedFn } from 'ahooks'
import { showResponseViaHTTPFlowID } from '@/components/ShowInBrowser'
import type { codecHistoryPluginProps, HTTPFlow } from '@/components/HTTPFlowTable/HTTPFlowTable.constants'
import type { SingleManualHijackInfoMessage } from '@/pages/mitm/MITMHacker/utils'
import { generateCSRFPocByRequest } from '@/pages/invoker/fromPacketToYakCode'
import { newWebsocketFuzzerTab } from '@/pages/websocket/WebsocketFuzzer'
import { setClipboardText } from '@/utils/clipboard'
import { ShortcutKeyFocusType } from '@/utils/globalShortcutKey/events/global'
import { YakitMultipleShortcutKey } from '@/utils/globalShortcutKey/events/multiple/yakitMultiple'
import useShortcutKeyTrigger from '@/utils/globalShortcutKey/events/useShortcutKeyTrigger'
import {
  convertKeyEventToKeyCombination,
  getCurrentShortcutFocus,
  getIsActiveShortcutKeyPage,
} from '@/utils/globalShortcutKey/utils'
import { openExternalWebsite } from '@/utils/openWebsite'
import { yakitNotify } from '@/utils/notification'
import type { YakDeleteHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import { runContextMenuAction } from '@/pages/manageRightClickPlugins/runContextMenuAction'
import { ContextMenuExecutionType, type ContextMenuHttpsState } from '@/pages/manageRightClickPlugins/types'
import { matchContextMenuShortcut } from '@/pages/manageRightClickPlugins/shortcut'
import emiter from '@/utils/eventBus/eventBus'
import { hydrateHTTPFlowRequest } from './HTTPFlowTable.packet'
import { HTTP_FLOW_TABLE_BATCH_MAX_ROWS, resolveHTTPFlowTableBatchSelection } from './HTTPFlowTable.utils'

const isMonacoFocused = (focus?: string[] | null) =>
  (focus || []).some((item) => item.startsWith(ShortcutKeyFocusType.Monaco))

/** 焦点在输入框/文本域/富文本等可编辑元素时，不拦截插件快捷键 */
const isEditableTarget = (target: EventTarget | null) => {
  if (!target) return false
  const el = target as HTMLElement
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export interface UseHTTPFlowTableShortcutKeysOptions {
  inViewport: boolean
  getSelected: () => HTTPFlow | undefined
  getSelectedRows: () => HTTPFlow[]
  getSelectedRowKeys: () => (string | number)[]
  getIsAllSelect: () => boolean
  getTotal: () => number
  onClearSelection: () => void
  singlePlugins: codecHistoryPluginProps[]
  multiplePlugins: codecHistoryPluginProps[]
  pageType?: string
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
    getSelectedRows,
    getSelectedRowKeys,
    getIsAllSelect,
    getTotal,
    onClearSelection,
    singlePlugins,
    multiplePlugins,
    pageType,
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

  const runWithRequestPacket = (flow: HTTPFlow, action: (hydrated: HTTPFlow) => void | Promise<void>) => {
    hydrateHTTPFlowRequest(flow)
      .then(action)
      .catch((error) => yakitNotify('error', `Query HTTPFlow failed: ${error}`))
  }

  const runPluginByShortcut = useMemoizedFn((plugin: codecHistoryPluginProps, rows: HTTPFlow[]) => {
    const ids = rows.map((item) => item.Id)
    if (plugin.executionType === ContextMenuExecutionType.ContextMenu && plugin.action) {
      const httpsValues = new Set(rows.map((item) => !!item.IsHTTPS))
      let httpsState: ContextMenuHttpsState = 'unknown'
      if (httpsValues.size > 1) httpsState = 'mixed'
      else if (httpsValues.size === 1) httpsState = httpsValues.has(true) ? 'https' : 'http'

      runContextMenuAction({
        action: plugin.action,
        configureParams: false,
        request: {
          Source: pageType || 'History',
          Trigger: 'shortcut',
          HttpsState: httpsState,
          HTTPFlowIDs: ids.map((item) => Number(item)),
          HasRequest: false,
          HasResponse: false,
          PacketRevision: '',
        },
      })
      return
    }
    emiter.emit(
      'onOpenFuzzerModal',
      JSON.stringify({
        text: ids.join(','),
        scriptName: plugin.key,
        params: plugin.params,
        isAiPlugin: plugin.isAiPlugin,
        isExec: true,
      }),
    )
  })

  const onContextMenuPluginKeyDown = useMemoizedFn((ev: KeyboardEvent) => {
    if (getIsActiveShortcutKeyPage()) return
    if (isMonacoFocused(getCurrentShortcutFocus())) return
    if (isEditableTarget(ev.target)) return
    const keys = convertKeyEventToKeyCombination(ev)
    if (!keys) return

    const selectedKeys = getSelectedRowKeys()
    const isAllSelect = getIsAllSelect()
    const isMultiple = selectedKeys.length > 1
    const plugins = isMultiple ? multiplePlugins : singlePlugins
    if (!plugins.length) return

    const hit = plugins.find((plugin) => matchContextMenuShortcut(keys, plugin.shortcut || plugin.action?.Shortcut))
    if (!hit) return

    ev.preventDefault()
    ev.stopImmediatePropagation()

    let rows: HTTPFlow[] = []
    if (isMultiple) {
      const resolved = resolveHTTPFlowTableBatchSelection({
        selectedRowKeys: selectedKeys.map(String),
        selectedRows: getSelectedRows(),
        isAllSelect,
        total: getTotal(),
      })
      if (!resolved.ok) {
        yakitNotify('warning', t('HTTPFlowTable.maxSendData', { number: HTTP_FLOW_TABLE_BATCH_MAX_ROWS }))
        return
      }
      rows = resolved.rows
    } else {
      const selected = getSelected()
      if (selected) rows = [selected]
    }
    if (!rows.length) return
    runPluginByShortcut(hit, rows)
    if (isAllSelect || isMultiple) onClearSelection()
  })
  // 右键插件 Shortcut：capture 阶段优先匹配，避免被全局快捷键吞掉
  useEffect(() => {
    if (!inViewport) return
    document.addEventListener('keydown', onContextMenuPluginKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onContextMenuPluginKeyDown, true)
    }
  }, [inViewport, onContextMenuPluginKeyDown])

  useShortcutKeyTrigger('sendAndJump*common', (focus) => {
    const selected = getSelected?.()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    runWithRequestPacket(selected, (hydrated) =>
      hydrated.IsWebsocket
        ? newWebsocketFuzzerTab(hydrated.IsHTTPS, hydrated.Request)
        : onSendToTab(hydrated, true, downstreamProxyStr, fromMITM),
    )
  })

  useShortcutKeyTrigger('send*common', (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    runWithRequestPacket(selected, (hydrated) =>
      hydrated.IsWebsocket
        ? newWebsocketFuzzerTab(hydrated.IsHTTPS, hydrated.Request, false)
        : onSendToTab(hydrated, false, downstreamProxyStr, fromMITM),
    )
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
    runWithRequestPacket(selected, (hydrated) =>
      generateCSRFPocByRequest(hydrated.Request, hydrated.IsHTTPS, (e) => setClipboardText(e), false),
    )
  })

  useShortcutKeyTrigger(YakitMultipleShortcutKey.TableCopyAsCsrfPocAutoSubmit, (focus) => {
    const selected = getSelected()
    if (!inViewport || !selected || isMonacoFocused(focus)) return
    runWithRequestPacket(selected, (hydrated) =>
      generateCSRFPocByRequest(hydrated.Request, hydrated.IsHTTPS, (e) => setClipboardText(e), true),
    )
  })
}
