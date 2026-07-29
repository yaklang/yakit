import React, { useMemo } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { IconSolidAIIcon, IconSolidAIWhiteIcon } from '@/assets/icon/colors'
import { showResponseViaHTTPFlowID } from '@/components/ShowInBrowser'
import { showByRightContext } from '@/components/yakitUI/YakitMenu/showByRightContext'
import { setClipboardText } from '@/utils/clipboard'
import emiter from '@/utils/eventBus/eventBus'
import { isEnpriTrace } from '@/utils/envfile'
import { getGlobalShortcutKeyEvents, GlobalShortcutKey } from '@/utils/globalShortcutKey/events/global'
import {
  getYakitMultipleShortcutKeyEvents,
  YakitMultipleShortcutKey,
} from '@/utils/globalShortcutKey/events/multiple/yakitMultiple'
import { convertKeyboardToUIKey } from '@/utils/globalShortcutKey/utils'
import { debugToPrintLogs } from '@/utils/logCollection'
import { yakitNotify } from '@/utils/notification'
import { openExternalWebsite, saveABSFileToOpen } from '@/utils/openWebsite'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import type { i18n as I18nInstance } from 'i18next'
import { generateCSRFPocByRequest } from '@/pages/invoker/fromPacketToYakCode'
import { GetPacketScanByCursorMenuItem, packetScanDefaultValue } from '@/pages/packetScanner/DefaultPacketScanGroup'
import { execPacketScan } from '@/pages/packetScanner/PacketScanner'
import { newWebsocketFuzzerTab } from '@/pages/websocket/WebsocketFuzzer'
import { availableColors } from './HTTPFlowTable.availableColors'
import {
  CalloutColor,
  calloutColorBatch,
  onBatchExecPacketScan,
  onRemoveCalloutColor,
  onRemoveCalloutColorBatch,
  onSendToTab,
  toggleHTTPFlowFavorite,
  toggleHTTPFlowFavoriteBatch,
} from './HTTPFlowTable.actions'
import type { HistoryMenuData, HTTPFlow } from './HTTPFlowTable.constants'
import { isHTTPFlowFavorite } from './HTTPFlowTable.utils'
import style from './HTTPFlowTable.module.scss'
import { PLUGIN_PREFIX } from '../yakitUI/YakitEditor/YakitEditor'

const { ipcRenderer } = window.require('electron')

export interface UseHTTPFlowTableContextMenuOptions {
  t: TFunction
  i18n: I18nInstance
  userInfo: { isLogin: boolean }
  data: HTTPFlow[]
  setData: React.Dispatch<React.SetStateAction<HTTPFlow[]>>
  onlyFavorite: boolean
  selected: HTTPFlow | undefined
  selectedRowKeys: string[]
  selectedRows: HTTPFlow[]
  isAllSelect: boolean
  total: number
  downstreamProxyStr: string
  fromMITM: boolean
  setSelected: (row: HTTPFlow) => void
  setSelectedRowKeys: (keys: string[]) => void
  setSelectedRows: (rows: HTTPFlow[]) => void
  setBatchVisible: (visible: boolean) => void
  setCompareLeft: (value: { content: string; language: string }) => void
  setCompareRight: (value: { content: string; language: string }) => void
  getUrlWithoutQuery: (url?: string) => string
  getCodecHistoryPlugin: () => HistoryMenuData[]
  codecMultipleHistoryPluginCom: unknown
  codecSingleHistoryPluginCom: unknown
  selectedRowKeysCom: unknown
  onRemoveHttpHistory: (query: Record<string, unknown>) => void
  onShareData: (ids: string[], number: number) => void
  onUploadData: (ids: string[]) => void
  onEditTags: (flow: HTTPFlow) => void
  onHTTPFlowTableRowDoubleClick: (flow: HTTPFlow) => void
  onExcelExport: (list: HTTPFlow[]) => void
  onHarExport: (ids: number[]) => void
  onPocMould: (flow: HTTPFlow) => void
  onBatchPocMould: (flow: HTTPFlow) => void
  onShieldRecord: (flow: HTTPFlow) => void
  onShieldURL: (flow: HTTPFlow) => void
  onShieldDomain: (flow: HTTPFlow) => void
  onBatch: (f: (element: HTTPFlow) => void, number: number, all?: boolean) => void
  onViewAttachmentDataRefresh: (id: number) => void
}

export const useHTTPFlowTableContextMenu = (options: UseHTTPFlowTableContextMenuOptions) => {
  const {
    t,
    i18n,
    userInfo,
    data,
    setData,
    onlyFavorite,
    selected,
    selectedRowKeys,
    selectedRows,
    isAllSelect,
    total,
    downstreamProxyStr,
    fromMITM,
    setSelected,
    setSelectedRowKeys,
    setSelectedRows,
    setBatchVisible,
    setCompareLeft,
    setCompareRight,
    getUrlWithoutQuery,
    getCodecHistoryPlugin,
    codecMultipleHistoryPluginCom,
    codecSingleHistoryPluginCom,
    selectedRowKeysCom,
    onRemoveHttpHistory,
    onShareData,
    onUploadData,
    onEditTags,
    onHTTPFlowTableRowDoubleClick,
    onExcelExport,
    onHarExport,
    onPocMould,
    onBatchPocMould,
    onShieldRecord,
    onShieldURL,
    onShieldDomain,
    onBatch,
    onViewAttachmentDataRefresh,
  } = options

  const menuData = useMemo(() => {
    let menu: HistoryMenuData[] = [
      {
        key: 'sendToWebFuzzerKey',
        label: t('HTTPFlowTable.RowContextMenu.sendToWebFuzzer'),
        number: 10,
        default: true,
        webSocket: false,
        children: [
          {
            key: 'sendAndJumpToWebFuzzer',
            label: t('HTTPFlowTable.RowContextMenu.sendAndRedirect'),
            keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendAndJumpToWebFuzzer].keys,
          },
          {
            key: 'sendToWebFuzzer',
            label: t('HTTPFlowTable.RowContextMenu.sendOnly'),
            keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendToWebFuzzer].keys,
          },
        ],
        onClickBatch: (list, n) => {
          onBatch((el) => onSendToTab(el, true, downstreamProxyStr, fromMITM), n!, list.length === total)
        },
        onClickSingle: (v) => onSendToTab(v, true, downstreamProxyStr, fromMITM),
      },
      {
        key: 'sendToWSFuzzer',
        label: t('HTTPFlowTable.RowContextMenu.sendToWSFuzzer'),
        number: 10,
        webSocket: true,
        default: false,
        children: [
          {
            key: 'sendAndJumpToWS',
            label: t('HTTPFlowTable.RowContextMenu.sendAndRedirect'),
            keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendAndJumpToWebFuzzer].keys,
          },
          {
            key: 'sendToWS',
            label: t('HTTPFlowTable.RowContextMenu.sendOnly'),
            keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendToWebFuzzer].keys,
          },
        ],
        onClickBatch: (list, n) => {
          onBatch((el) => newWebsocketFuzzerTab(el.IsHTTPS, el.Request), n!, list.length === total)
        },
        onClickSingle: (v) => newWebsocketFuzzerTab(v.IsHTTPS, v.Request),
      },
      {
        key: 'favorite',
        label: t('HTTPFlowTable.RowContextMenu.favorite'),
        default: true,
        webSocket: true,
        number: 20,
        onClickSingle: (v) => toggleHTTPFlowFavorite(v, !isHTTPFlowFavorite(v), setData, onlyFavorite),
        onClickBatch: (list, n) =>
          toggleHTTPFlowFavoriteBatch({
            flowList: list,
            number: n!,
            favorite: true,
            data,
            onlyFavorite,
            setData,
            setSelectedRowKeys,
            setSelectedRows,
            t,
          }),
      },
      {
        key: 'cancelFavorite',
        label: t('HTTPFlowTable.RowContextMenu.cancelFavorite'),
        default: false,
        webSocket: false,
        number: 20,
        onClickBatch: (list, n) =>
          toggleHTTPFlowFavoriteBatch({
            flowList: list,
            number: n!,
            favorite: false,
            data,
            onlyFavorite,
            setData,
            setSelectedRowKeys,
            setSelectedRows,
            t,
          }),
      },
      {
        key: 'packetScan',
        label: t('HTTPFlowTable.RowContextMenu.packetScan'),
        number: 200,
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        onClickBatch: () => {},
        children: GetPacketScanByCursorMenuItem(selected?.Id || 0)?.subMenuItems?.map((ele) => ({
          key: ele.title,
          label: t(ele.title),
        })),
      },
      {
        key: 'pluginExtension',
        label: t('HTTPFlowTable.RowContextMenu.pluginExtension'),
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        onClickBatch: () => {},
        children: getCodecHistoryPlugin(),
      },
      {
        key: 'copyUrl',
        label: t('HTTPFlowTable.RowContextMenu.copyURL'),
        number: 30,
        webSocket: true,
        default: true,
        onClickSingle: (v) => setClipboardText(v.Url || ''),
        onClickBatch: (v, number) => {
          if (v.length === 0) {
            yakitNotify('warning', t('HTTPFlowTable.pleaseSelectData'))
            return
          }
          if (v.length < number!) {
            setClipboardText(v.map((ele) => `${ele.Url}`).join('\r\n'))
            setSelectedRowKeys([])
            setSelectedRows([])
          } else {
            yakitNotify('warning', t('HTTPFlowTable.copyLimit', { number }))
          }
        },
        children: [
          {
            key: 'copyUrlWithQuery',
            label: t('YakitEditor.HTTPPacketYakitEditor.copyUrlWithQuery'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableCopyUrlWithQuery].keys,
          },
          {
            key: 'copyUrlWithoutQuery',
            label: t('YakitEditor.HTTPPacketYakitEditor.copyUrlWithoutQuery'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableCopyUrlWithoutQuery].keys,
          },
        ],
      },
      {
        key: 'downloadResponseBody',
        label: t('HTTPFlowTable.RowContextMenu.downloadResponseBody'),
        default: true,
        webSocket: false,
        onClickSingle: (v) => {
          ipcRenderer.invoke('GetResponseBodyByHTTPFlowID', { Id: v.Id }).then((bytes: { Raw: Uint8Array }) => {
            saveABSFileToOpen(`response-body.txt`, bytes.Raw)
          })
        },
      },
      {
        key: 'viewInBrowser',
        label: t('HTTPFlowTable.RowContextMenu.viewInBrowser'),
        default: true,
        webSocket: false,
        onClickSingle: (v) => {
          showResponseViaHTTPFlowID(v)
        },
        children: [
          {
            key: 'viewResponseInBrowser',
            label: t('HTTPFlowTable.RowContextMenu.viewResponseInBrowser'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableViewResponseInBrowser].keys,
          },
          {
            key: 'openURLInBrowser',
            label: t('HTTPFlowTable.RowContextMenu.openURLInBrowser'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableOpenUrlInBrowser].keys,
          },
        ],
      },
      {
        key: 'copyAsCSRFPoc',
        label: t('YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPoc'),
        default: true,
        webSocket: false,
        onClickSingle: (v) => {
          generateCSRFPocByRequest(v.Request, v.IsHTTPS, (e) => setClipboardText(e), false)
        },
        children: [
          {
            key: 'csrfpoc',
            label: t('YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPocBasic'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableCopyAsCsrfPocBasic].keys,
          },
          {
            key: 'auto-submit-csrf-poc',
            label: t('YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPocAutoSubmit'),
            keybindings:
              getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableCopyAsCsrfPocAutoSubmit].keys,
          },
        ],
      },
      {
        key: 'copyAsYakPoCTemplate',
        label: t('HTTPFlowTable.RowContextMenu.copyAsYakPoCTemplate'),
        default: true,
        webSocket: false,
        onClickSingle: (v) => onPocMould(v),
        children: [
          {
            key: 'packetPoCTemplate',
            label: t('HTTPFlowTable.RowContextMenu.packetPoCTemplate'),
          },
          {
            key: 'batchTestPoCTemplate',
            label: t('HTTPFlowTable.RowContextMenu.batchTestPoCTemplate'),
          },
        ],
      },
      {
        key: 'tagColor',
        label: t('HTTPFlowTable.RowContextMenu.tagColor'),
        default: true,
        webSocket: false,
        number: 20,
        onClickSingle: () => {},
        onClickBatch: () => {},
        children: availableColors.map((i) => {
          return {
            key: i.title,
            label: i.render(t),
            onClick: (v) => CalloutColor(v, i, data, setData),
            onClickBatch: (list, n) =>
              calloutColorBatch({
                flowList: list,
                number: n!,
                colorItem: i,
                data,
                setData,
                setSelectedRowKeys,
                setSelectedRows,
                t,
              }),
          }
        }),
      },
      {
        key: 'removeColor',
        label: t('HTTPFlowTable.RowContextMenu.removeColor'),
        default: true,
        webSocket: false,
        number: 20,
        onClickSingle: (v) => onRemoveCalloutColor(v, data, setData),
        onClickBatch: (list, n) =>
          onRemoveCalloutColorBatch({
            flowList: list,
            number: n!,
            data,
            setData,
            setSelectedRowKeys,
            setSelectedRows,
            t,
          }),
      },
      {
        key: 'sendToComparer',
        label: t('HTTPFlowTable.RowContextMenu.sendToComparer'),
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        children: [
          {
            key: 'sendToComparerLeft',
            label: t('HTTPFlowTable.RowContextMenu.sendToComparerLeft'),
          },
          {
            key: 'sendToComparerRight',
            label: t('HTTPFlowTable.RowContextMenu.sendToComparerRight'),
          },
        ],
      },
      {
        key: 'block',
        label: t('HTTPFlowTable.RowContextMenu.block'),
        webSocket: true,
        default: true,
        onClickSingle: (v) => onShieldRecord(v),
        children: [
          {
            key: 'blockRecord',
            label: t('HTTPFlowTable.RowContextMenu.blockRecord'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableBlockRecord].keys,
          },
          {
            key: 'blockURL',
            label: t('HTTPFlowTable.RowContextMenu.blockURL'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableBlockURL].keys,
          },
          {
            key: 'blockDomain',
            label: t('HTTPFlowTable.RowContextMenu.blockDomain'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableBlockDomain].keys,
          },
        ],
      },
      {
        key: 'delete',
        label: t('HTTPFlowTable.RowContextMenu.delete'),
        webSocket: true,
        default: true,
        onClickSingle: (v) => onRemoveHttpHistory({ Id: [v.Id] }),
        onClickBatch: (list) => {
          onRemoveHttpHistory({ Id: list.map((ele) => ele.Id) })
        },
        all: true,
        children: [
          {
            key: 'deleteRecord',
            label: t('HTTPFlowTable.RowContextMenu.deleteRecord'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableDeleteRecord].keys,
            onClick: (v) => onRemoveHttpHistory({ Id: [v.Id] }),
            onClickBatch: (list) => {
              onRemoveHttpHistory({ Id: list.map((ele) => ele.Id) })
            },
          },
          {
            key: 'deleteURL',
            label: t('HTTPFlowTable.RowContextMenu.deleteURL'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableDeleteURL].keys,
            onClick: (v) => onRemoveHttpHistory({ URLPrefix: v.Url }),
            onClickBatch: (list) => {
              const urls = list.map((ele) => ele.Url)
              onRemoveHttpHistory({
                Filter: {
                  IncludeInUrl: urls,
                },
              })
            },
          },
          {
            key: 'deleteDomain',
            label: t('HTTPFlowTable.RowContextMenu.deleteDomain'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableDeleteDomain].keys,
            onClick: (v) => onRemoveHttpHistory({ URLPrefix: v?.HostPort?.split(':')[0] }),
            onClickBatch: (list) => {
              const hosts = list.map((ele) => ele.HostPort?.split(':')[0])
              onRemoveHttpHistory({
                Filter: {
                  IncludeInUrl: hosts,
                },
              })
            },
          },
        ],
      },
      {
        key: 'sharePacket',
        label: t('HTTPFlowTable.RowContextMenu.sharePacket'),
        number: 30,
        default: true,
        webSocket: false,
        onClickSingle: (v) => onShareData([v.Id + ''], 50),
        onClickBatch: (list, n) => {
          const ids: string[] = list.map((ele) => ele.Id + '')
          onShareData(ids, n!)
        },
      },
      {
        key: 'viewAttach',
        label: t('HTTPFlowTable.RowContextMenu.viewAttach'),
        default: true,
        webSocket: false,
        onClickSingle: (v) => onViewAttachmentDataRefresh(v.Id),
      },
      {
        key: 'exportData',
        label: t('HTTPFlowTable.RowContextMenu.exportData'),
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        onClickBatch: () => {},
        children: [
          {
            key: 'exportToExcel',
            label: t('HTTPFlowTable.RowContextMenu.exportToExcel'),
            onClick: (v) => onExcelExport([v]),
            onClickBatch: (list) => {
              onExcelExport(list)
            },
          },
          {
            key: 'exportToHAR',
            label: t('HTTPFlowTable.RowContextMenu.exportToHAR'),
            onClick: (v) => onHarExport([v.Id]),
            onClickBatch: (list) => {
              onHarExport(list.map((item) => item.Id))
            },
          },
        ],
      },
      {
        key: 'editTag',
        label: t('HTTPFlowTable.RowContextMenu.editTag'),
        default: true,
        webSocket: true,
        onClickSingle: (v) => onEditTags(v),
      },
      {
        key: 'openInNewWindow',
        label: t('HTTPFlowTable.RowContextMenu.openInNewWindow'),
        default: true,
        webSocket: true,
        onClickSingle: (v) => {
          onHTTPFlowTableRowDoubleClick(v)
        },
      },
    ]
    if (isEnpriTrace() && userInfo.isLogin) {
      menu.push({
        key: 'uploadData',
        label: t('HTTPFlowTable.RowContextMenu.uploadData'),
        number: 30,
        default: true,
        webSocket: false,
        onClickSingle: (v) => onUploadData([v.Id + '']),
        onClickBatch: (list) => {
          const ids: string[] = list.map((ele) => ele.Id + '')
          onUploadData(ids)
        },
      })
    }
    return menu
  }, [
    userInfo.isLogin,
    i18n.language,
    codecMultipleHistoryPluginCom,
    codecSingleHistoryPluginCom,
    selectedRowKeysCom,
    selected?.Id,
    onlyFavorite,
    getUrlWithoutQuery,
    total,
  ])

  // 插件扩展处理
  const onPluginExtensionHandle = useMemoizedFn(
    ({
      key,
      keyPath,
      id,
      menu,
    }: {
      key: string
      keyPath: string[]
      id: Array<string | number>
      menu: HistoryMenuData[]
    }) => {
      let menuItemName = keyPath[0]

      const emitGetPluginEvent = () => {
        emiter.emit('onOpenFuzzerModal', JSON.stringify({ scriptName: key, isAiPlugin: 'isGetPlugin' }))
      }

      const emitPluginEvent = (child: HistoryMenuData, isExec: boolean, scriptName: string) => {
        emiter.emit(
          'onOpenFuzzerModal',
          JSON.stringify({
            text: id.join(','),
            scriptName,
            params: child.params,
            isAiPlugin: child.isAiPlugin,
            isExec,
          }),
        )
      }

      const getScriptName = (childKey: string) => childKey.replace(PLUGIN_PREFIX, '')

      // ----- 点击获取插件 -----
      if (key === 'Get*plug-in') {
        emitGetPluginEvent()
        return
      }

      // ----- 获取父菜单及其子项 -----
      const targetMenu = menu.find((item: HistoryMenuData) => item.key === 'pluginExtension')
      if (!targetMenu?.children?.length) {
        return
      }

      // ----- 匹配并执行子菜单项 -----
      try {
        for (const child of targetMenu.children) {
          // 点击一级菜单
          if (menuItemName === 'pluginExtension') {
            // 执行第一个子项 —— 有三级则执行第二个子项
            // if (child.key === 'Get*plug-in') {
            //   // 当子项为获取插件
            //   emitGetPluginEvent()
            // } else {
            //   // 全选状态检查
            //   if (isAllSelect) {
            //     yakitNotify('warning', t('HTTPFlowTable.batchOperationNoSelectAll'))
            //     return
            //   }
            //   // 当子为插件时
            //   emitPluginEvent(child, true, getScriptName(child.key))
            // }
            return
          }

          // 全选状态检查
          if (isAllSelect) {
            yakitNotify('warning', t('HTTPFlowTable.batchOperationNoSelectAll'))
            return
          }

          // 点击二级菜单
          if (child.key === menuItemName) {
            emitPluginEvent(child, true, getScriptName(child.key))
            return
          }

          // 点击带参数的三级菜单，后缀匹配（如 "execCodecPlugin_测试codec" 匹配 key="测试codec"）
          if (menuItemName.endsWith('_' + getScriptName(child.key))) {
            const prefix = menuItemName.split('_')[0]
            const isExec = prefix !== 'updateCodecParams'
            emitPluginEvent(child, isExec, getScriptName(child.key))
            return
          }
        }
      } catch (error) {
        yakitNotify('error', `右键插件子菜单匹配失败: ${error}`)
      }
    },
  )

  /** 菜单自定义快捷键渲染处理事件 */
  const contextMenuKeybindingHandle = useMemoizedFn((data) => {
    const menus: any = []
    for (let item of data) {
      /** 处理带快捷键的菜单项 */
      const info = { ...item }
      if (info.children && info.children.length > 0) {
        info.children = contextMenuKeybindingHandle(info.children)
      } else {
        if (info.keybindings && info.keybindings.length > 0) {
          const keysContent = convertKeyboardToUIKey(info.keybindings)

          info.label = keysContent ? (
            <div className={style['editor-context-menu-keybind-wrapper']}>
              <div className={style['content-style']}>{info.label}</div>
              <div className={classNames(style['keybind-style'], 'keys-style')}>{keysContent}</div>
            </div>
          ) : (
            info.label
          )
        }
      }
      menus.push(info)
    }
    return menus
  })

  const getRowContextMenu = useMemoizedFn((rowData: HTTPFlow) => {
    return contextMenuKeybindingHandle(menuData)
      .filter((item) => (rowData.IsWebsocket ? item.webSocket : item.default))
      .map((ele) => {
        const isFavoriteMenu = ele.key === 'favorite'
        return {
          label: isFavoriteMenu
            ? isHTTPFlowFavorite(rowData)
              ? t('HTTPFlowTable.RowContextMenu.cancelFavorite')
              : t('HTTPFlowTable.RowContextMenu.favorite')
            : ele.label,
          key: ele.key,
          children: ele.children || [],
        }
      })
  })

  const onRowContextMenu = (rowData: HTTPFlow, _, event: React.MouseEvent) => {
    if (rowData) {
      setSelected(rowData)
    }
    let rowContextmenu: HistoryMenuData[] = []
    // 当存在history勾选时，替换为批量菜单
    if (selectedRowKeys.length > 0) {
      rowContextmenu = getBatchContextMenu()
    } else {
      rowContextmenu = getRowContextMenu(rowData)
    }

    showByRightContext(
      {
        width: 180,
        parentTitleClick: true,
        data: rowContextmenu,
        onClick: ({ key, keyPath }) => {
          if (selectedRowKeys.length > 0) {
            onMultipleClick(key, keyPath)
            return
          }

          const menuName = keyPath[keyPath.length - 1]
          if (menuName.startsWith('pluginExtension')) {
            onPluginExtensionHandle({ key, keyPath, id: [rowData.Id], menu: rowContextmenu })
            return
          }

          if (keyPath.includes('packetScan')) {
            const scanItem = packetScanDefaultValue.find((e) => e.Verbose === key || e.VerboseUi === key)
            if (!scanItem) return
            execPacketScan({
              httpFlowIds: [rowData.Id],
              value: scanItem,
              https: rowData.IsHTTPS,
            })
            return
          }
          if (keyPath.includes('tagColor')) {
            const colorItem = availableColors.find((e) => e.title === key)
            if (!colorItem) return
            CalloutColor(rowData, colorItem, data, setData)
            return
          }
          switch (key) {
            case 'csrfpoc':
              generateCSRFPocByRequest(
                rowData.Request,
                rowData.IsHTTPS,
                (e) => {
                  setClipboardText(e)
                },
                false,
              )
              break
            case 'auto-submit-csrf-poc':
              generateCSRFPocByRequest(
                rowData.Request,
                rowData.IsHTTPS,
                (e) => {
                  setClipboardText(e)
                },
                true,
              )
              break
            case 'packetPoCTemplate':
              onPocMould(rowData)
              break
            case 'batchTestPoCTemplate':
              onBatchPocMould(rowData)
              break
            case 'blockRecord':
              onShieldRecord(rowData)
              break
            case 'blockURL':
              onShieldURL(rowData)
              break
            case 'blockDomain':
              onShieldDomain(rowData)
              break
            case 'deleteRecord':
              onRemoveHttpHistory({ Id: [rowData.Id] })
              break
            case 'deleteURL':
              onRemoveHttpHistory({ URLPrefix: rowData.Url })
              break
            case 'deleteDomain':
              onRemoveHttpHistory({ URLPrefix: rowData?.HostPort?.split(':')[0] })
              break
            case 'sendToComparerLeft':
              setCompareLeft({
                content: new Buffer(rowData.Request).toString('utf8'),
                language: 'http',
              })
              break
            case 'sendToComparerRight':
              setCompareRight({
                content: new Buffer(rowData.Request).toString('utf8'),
                language: 'http',
              })
              break
            case 'sendAndJumpToWebFuzzer':
              onSendToTab(rowData, true, downstreamProxyStr, fromMITM)
              break
            case 'sendToWebFuzzer':
              onSendToTab(rowData, false, downstreamProxyStr, fromMITM)
              break
            case 'sendAndJumpToWS':
              newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request)
              break
            case 'sendToWS':
              newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request, false)
              break
            case 'copyUrlWithQuery':
              setClipboardText(rowData.Url || '')
              break
            case 'copyUrlWithoutQuery': {
              const nextUrl = getUrlWithoutQuery(rowData.Url)
              if (!nextUrl) {
                yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.urlNotExist'))
                return
              }
              setClipboardText(nextUrl)
              break
            }
            case 'openURLInBrowser':
              rowData.Url && openExternalWebsite(rowData.Url)
              break
            case 'viewResponseInBrowser':
              showResponseViaHTTPFlowID(rowData)
              break
            case 'exportToExcel':
              onExcelExport([rowData])
              break
            case 'exportToHAR':
              onHarExport([rowData.Id])
              break
            default:
              const currentItem = menuData.find((f) => f.key === key)
              if (!currentItem) return
              if (currentItem.onClickSingle) currentItem.onClickSingle(rowData)
              break
          }
        },
      },
      event.clientX,
      event.clientY,
    )
  }

  const getBatchContextMenu = useMemoizedFn(() => {
    return menuData
      .filter((f) => f.onClickBatch)
      .map((m) => {
        return {
          key: m.key,
          label: m.label,
          children: m.children || [],
        }
      })
  })

  const onMultipleClick = useMemoizedFn((key: string, keyPath: string[]) => {
    const batchContextMenu = getBatchContextMenu()

    const menuName = keyPath[keyPath.length - 1]
    if (menuName.startsWith('pluginExtension')) {
      onPluginExtensionHandle({ key, keyPath, id: selectedRowKeys, menu: batchContextMenu })
      setSelectedRowKeys([])
      setSelectedRows([])
      return
    }

    if (keyPath.includes('packetScan')) {
      let sendIds: string[] = selectedRowKeys
      if (isAllSelect) {
        if (total > 200) {
          yakitNotify('warning', t('HTTPFlowTable.maxSendData', { number: 200 }))
          return
        } else {
          sendIds = data.map((item) => item.Id + '')
        }
      } else {
        if (sendIds.length > 200) {
          yakitNotify('warning', t('HTTPFlowTable.maxSendData', { number: 200 }))
          return
        }
      }
      const currentItemScan = menuData.find((f) => f.onClickBatch && f.key === 'packetScan')
      const currentItemPacketScan = packetScanDefaultValue.find((f) => f.Verbose === key || f.VerboseUi === key)
      if (!currentItemScan || !currentItemPacketScan) return

      onBatchExecPacketScan({
        httpFlowIds: sendIds,
        maxLength: currentItemScan.number || 0,
        currentPacketScan: currentItemPacketScan,
      })
      return
    }
    if (keyPath.includes('tagColor')) {
      const currentItemColor = menuData.find((f) => f.onClickBatch && f.key === 'tagColor')
      const colorItem = availableColors.find((e) => e.title === key)
      if (!currentItemColor || !colorItem) return
      calloutColorBatch({
        flowList: selectedRows,
        number: currentItemColor?.number || 0,
        colorItem,
        data,
        setData,
        setSelectedRowKeys,
        setSelectedRows,
        t,
      })
      return
    }
    switch (key) {
      case 'deleteRecord':
        onRemoveHttpHistory({
          Id: selectedRowKeys,
        })
        break
      case 'deleteURL':
        const urls = selectedRows.map((ele) => ele.Url)
        onRemoveHttpHistory({
          Filter: {
            IncludeInUrl: urls,
          },
        })
        break
      case 'deleteDomain':
        const hosts = selectedRows.map((ele) => ele.HostPort?.split(':')[0])
        onRemoveHttpHistory({
          Filter: {
            IncludeInUrl: hosts,
          },
        })
        break
      case 'sendAndJumpToWebFuzzer':
        const currentItemJumpToFuzzer = menuData.find((f) => f.onClickBatch && f.key === 'sendToWebFuzzerKey')
        if (!currentItemJumpToFuzzer) return
        onBatch(
          (el) => onSendToTab(el, true, downstreamProxyStr, fromMITM),
          currentItemJumpToFuzzer?.number || 0,
          selectedRowKeys.length === total,
        )

        break
      case 'sendToWebFuzzer':
        const currentItemToFuzzer = menuData.find((f) => f.onClickBatch && f.key === 'sendToWebFuzzerKey')
        if (!currentItemToFuzzer) return
        onBatch(
          (el) => onSendToTab(el, false, downstreamProxyStr, fromMITM),
          currentItemToFuzzer?.number || 0,
          selectedRowKeys.length === total,
        )
        break
      case 'sendAndJumpToWS':
        const currentItemJumpToWS = menuData.find((f) => f.onClickBatch && f.key === 'sendToWSFuzzer')
        if (!currentItemJumpToWS) return
        onBatch(
          (el) => newWebsocketFuzzerTab(el.IsHTTPS, el.Request),
          currentItemJumpToWS?.number || 0,
          selectedRowKeys.length === total,
        )

        break
      case 'sendToWS':
        const currentItemToWS = menuData.find((f) => f.onClickBatch && f.key === 'sendToWSFuzzer')
        if (!currentItemToWS) return
        onBatch(
          (el) => newWebsocketFuzzerTab(el.IsHTTPS, el.Request, false),
          currentItemToWS?.number || 0,
          selectedRowKeys.length === total,
        )
        break
      case 'copyUrlWithQuery':
      case 'copyUrlWithoutQuery': {
        const currentItemCopyUrl = menuData.find((f) => f.onClickBatch && f.key === 'copyUrl')
        if (!currentItemCopyUrl) return
        if (key === 'copyUrlWithQuery') {
          currentItemCopyUrl.onClickBatch?.(selectedRows, currentItemCopyUrl.number)
          break
        }
        const urls = selectedRows.map((el) => getUrlWithoutQuery(el.Url)).filter((url) => !!url)
        if (selectedRows.length > 0 && !urls.length) {
          yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.urlNotExist'))
          return
        }
        if (selectedRows.length >= (currentItemCopyUrl.number || 0)) {
          yakitNotify('warning', t('HTTPFlowTable.copyLimit', { number: currentItemCopyUrl.number }))
          return
        }
        let copied = false
        onBatch(
          () => {
            if (!copied) {
              setClipboardText(urls.join('\r\n'))
              copied = true
            }
          },
          currentItemCopyUrl.number || 0,
          selectedRowKeys.length === total,
        )
        break
      }
      case 'exportToExcel':
        onExcelExport(selectedRows)
        break
      case 'exportToHAR':
        onHarExport(isAllSelect ? [] : selectedRows.map((item) => item.Id))
        break
      default:
        const currentItem = menuData.find((f) => f.onClickBatch && f.key === key)
        if (!currentItem) return
        if (currentItem.onClickBatch) currentItem.onClickBatch(selectedRows, currentItem.number)
        break
    }
    setBatchVisible(false)
  })
  return {
    menuData,
    getRowContextMenu,
    getBatchContextMenu,
    onMultipleClick,
    onRowContextMenu,
  }
}
