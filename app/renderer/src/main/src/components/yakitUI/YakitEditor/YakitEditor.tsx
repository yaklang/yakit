import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  useDebounceFn,
  useGetState,
  useMemoizedFn,
  useThrottleFn,
  useUpdateEffect,
  useInViewport,
  useDebounceEffect,
} from 'ahooks'
import ReactResizeDetector from 'react-resize-detector'
import MonacoEditor, { monaco } from 'react-monaco-editor'
// 编辑器 注册
// import "@/utils/monacoSpec/theme"
import '@/utils/monacoSpec/fuzzHTTPMonacoSpec'
import '@/utils/monacoSpec/yakEditor'
import '@/utils/monacoSpec/html'

import type {
  YakitIMonacoEditor,
  YakitEditorProps,
  KeyboardToFuncProps,
  YakitIModelDecoration,
  OperationRecord,
  OtherMenuListProps,
  OperationRecordRes,
} from './YakitEditorType'
import { showByRightContext } from '../YakitMenu/showByRightContext'
import { baseMenuLists, extraMenuLists } from './contextMenus'
import type { EditorMenuItemProps, EditorMenuItemType } from './EditorMenu'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'

import classNames from 'classnames'
import styles from './YakitEditor.module.scss'
import './StaticYakitEditor.scss'
import { failed } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { v4 as uuidv4 } from 'uuid'
import { openABSFileLocated, openExternalWebsite } from '@/utils/openWebsite'
import emiter from '@/utils/eventBus/eventBus'
import { GetPluginLanguage } from '@/pages/plugins/builtInData'
import { setEditorContext, YaklangMonacoSpec } from '@/utils/monacoSpec/yakEditor'
import { SyntaxFlowMonacoSpec } from '@/utils/monacoSpec/syntaxflowEditor'
import type { YakParamProps } from '@/pages/plugins/pluginsType'
import { IconSolidAIIcon, IconSolidAIWhiteIcon } from '@/assets/icon/colors'
import {
  getStorageYakEditorShortcutKeyEvents,
  isYakEditorDefaultShortcut,
  isYakEditorShortcut,
} from '@/utils/globalShortcutKey/events/page/yakEditor'
import { isPageOrGlobalShortcut } from '@/utils/globalShortcutKey/events/page/yakEditorPageShortcut'
import ShortcutKeyFocusHook from '@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook'
import useFocusContextStore from '@/utils/globalShortcutKey/shortcutKeyFocusHook/hooks/useStore'
import { ShortcutKeyFocusType } from '@/utils/globalShortcutKey/events/global'
import { convertKeyEventToKeyCombination, sortKeysCombination } from '@/utils/globalShortcutKey/utils'
import { applyYakitMonacoTheme } from '@/utils/monacoSpec/theme'
import { useTheme } from '@/hook/useTheme'
import { keepSearchNameMapStore, useKeepSearchNameMap } from '@/store/keepSearchName'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { fontSizeOptions, useEditorFontSize } from '@/store/editorFontSize'
import { editorActionBarStore, useShowActionBar } from '@/store/editorActionBar'
import { JSONParseLog } from '@/utils/tool'
import {
  type BinaryFuzztagEntry,
  collapseBinaryFuzztag,
  decodeBinaryTag,
  encodeBytesToTag,
  canLocateFileReference,
  expandBinaryFuzztag,
  findFileFuzztagPathAtOffset,
  registerBinaryFoldEntries,
  unregisterBinaryFoldEntries,
  rawBytesToPacketText,
} from './binaryFuzztag'
import type { BinaryFuzztagSubmitResult } from './BinaryFuzztagHexModal'
const BinaryFuzztagHexModal = React.lazy(() =>
  import('./BinaryFuzztagHexModal').then((m) => ({ default: m.BinaryFuzztagHexModal })),
)
import { Base64HexFuzztagModal } from './Base64HexFuzztagModal'
import { showYakitModal } from '../YakitModal/YakitModalConfirm'
import { SystemInfo } from '@/constants/hardware'
import { fetchEditorFullContent } from './editorUtils'
import { StringToUint8Array } from '@/utils/str'
import { yakitNotify } from '@/utils/notification'
import { runContextMenuAction } from '@/pages/manageRightClickPlugins/runContextMenuAction'
import {
  ContextMenuExecutionType,
  type ContextMenuAction,
  type ContextMenuPacketActionResult,
} from '@/pages/manageRightClickPlugins/types'

// ===== 拆分模块导入 =====
import {
  type CodecTypeProps,
  type contextMenuProps,
  DefaultMenuTop,
  DefaultMenuBottom,
  openFind,
  PLUGIN_PREFIX,
  PLUGIN_RIGHT_MAG,
  type IFindController,
} from './constants'
import { useBinaryFold } from './hooks/useBinaryFold'
import { usePluginSearch } from './hooks/usePluginSearch'
import { useYakFormat } from './hooks/useYakFormat'
import { generateDecorations as generateDecorationsFn } from './decorations/generateDecorations'
import { editerMenuFun } from './fizzMenu/editerMenuFun'
import { menuReduce, sortMenuFun, contextMenuKeybindingHandle } from './menus/menuHelpers'
import {
  type EditorDetailInfoProps,
  type SmartDecodeAnchorRect,
  SmartDecodeFloatPanel,
  snapshotRect,
} from '@/pages/fuzzer/HTTPFuzzerEditorMenu'
import { OutlineCogIcon } from '@/assets/icon/outline'
import { YakitRoute } from '@/enums/yakitRoute'
import { ManageRightClickPluginsTabKey } from '@/pages/manageRightClickPlugins/constants'
import { checkContextMenuVersion } from '@/pages/manageRightClickPlugins/utils'

// re-export 保持外部导入路径兼容
export { PLUGIN_PREFIX }
export { PLUGIN_RIGHT_MAG }
export type { CodecTypeProps, contextMenuProps }

/** 右键菜单浅拷贝：避免 cloneDeep(ReactNode) 的性能开销，同时防止原地改写 props */
const shallowCloneMenuItems = (items: EditorMenuItemType[]): EditorMenuItemType[] => {
  return items.map((item) => {
    if (!item || typeof item !== 'object') {
      return item
    }
    if ((item as { type?: string }).type === 'divider') {
      return { ...item }
    }
    const next = { ...(item as EditorMenuItemProps) }
    if (Array.isArray(next.children)) {
      next.children = next.children.map((child) => ({ ...child }))
    }
    return next
  })
}

/** 高亮数组轻量指纹：只拼位置字段，避免 JSON.stringify 序列化 hoverVal 等大字段 */
const highLightFingerprint = (list?: readonly any[]): string => {
  if (!list?.length) return ''
  let s = String(list.length)
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (item == null) continue
    if ('startOffset' in item) {
      s += `|${item.startOffset},${item.highlightLength ?? 0}`
    } else {
      s += `|${item.startLineNumber},${item.startColumn},${item.endLineNumber},${item.endColumn}`
    }
  }
  return s
}

/** Monaco link opener 全局只注册一次，避免多编辑器实例重复注册 */
let linkOpenerRegistered = false

export const YakitEditor: React.FC<YakitEditorProps> = React.memo((props) => {
  const {
    forceRenderMenu = false,
    menuType = [],
    value,
    setValue,
    type,
    theme = 'kurior',
    keepSearchName,
    editorDidMount,
    contextMenu = {},
    contextMenuPacket,
    hiddenDefaultContextMenuKeys,
    onContextMenu,
    readOnly = false,
    renderLineHighlight = 'line',
    disabled = false,
    noWordWrap = false,
    noMiniMap = false,
    noLineNumber = false,
    renderValidationDecorations,
    lineNumbersMinChars = 5,
    fontSize = 12,
    showLineBreaks = false,
    editorOperationRecord,
    isShowSelectRangeMenu = false,
    selectNode,
    rangeNode,
    overLine = 3,
    editorId,
    highLightText = [],
    highLightClass,
    highLightFind = [],
    highLightFindClass,
    isPositionHighLightCursor,
    fixContentType,
    originalContentType,
    fixContentTypeHoverMessage,
    onChange,
    execAutoDecodeCallback,
    // 此处 添加 propsTheme 字段是因为类 弹窗 / 抽屉组件是在 root 节点之外，provider包裹的入口节点就无法实时获取到theme
    propsTheme,
    glyphMargin = false,
  } = props
  const { t, i18n, i18nRefresh } = useI18nNamespaces(['yakitUi'])

  const isInitRef = useRef<boolean>(false)
  const { shortcutIds } = useFocusContextStore()
  const [focusIds, setFocusIds] = useState<string[]>([`${ShortcutKeyFocusType.Monaco}-${uuidv4()}`])

  const [editor, setEditor] = useState<YakitIMonacoEditor>()
  const preWidthRef = useRef<number>(0)
  const preHeightRef = useRef<number>(0)

  // 获取查找的关键字
  const keepSearchNameMap = useKeepSearchNameMap()

  /** 编辑器语言 */
  const language = useMemo(() => {
    if (type) {
      return GetPluginLanguage(type)
    }
  }, [type])

  useEffect(() => {
    if (editor) {
      setEditorContext(editor, 'plugin', props.type || '')
    }
  }, [props.type, editor])

  const inspectTokens = () => {
    if (editor) {
      editor?.getAction('editor.action.inspectTokens')?.run()
    }
  }

  /** @name 记录右键菜单组信息 */
  const { fontSize: nowFontsize, setFontSize: setNowFontsize, initFontSize } = useEditorFontSize()
  const DefaultMenuTopArr = useMemo(() => DefaultMenuTop(t, nowFontsize), [i18nRefresh, nowFontsize])
  const DefaultMenuBottomArr = useMemo(
    () =>
      DefaultMenuBottom(t).filter(
        (item) => !(hiddenDefaultContextMenuKeys || []).includes((item as { key?: string }).key || ''),
      ),
    [i18nRefresh, hiddenDefaultContextMenuKeys],
  )
  const rightContextMenu = useRef<EditorMenuItemType[]>([...DefaultMenuTopArr, ...DefaultMenuBottomArr])
  /** @name 记录右键菜单组内的快捷键对应菜单项的key值 */
  const keyBindingRef = useRef<KeyboardToFuncProps>({})
  /** @name 记录右键菜单关系[菜单组key值-菜单组内菜单项key值数组] */
  const keyToOnRunRef = useRef<Record<string, string[]>>({})

  const [showBreak, setShowBreak, getShowBreak] = useGetState<boolean>(showLineBreaks)
  /** @name 控制快捷操作栏的显示隐藏（全局共享） */
  const showActionBar = useShowActionBar()
  const { setShowActionBar, getShowActionBar, initShowActionBar } = editorActionBarStore
  const { theme: themeGlobal } = useTheme()

  const disableUnicodeDecodeRef = useRef(props.disableUnicodeDecode)

  // ===== 二进制 Fuzztag 折叠：翻译边界 =====
  const {
    foldBinaryCapable,
    foldBinaryEnabled,
    binaryFoldEntriesRef,
    binaryFoldRangesRef,
    binaryModifiedOrdinalsRef,
    displayValue,
    handleBinaryChange,
    foldBinaryOpen,
    setFoldBinaryOpen,
    getFoldBinaryOpen,
  } = useBinaryFold({
    value,
    setValue,
    onChange,
    foldBinaryFuzztag: props.foldBinaryFuzztag,
    type,
  })

  useLayoutEffect(() => {
    applyYakitMonacoTheme(propsTheme ?? themeGlobal)
  }, [themeGlobal, propsTheme])

  useEffect(() => {
    // 控制编辑器失焦
    if (disabled) {
      const fakeInput = document.createElement('input')
      document.body.appendChild(fakeInput)
      fakeInput.focus()
      document.body.removeChild(fakeInput)
    }
  }, [disabled])

  useEffect(() => {
    initFontSize()
  }, [])

  // 仅在开启操作栏显隐菜单时从缓存恢复上次的显隐状态
  useEffect(() => {
    if (isShowSelectRangeMenu) {
      initShowActionBar()
    }
  }, [isShowSelectRangeMenu])

  // 阻止编辑器点击URL默认打开行为 自定义外部系统默认浏览器打开URL
  useEffect(() => {
    if (linkOpenerRegistered) return
    linkOpenerRegistered = true
    monaco.editor.registerLinkOpener({
      open: (link) => {
        // 在系统默认浏览器中打开链接
        openExternalWebsite(link.toString())
        return true
      },
    })
  }, [])

  // 修改主题颜色

  useUpdateEffect(() => {
    if (fontSize) {
      setNowFontsize(fontSize)
      onOperationRecord('fontSize', fontSize)
    }
  }, [fontSize])

  useUpdateEffect(() => {
    setShowBreak(showLineBreaks)
    onOperationRecord('showBreak', showLineBreaks)
  }, [showLineBreaks])

  useUpdateEffect(() => {
    onOperationRecord('noWordWrap', noWordWrap)
  }, [noWordWrap])

  // 自定义HTTP数据包变形处理 + 右键插件
  const ref = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(ref)

  const { customHTTPMutatePlugin, contextMenuPlugin } = usePluginSearch({
    menuType,
    inViewport,
  })

  /**
   * 整理右键菜单的对应关系
   * 菜单组的key值对应的组内菜单项的key值数组
   */
  const extraMenuListsObj = useMemo(() => extraMenuLists(t), [i18nRefresh])
  const baseMenuListsObj = useMemo(() => baseMenuLists(t), [i18nRefresh])
  useEffect(() => {
    try {
      const httpMenu = extraMenuListsObj['http'].menu[0] as EditorMenuItemProps
      // 过滤掉已被注入的动态项，保留默认HTTP项
      const httpDefaultChildren = (httpMenu?.children || []).filter((child) => !(child as EditorMenuItemProps).isCustom)
      const newHttpChildren = [
        ...httpDefaultChildren,
        ...customHTTPMutatePlugin.map((item) => {
          return {
            key: item.key,
            label: item.key,
            // 自定义HTTP数据包变形标记
            isCustom: true,
          } as EditorMenuItemProps
        }),
      ]
      // 自定义HTTP数据包变形
      ;(extraMenuListsObj['http'].menu[0] as EditorMenuItemProps).children = newHttpChildren

      // 插件扩展（为保持key值唯一性，添加 plugin- ）
      const newCustomContextMenu = contextMenuPlugin.map((item) => {
        const baseItem = {
          key: `${PLUGIN_PREFIX}${item.value}`,
          label: (
            <>
              {item.isAiPlugin && (
                <>
                  <IconSolidAIIcon className={'ai-plugin-menu-icon-default'} />
                  <IconSolidAIWhiteIcon className={'ai-plugin-menu-icon-hover'} />
                </>
              )}
              {item.key}
            </>
          ),
          isAiPlugin: item.isAiPlugin,
          params: item.params,
          executionType: item.executionType,
          action: item.action,
        } as EditorMenuItemProps

        // 如果有参数，添加子菜单
        if (item?.params && item.params.length > 0) {
          return {
            ...baseItem,
            children: [
              {
                key: `execCodecPlugin_${PLUGIN_PREFIX}${item.value}`,
                label: t('YakitEditor.executePlugin'),
              },
              {
                key: `updateCodecParams_${PLUGIN_PREFIX}${item.value}`,
                label: t('YakitEditor.modifyParameters'),
              },
            ],
          }
        }
        return baseItem
      })
      const manageContextMenuItem = {
        key: PLUGIN_RIGHT_MAG + ManageRightClickPluginsTabKey.PacketContextMenu,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <OutlineCogIcon />
            {t('YakitEditor.manageRightClickPlugins')}
          </div>
        ),
      } as EditorMenuItemProps
      newCustomContextMenu.push(manageContextMenuItem)
      ;(extraMenuListsObj['customcontextmenu'].menu[0] as EditorMenuItemProps).children =
        contextMenuPlugin.length > 0 ? newCustomContextMenu : [manageContextMenuItem]
    } catch (e) {
      failed(`get custom plugin failed: ${e}`)
    }

    const keyToRun: Record<string, string[]> = {}
    const allMenu = { ...baseMenuListsObj, ...extraMenuListsObj, ...contextMenu }
    for (let key in allMenu) {
      const keys: string[] = []
      for (let item of allMenu[key].menu) {
        if ((item as EditorMenuItemProps)?.key) keys.push((item as EditorMenuItemProps)?.key)
      }
      keyToRun[key] = keys
    }

    keyToOnRunRef.current = { ...keyToRun }
  }, [contextMenu, customHTTPMutatePlugin, contextMenuPlugin, extraMenuListsObj, baseMenuListsObj])

  /** 数据包内容版本（FNV-1a hash），插件执行回来后校验内容是否变化 */
  const packetRevision = (request: string | undefined, response: string | undefined) => {
    let hash = 2166136261
    let length = 0
    // 片段式更新，避免为哈希拼接 request/response 全量内容的大字符串
    const update = (fragment: string) => {
      length += fragment.length
      for (let index = 0; index < fragment.length; index++) {
        hash ^= fragment.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
      }
    }
    update('request:')
    update(request === undefined ? 'missing' : request)
    update('\nresponse:')
    update(response === undefined ? 'missing' : response)
    return `v1-${length}-${(hash >>> 0).toString(16)}`
  }

  /** context-menu 类型插件在编辑器场景的触发：以当前编辑器内容(可含另一侧)为数据包执行，并支持回填 */
  const runEditorContextMenuAction = useMemoizedFn(
    (editor: YakitIMonacoEditor, action: ContextMenuAction, isExec: boolean) => {
      const currentValue = fetchEditorFullContent(editor)
      // 角色三级判定：显式指定 > 内容嗅探（状态行开头为 response）
      const role = contextMenuPacket?.role || (/^HTTP\/\d(?:\.\d)?\s/.test(currentValue) ? 'response' : 'request')
      const request = role === 'request' ? currentValue : contextMenuPacket?.peerValue
      const response = role === 'response' ? currentValue : contextMenuPacket?.peerValue
      const revision = packetRevision(request, response)

      const applyPacketResult = (result: ContextMenuPacketActionResult) => {
        const currentContent = fetchEditorFullContent(editor)
        const currentRevision = packetRevision(
          role === 'request' ? currentContent : contextMenuPacket?.peerValue,
          role === 'response' ? currentContent : contextMenuPacket?.peerValue,
        )
        if (result.PacketRevision !== revision || currentRevision !== revision) {
          yakitNotify('warning', '数据包在插件执行期间已变化，未应用插件修改')
          return false
        }
        const model = editor.getModel()
        if (!model) return false
        if (role === 'request' && result.ReplaceRequest) {
          model.setValue(rawBytesToPacketText(result.Request))
        }
        if (role === 'response' && result.ReplaceResponse) {
          model.setValue(rawBytesToPacketText(result.Response))
        }
        // 另一侧被插件修改时的回填
        const replacePeer = role === 'request' ? result.ReplaceResponse : result.ReplaceRequest
        const peerBytes = role === 'request' ? result.Response : result.Request
        if (replacePeer) {
          if (contextMenuPacket?.onPeerValueChange) {
            contextMenuPacket.onPeerValueChange(rawBytesToPacketText(peerBytes))
          } else {
            yakitNotify('warning', '插件同时修改了另一侧数据包，但当前页面未提供回填入口')
          }
        }
        return true
      }

      runContextMenuAction({
        action,
        configureParams: !isExec,
        onPacketResult: readOnly ? undefined : applyPacketResult,
        request: {
          Source: contextMenuPacket?.source || 'http-packet-editor',
          Trigger: 'context-menu',
          HttpsState: contextMenuPacket?.httpsState || 'unknown',
          HTTPFlowIDs: contextMenuPacket?.httpFlowId ? [contextMenuPacket.httpFlowId] : [],
          Request: request === undefined ? undefined : StringToUint8Array(request),
          Response: response === undefined ? undefined : StringToUint8Array(response),
          HasRequest: request !== undefined,
          HasResponse: response !== undefined,
          PacketRevision: revision,
        },
      })
    },
  )

  /** 菜单功能点击处理事件 */
  const { run: menuItemHandle } = useDebounceFn(
    useMemoizedFn((key: string, keyPath: string[]) => {
      if (!editor) return
      /** 是否执行过方法(onRightContextMenu) */
      let executeFunc = false
      const menuName = keyPath[keyPath.length - 1]
      const menuItemName = keyPath[0]
      for (let name in keyToOnRunRef.current) {
        const allMenu = { ...baseMenuListsObj, ...extraMenuListsObj, ...contextMenu }
        if (
          keyToOnRunRef.current[name].includes('customcontextmenu') &&
          (menuName === 'customcontextmenu' || menuName.startsWith(PLUGIN_PREFIX))
        ) {
          // 插件拓展
          let key: string = ''
          let data: boolean | string | undefined = undefined
          let params: YakParamProps[] | undefined
          let isExec: boolean | undefined = undefined
          let contextMenuActionItem: { executionType?: string; action?: ContextMenuAction } | undefined
          try {
            // @ts-ignore
            allMenu[name].menu[0]?.children.map((item, index) => {
              // 点击一级菜单
              if (menuItemName === 'customcontextmenu' && index === 0) {
                // 执行第一个子项 —— 有三级则执行第二个子项
                // key = item.key.slice(PLUGIN_PREFIX.length)
                // if (item.isAiPlugin) {
                //   data = true
                // }
                // params = item.params
                // isExec = true
                return
              }
              // 点击二级菜单
              if (item.key === menuItemName) {
                if (item.key.startsWith(PLUGIN_RIGHT_MAG)) {
                  // 当子项为管理右键插件：跳转前校验引擎版本，版本不足则拦截并提示
                  checkContextMenuVersion().then((versionValid) => {
                    if (!versionValid) return
                    const tab = item.key.split('_')[1]
                    emiter.emit(
                      'openPage',
                      JSON.stringify({ route: YakitRoute.ManageRightClickPlugins, params: { tab } }),
                    )
                  })
                } else {
                  // 当子为插件时
                  key = item.key.slice(PLUGIN_PREFIX.length)
                  if (item.isAiPlugin) {
                    data = true
                  }
                  params = item.params
                  isExec = true
                  contextMenuActionItem = item
                }
                return
              }

              // 点击带参数的三级菜单
              if (menuItemName.endsWith('_' + item.key)) {
                key = item.key.slice(PLUGIN_PREFIX.length)
                const prefix = menuItemName.split('_')[0]
                isExec = prefix !== 'updateCodecParams'
                params = item.params
                contextMenuActionItem = item
                return
              }
            })
          } catch (error) {}
          // context-menu 类型走新流式执行接口，legacy-codec-* 保持原 codec 执行链路
          if (
            contextMenuActionItem &&
            contextMenuActionItem.executionType === ContextMenuExecutionType.ContextMenu &&
            contextMenuActionItem.action
          ) {
            runEditorContextMenuAction(editor, contextMenuActionItem.action, isExec !== false)
            executeFunc = true
            onRightContextMenu(menuItemName)
            break
          }
          allMenu[name].onRun(editor, key, data, params, isExec)
          executeFunc = true
          onRightContextMenu(menuItemName)
          break
        } else if (keyToOnRunRef.current[name].includes('http') && menuName === 'http') {
          // 获取是否为自定义HTTP数据包变形标记
          let key: string = menuItemName
          let data: boolean | undefined = undefined
          try {
            // @ts-ignore
            allMenu[name].menu[0]?.children.map((item, index) => {
              // 点击一级菜单
              if (menuItemName === 'http' && index === 0) {
                // 执行第一个子项
                // if (item.isCustom) {
                //   data = true
                // }
                // key = item.key
                return
              }

              if (item.key === menuItemName && item.isCustom) {
                data = true
              }
            })
          } catch (error) {}

          allMenu[name].onRun(editor, key, data)
          executeFunc = true
          onRightContextMenu(menuItemName)
          break
        } else if (keyToOnRunRef.current[name].includes(menuName)) {
          if (keyPath.length === 2) {
            allMenu[name].onRun(editor, menuItemName)
            executeFunc = true
            onRightContextMenu(menuItemName)
          } else if (keyPath.length === 1) {
            const limitPath = ['font-size', 'code', 'decode', 'code-compare', 'insert-label-tag', 'sendToComparer']
            if (limitPath.includes(keyPath[0])) return
            let runKey = menuName
            const parentMenu = allMenu[name].menu.find((item) => (item as EditorMenuItemProps).key === menuName) as
              | EditorMenuItemProps
              | undefined
            if (parentMenu?.children?.length) {
              runKey = (parentMenu.children[0] as EditorMenuItemProps).key
            }
            allMenu[name].onRun(editor, runKey)
            executeFunc = true
            onRightContextMenu(runKey)
          }
          break
        }
      }

      if (!executeFunc) onRightContextMenu(key)
      return
    }),
    { wait: 300 },
  )

  useEffect(() => {
    if (editorOperationRecord) {
      getRemoteValue(editorOperationRecord).then((data) => {
        try {
          if (!data) return
          let obj: OperationRecordRes = JSONParseLog(data, { page: 'YakitEditor' })
          if (typeof obj?.showBreak === 'boolean') {
            setShowBreak(obj?.showBreak)
          }
        } catch (error) {}
      })
    }
  }, [])

  /** 操作记录存储 */
  const onOperationRecord = (type: 'fontSize' | 'showBreak' | 'noWordWrap', value: number | boolean) => {
    if (editorOperationRecord) {
      getRemoteValue(editorOperationRecord).then((data) => {
        if (!data) {
          let obj: OperationRecord = {
            [type]: value,
          }
          setRemoteValue(editorOperationRecord, JSON.stringify(obj))
        } else {
          try {
            let obj: OperationRecord = JSONParseLog(data, { page: 'YakitEditor', fun: 'onOperationRecord' })
            obj[type] = value
            setRemoteValue(editorOperationRecord, JSON.stringify(obj))
          } catch (error) {}
        }
      })
    }
  }

  /** 右键菜单功能点击回调事件 */
  const onRightContextMenu = useMemoizedFn((key: string) => {
    /** 获取 ITextModel 实例 */
    const model = editor?.getModel()

    const fontSize = parseInt(key)
    if (!isNaN(fontSize) && fontSizeOptions.includes(fontSize)) {
      if (editor?.updateOptions) {
        onOperationRecord('fontSize', fontSize)
        if (editorId) {
          emiter.emit(
            'refreshEditorOperationRecord',
            JSON.stringify({
              editorId,
              fontSize: fontSize,
            }),
          )
        } else {
          setNowFontsize(fontSize)
        }
      }
      return
    }

    switch (key) {
      case 'toggle-action-bar':
        setShowActionBar((prev) => !prev)
        return
      case 'toggle-fold-binary': {
        const next = !getFoldBinaryOpen()
        setFoldBinaryOpen(next)
        props.onFoldBinaryFuzztagChange?.(next)
        return
      }
      case 'http-show-break':
        onOperationRecord('showBreak', getShowBreak())
        if (editorId) {
          emiter.emit(
            'refreshEditorOperationRecord',
            JSON.stringify({
              editorId,
              showBreak: !getShowBreak(),
            }),
          )
        } else {
          setShowBreak(!getShowBreak())
        }
        return
      case 'yak-formatter':
        if (!model) return
        if (editor) yakCompileAndFormat.run(editor, model)
        return

      default:
        if (onContextMenu && editor) onContextMenu(editor, key)
        return
    }
  })

  /** yak后缀文件中，右键菜单增加'Yak 代码格式化'功能 */
  useEffect(() => {
    /**
     * @description 使用下方的判断逻辑，将导致后续的(额外菜单变动)无法在右键菜单再渲染中生效
     */
    // if (isInitRef.current) return
    rightContextMenu.current = [...DefaultMenuTopArr]
    keyBindingRef.current = {}

    if (type === 'http') {
      rightContextMenu.current = rightContextMenu.current.concat([
        {
          key: 'http-show-break',
          label: getShowBreak() ? t('YakitEditor.hideLineBreaks') : t('YakitEditor.showLineBreaks'),
        },
      ])
    }
    if (isShowSelectRangeMenu) {
      rightContextMenu.current = rightContextMenu.current.concat([
        {
          key: 'toggle-action-bar',
          label: getShowActionBar() ? t('YakitEditor.hideActionBar') : t('YakitEditor.showActionBar'),
        },
      ])
    }
    if (foldBinaryCapable && type === 'http') {
      rightContextMenu.current = rightContextMenu.current.concat([
        {
          key: 'toggle-fold-binary',
          label: getFoldBinaryOpen() ? t('YakitEditor.hideBinaryComponent') : t('YakitEditor.showBinaryComponent'),
        },
      ])
    }
    if (language === 'yak') {
      rightContextMenu.current = rightContextMenu.current.concat([
        { type: 'divider' },
        { key: 'yak-formatter', label: t('YakitEditor.yakCodeFormat') },
      ])
    }
    if (menuType.length > 0) {
      const types = Array.from(new Set(menuType))
      for (let key of types) {
        const obj = { ...extraMenuListsObj[key].menu[0] }
        rightContextMenu.current = rightContextMenu.current.concat([{ type: 'divider' }, obj])
      }
    }
    // 缓存需要排序的自定义菜单
    let sortContextMenu: OtherMenuListProps[] = []
    for (let menus in contextMenu) {
      /* 需要排序项 */
      if (typeof contextMenu[menus].order === 'number') {
        sortContextMenu = sortContextMenu.concat([
          {
            ...contextMenu[menus],
            menu: shallowCloneMenuItems(contextMenu[menus].menu),
          } as any,
        ])
      } else {
        /** 浅拷贝即可，避免 cloneDeep 遍历 ReactNode 导致的性能问题 */
        rightContextMenu.current = rightContextMenu.current.concat(shallowCloneMenuItems(contextMenu[menus].menu))
      }
    }

    // 底部默认菜单
    rightContextMenu.current = rightContextMenu.current.concat([...DefaultMenuBottomArr])

    // 当存在order项则需要排序
    if (sortContextMenu.length > 0) {
      rightContextMenu.current = sortMenuFun(rightContextMenu.current, sortContextMenu)
    }
    rightContextMenu.current = contextMenuKeybindingHandle(t, keyBindingRef, '', rightContextMenu.current)

    if (!forceRenderMenu) isInitRef.current = true
  }, [
    forceRenderMenu,
    menuType,
    contextMenu,
    contextMenuPlugin,
    customHTTPMutatePlugin,
    extraMenuListsObj,
    DefaultMenuTopArr,
    DefaultMenuBottomArr,
    foldBinaryCapable,
    type,
  ])

  /**
   * editor编辑器的额外渲染功能:
   * 1、每行的换行符进行可视字符展示
   */
  const pasteWarning = useThrottleFn(
    () => {
      failed(t('YakitEditor.pasteTooFast'))
    },
    { wait: 500 },
  )

  // ===== Yak 代码格式化 + 静态分析（需在 decoration effect 之前声明） =====
  const { yakCompileAndFormat, yakStaticAnalyze } = useYakFormat({ language, type })

  const rafIdRef = useRef<number | null>(null) // RAF ID
  const deltaDecorationsRef = useRef<() => any>()
  const highLightTextFun = useMemoizedFn(() => highLightText)
  const highLightFindFun = useMemoizedFn(() => highLightFind)
  const fixContentTypeFun = useMemoizedFn(() => fixContentType)
  const originalContentTypeFun = useMemoizedFn(() => originalContentType)
  const fixContentTypeHoverMessageFun = useMemoizedFn(() => fixContentTypeHoverMessage)
  const privacyFun = useMemoizedFn(() => props.privacy)
  // 存储当前的隐私遮挡范围信息
  const privacyMaskRangesRef = useRef<{ id: string; range: monaco.Range }[]>([])
  // 跟踪 model 是否已被释放
  const isModelDisposedRef = useRef<boolean>(false)

  const resolveBinaryFoldHit = useMemoizedFn((position?: { lineNumber: number; column: number } | null) => {
    if (!position) {
      return undefined
    }
    const sameLine = binaryFoldRangesRef.current.filter((item) => item.range.startLineNumber === position.lineNumber)
    if (sameLine.length === 1) {
      return sameLine[0]
    }
    if (sameLine.length > 1) {
      return sameLine.reduce((best, item) =>
        Math.abs(item.range.startColumn - position.column) < Math.abs(best.range.startColumn - position.column)
          ? item
          : best,
      )
    }
    if (binaryFoldRangesRef.current.length === 1) {
      return binaryFoldRangesRef.current[0]
    }
    return undefined
  })

  useEffect(() => {
    if (!editor) {
      return
    }
    const model = editor.getModel()
    if (!model) {
      return
    }
    isModelDisposedRef.current = false

    let current: string[] = []

    /** 随机上下文ID */
    const randomStr = randomString(10)
    /** 对于需要自定义命令的快捷键生成对应的上下文ID */
    let yakitEditor = editor.createContextKey(randomStr, false)
    // @ts-ignore
    yakitEditor.set(true)
    /* limited paste by interval */
    let lastPasteTime = 0
    let pasteLimitInterval = 80
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
      () => {
        const current = new Date().getTime()
        const currentInterval = current - lastPasteTime
        if (currentInterval < pasteLimitInterval) {
          pasteWarning.run()
        } else {
          lastPasteTime = current
          editor.trigger('keyboard', 'editor.action.clipboardPasteAction', {})
        }
      },
      randomStr,
    )
    const generateDecorations = (): YakitIModelDecoration[] => {
      // 检查 model 是否已被释放
      if (!model || isModelDisposedRef.current) return []
      try {
        return generateDecorationsFn({
          model,
          editor,
          type: props.type,
          showHostHint: props.showHostHint,
          privacy: privacyFun(),
          disableUnicodeDecode: disableUnicodeDecodeRef.current,
          highLightText: highLightTextFun(),
          highLightClass,
          highLightFind: highLightFindFun(),
          highLightFindClass,
          fixContentType: fixContentTypeFun(),
          originalContentType: originalContentTypeFun(),
          fixContentTypeHoverMessage: fixContentTypeHoverMessageFun(),
          foldBinaryEnabled,
          binaryFoldEntriesRef,
          binaryFoldRangesRef,
          binaryModifiedOrdinalsRef,
          language: i18n.language,
          t,
          showBreak: getShowBreak(),
          onPrivacyRanges: (ranges) => {
            privacyMaskRangesRef.current = ranges
          },
        })
      } catch (e) {
        // model 可能已被释放
        return []
      }
    }

    const scheduleDecorations = () => {
      // 取消之前排队的 rAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }

      // 只保留最新一次触发
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        if (!model || model.isDisposed()) return
        try {
          current = model.deltaDecorations(current, generateDecorations())
        } catch (e) {}
      })
    }

    deltaDecorationsRef.current = () => {
      scheduleDecorations()
    }

    // 用 versionId 判断内容是否变化，避免每次 getValue 全量字符串比较
    let lastVersionId = model.getVersionId()
    const contentChangeDisposable = editor.onDidChangeModelContent(() => {
      const versionId = model.getVersionId()
      if (versionId === lastVersionId) {
        return
      }
      lastVersionId = versionId
      scheduleDecorations()
    })
    scheduleDecorations()

    // 监听光标位置变化，仅隐私模式需要按光标动态显示/隐藏打码
    const cursorPositionDisposable = editor.onDidChangeCursorPosition(() => {
      if (props.type === 'http' && privacyFun()) {
        scheduleDecorations()
      }
    })

    // 监听查找面板变化
    const findController = editor.getContribution<IFindController>('editor.contrib.findController')
    const state = findController?.getState()
    const findStateDisposable = state?.onFindReplaceStateChange(() => {
      if (!keepSearchName) return
      if (state.isRevealed) {
        keepSearchNameMapStore.setKeepSearchNameMap(keepSearchName, state.searchString || '')
      } else {
        keepSearchNameMapStore.removeKeepSearchNameMap(keepSearchName)
      }
    })

    // Yak 静态分析：挂在同一 effect 内以便 cleanup dispose
    yakStaticAnalyze.run(editor, model)
    // 仅 Yak / SyntaxFlow 语言需要静态分析；其它类型（如 markdown/http）每次输入都触发 setModelMarkers([]) 属无谓开销
    const yakAnalyzeDisposable =
      language === YaklangMonacoSpec || language === SyntaxFlowMonacoSpec
        ? model.onDidChangeContent(() => {
            yakStaticAnalyze.run(editor, model)
          })
        : undefined

    // 添加点击事件处理，用于临时解除 Host 值的打码
    let isHandlingPrivacyClick = false
    const handleHostPrivacyClick = (e: monaco.editor.IEditorMouseEvent) => {
      if (!e.event.leftButton || props.type !== 'http' || isHandlingPrivacyClick) {
        return
      }

      const clickPosition = e.target.position
      if (!clickPosition) {
        return
      }

      // 获取当前光标位置
      const currentCursorPosition = editor.getPosition()

      // 使用存储的隐私遮挡范围来检测点击
      const clickedPrivacyRange = privacyMaskRangesRef.current.find((item) => {
        const range = item.range
        // 检查点击位置是否在遮挡范围内
        return (
          clickPosition.lineNumber === range.startLineNumber &&
          clickPosition.column >= range.startColumn &&
          clickPosition.column <= range.endColumn
        )
      })

      if (clickedPrivacyRange) {
        const range = clickedPrivacyRange.range

        // 检查光标是否已经在这个区域内（遮挡已解除）
        // 如果是，则不需要再设置光标位置
        if (currentCursorPosition) {
          const isCursorAlreadyInRange =
            currentCursorPosition.lineNumber === range.startLineNumber &&
            currentCursorPosition.column >= range.startColumn &&
            currentCursorPosition.column <= range.endColumn
          if (isCursorAlreadyInRange) {
            return // 光标已在区域内，不处理
          }
        }

        isHandlingPrivacyClick = true
        // 将光标移动到隐私区域之后，触发临时解除
        // 光标位置变化会自动通过 onDidChangeCursorPosition 触发装饰器更新
        editor.setPosition({
          lineNumber: range.endLineNumber,
          column: range.endColumn,
        })
        editor.focus()
        // 使用 setTimeout 重置标志，避免连续触发
        setTimeout(() => {
          isHandlingPrivacyClick = false
        }, 100)
      }
    }

    const mouseDownDisposable = editor.onMouseDown(handleHostPrivacyClick)

    // 二进制 Fuzztag 折叠：点击小块打开 HEX 编辑弹窗
    // 打开过程含 await decodeBinaryTag，无互斥时连点会叠多个弹窗
    let isOpeningBinaryEditor = false
    const releaseBinaryEditorLock = () => {
      isOpeningBinaryEditor = false
      try {
        editor.getDomNode()?.classList.remove('binary-fuzz-chip-busy')
      } catch (e) {}
    }
    const openBinaryFoldEditor = async (
      entry: BinaryFuzztagEntry,
      hit: { id: string; range: monaco.Range; ordinal: number },
    ) => {
      if (isOpeningBinaryEditor) {
        return
      }
      isOpeningBinaryEditor = true
      try {
        editor.getDomNode()?.classList.add('binary-fuzz-chip-busy')
      } catch (e) {}

      const showLockedModal = (modalProps: Parameters<typeof showYakitModal>[0]) => {
        return showYakitModal({
          ...modalProps,
          modalAfterClose: () => {
            modalProps.modalAfterClose?.()
            releaseBinaryEditorLock()
          },
        })
      }

      try {
        let initialData: Uint8Array
        try {
          initialData = await decodeBinaryTag(entry)
        } catch (e) {
          initialData = new Uint8Array()
        }
        // 解码期间若已解锁（例如编辑器销毁）则不再弹窗
        if (!isOpeningBinaryEditor) {
          return
        }
        const handleSubmit = async (bytes: Uint8Array, result: BinaryFuzztagSubmitResult) => {
          try {
            if (!result.changed) {
              infoModal.destroy()
              return
            }
            const newTagText = await encodeBytesToTag(entry.kind, entry.tagName, bytes)
            const { text: newPlaceholderText, entries: newEntries } = collapseBinaryFuzztag(newTagText)
            newEntries.forEach((value, key) => {
              binaryFoldEntriesRef.current.set(key, value)
            })
            // 相同二进制标签会拥有相同 id；按点击命中的序号和 range 精确修改当前小块。
            binaryModifiedOrdinalsRef.current.add(hit.ordinal)
            editor.executeEdits('binary-fuzz-fold', [
              {
                range: hit.range,
                text: newPlaceholderText,
                forceMoveMarkers: true,
              },
            ])
          } catch (e) {
            failed(`encode binary fuzztag failed: ${e}`)
          }
          infoModal.destroy()
        }
        // base64 / hex 走"文本/HEX 可切换"的公共编辑器（默认文本）；unquote(Binary) 走字节级 HEX 编辑器
        const useTextHexEditor = entry.kind === 'base64' || entry.kind === 'hex'
        const binaryReadOnly = !!readOnly || !entry.editable
        const editorAction = binaryReadOnly ? 'View' : 'Edit'
        const editorTitle = useTextHexEditor
          ? `${editorAction} ${entry.kind === 'base64' ? 'Base64' : 'HexString'} - {{${entry.tagName}(...)}}`
          : `${editorAction} Binary - {{${entry.tagName}(...)}}`

        const infoModal = showLockedModal({
          title: editorTitle,
          width: '60%',
          footer: null,
          content: useTextHexEditor ? (
            <Base64HexFuzztagModal
              entry={entry}
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={() => infoModal.destroy()}
            />
          ) : (
            <React.Suspense fallback={null}>
              <BinaryFuzztagHexModal
                entry={entry}
                readOnly={binaryReadOnly}
                initialData={initialData}
                onSubmit={handleSubmit}
                onCancel={() => infoModal.destroy()}
              />
            </React.Suspense>
          ),
        })
      } catch (e) {
        releaseBinaryEditorLock()
      }
    }

    const handleBinaryFoldClick = (e: monaco.editor.IEditorMouseEvent) => {
      if (!foldBinaryEnabled || !e.event.leftButton || isOpeningBinaryEditor) {
        return
      }
      // 仅当点击命中小块本身（橙色/蓝色块）才触发；占位为零宽，行尾空白区域不应响应
      const domTarget = (e.event.browserEvent?.target ?? null) as HTMLElement | null
      const chipEl =
        domTarget && typeof domTarget.closest === 'function' ? domTarget.closest('.binary-fuzz-chip') : null
      if (!chipEl) {
        return
      }
      const hit = resolveBinaryFoldHit(e.target.position)
      if (!hit) {
        return
      }
      const entry = binaryFoldEntriesRef.current.get(hit.id)
      if (!entry) {
        return
      }
      openBinaryFoldEditor(entry, hit)
    }
    const binaryFoldMouseDownDisposable = editor.onMouseDown(handleBinaryFoldClick)

    // file 是引擎资源引用，不参与二进制折叠。保留真实标签和路径，同时在
    // 本地引擎模式支持 Ctrl+点击定位文件；远程路径不能交给 GUI 机器打开。
    const handleFileReferenceClick = (e: monaco.editor.IEditorMouseEvent) => {
      if (!e.event.leftButton || !e.event.ctrlKey || !e.target.position) {
        return
      }
      const { lineNumber, column } = e.target.position
      const filePath = findFileFuzztagPathAtOffset(model.getLineContent(lineNumber), column - 1)
      if (!filePath) {
        return
      }
      if (!canLocateFileReference(true, SystemInfo.mode, filePath)) {
        failed('Remote engine file paths cannot be located in the local file manager')
        return
      }
      window
        .require('electron')
        .ipcRenderer.invoke('is-file-exists', filePath)
        .then((exists: boolean) => {
          if (exists) {
            openABSFileLocated(filePath)
          } else {
            failed('File path does not exist on this computer')
          }
        })
        .catch((error: unknown) => failed(`Locate file failed: ${error}`))
    }
    const fileReferenceMouseDownDisposable = editor.onMouseDown(handleFileReferenceClick)

    // 二进制 Fuzztag 折叠：拦截 copy/cut，确保复制到剪贴板的是真实内容而非占位
    // 捕获阶段统一覆盖 Ctrl+C/X、monaco clipboard action、右键菜单
    const handleEditorClipboard = (ev: ClipboardEvent) => {
      try {
        if (!foldBinaryEnabled) {
          return
        }
        const selection = editor.getSelection()
        if (!selection || selection.isEmpty()) {
          return
        }
        const selected = model.getValueInRange(selection)
        if (!selected || selected.indexOf('#YBIN_') < 0) {
          return
        }
        const expanded = expandBinaryFuzztag(selected, binaryFoldEntriesRef.current)
        // 选区里有占位就一定接管复制：preventDefault 并写入还原后的真实内容，
        // 绝不让 #YBIN_ 占位泄漏到剪贴板
        ev.clipboardData?.setData('text/plain', expanded)
        ev.preventDefault()
        if (ev.type === 'cut' && !readOnly) {
          editor.executeEdits('binary-fuzz-cut', [{ range: selection, text: '' }])
        }
      } catch (e) {}
    }
    const editorDomNode = editor.getDomNode()
    editorDomNode?.addEventListener('copy', handleEditorClipboard, true)
    editorDomNode?.addEventListener('cut', handleEditorClipboard, true)
    // 把本编辑器的"占位 id -> 标签信息"映射登记到全局注册表(以 model 为 key)，
    // 供右键自定义复制/fetchCursorContent 等不经过 DOM copy 事件的路径也能还原占位
    registerBinaryFoldEntries(model, binaryFoldEntriesRef.current)

    return () => {
      try {
        isModelDisposedRef.current = true
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
        contentChangeDisposable.dispose()
        cursorPositionDisposable.dispose()
        findStateDisposable?.dispose()
        yakAnalyzeDisposable?.dispose()
        mouseDownDisposable.dispose()
        binaryFoldMouseDownDisposable.dispose()
        fileReferenceMouseDownDisposable.dispose()
        releaseBinaryEditorLock()
        editorDomNode?.removeEventListener('copy', handleEditorClipboard, true)
        editorDomNode?.removeEventListener('cut', handleEditorClipboard, true)
        unregisterBinaryFoldEntries(model)
        yakStaticAnalyze.cancel()
        // 先释放 model（含大文本 buffer），再 dispose editor。
        // editor.dispose() 只 detach model 不释放其 buffer；model 须显式 dispose 才会从 modelService._models 移除并释放文本缓冲区。
        // 否则大内容（如数 MB 响应）的 TextModel 会被 modelService 强引用持久持有，关闭后内存无法回收。
        model.dispose()
        editor.dispose()
      } catch (e) {}
    }
  }, [editor])
  const highLightTextKey = highLightFingerprint(highLightText)
  const highLightFindKey = highLightFingerprint(highLightFind)
  useEffect(() => {
    if (deltaDecorationsRef.current) {
      disableUnicodeDecodeRef.current = props.disableUnicodeDecode
      deltaDecorationsRef.current()
    }
  }, [
    highLightTextKey,
    highLightFindKey,
    props.disableUnicodeDecode,
    props.fixContentType,
    props.originalContentType,
    props.fixContentTypeHoverMessage,
    i18nRefresh,
    props.privacy,
    showBreak,
  ])
  // 定位高亮光标位置
  useDebounceEffect(
    () => {
      try {
        if (editor && isPositionHighLightCursor && highLightFind?.length) {
          const model = editor.getModel()
          if ('startOffset' in highLightFind[0]) {
            const startPosition = model?.getPositionAt(Number(highLightFind[0].startOffset))
            if (startPosition) {
              editor.revealPositionInCenter(startPosition)
            }
          } else if ('startLineNumber' in highLightFind[0]) {
            editor.revealPositionInCenter({
              lineNumber: highLightFind[0].startLineNumber,
              column: highLightFind[0].startColumn,
            })
          }
        }
      } catch (error) {}
    },
    [editor, isPositionHighLightCursor, highLightFindKey],
    { wait: 300 },
  )

  /** 右键菜单-重渲染换行符功能是否显示的开关文字内容 */
  useEffect(() => {
    const flag = rightContextMenu.current.filter((item) => {
      return (item as EditorMenuItemProps)?.key === 'http-show-break'
    })
    if (flag.length > 0 && type === 'http') {
      for (let item of rightContextMenu.current) {
        const info = item as EditorMenuItemProps
        if (info?.key === 'http-show-break')
          info.label = getShowBreak() ? t('YakitEditor.hideLineBreaks') : t('YakitEditor.showLineBreaks')
      }
    }
  }, [showBreak])

  useEffect(() => {
    if (!isShowSelectRangeMenu) return
    for (let item of rightContextMenu.current) {
      const info = item as EditorMenuItemProps
      if (info?.key === 'toggle-action-bar') {
        info.label = getShowActionBar() ? t('YakitEditor.hideActionBar') : t('YakitEditor.showActionBar')
      }
    }
  }, [showActionBar])

  useEffect(() => {
    if (!foldBinaryCapable || type !== 'http') return
    for (let item of rightContextMenu.current) {
      const info = item as EditorMenuItemProps
      if (info?.key === 'toggle-fold-binary') {
        info.label = getFoldBinaryOpen() ? t('YakitEditor.hideBinaryComponent') : t('YakitEditor.showBinaryComponent')
      }
    }
  }, [foldBinaryOpen, foldBinaryCapable, type, i18nRefresh])

  const showContextMenu = useMemoizedFn((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    showByRightContext({
      width: 180,
      parentTitleClick: true,
      // @ts-ignore
      data: [...rightContextMenu.current],
      onClick: ({ key, keyPath }) => {
        menuItemHandle(key, keyPath)
      },
    })
  })

  const downPosY = useRef<number>()
  const upPosY = useRef<number>()
  const onScrollTop = useRef<number>()
  // 编辑器信息(长宽等)
  const editorInfo = useRef<any>()
  useEffect(() => {
    if (editor && isShowSelectRangeMenu) {
      editerMenuFun({
        editor,
        selectNode,
        rangeNode,
        readOnly,
        value,
        overLine,
        getShowActionBar,
        execAutoDecodeCallback,
        editorInfoRef: editorInfo,
        fizzSelectTimeoutIdRef: fizzSelectTimeoutId,
        fizzRangeTimeoutIdRef: fizzRangeTimeoutId,
        downPosYRef: downPosY,
        upPosYRef: upPosY,
        onScrollTopRef: onScrollTop,
        onOpenSmartDecode,
      })
    }
  }, [editor, isShowSelectRangeMenu])
  // 定时消失的定时器
  const fizzSelectTimeoutId = useRef<NodeJS.Timeout>()
  const fizzRangeTimeoutId = useRef<NodeJS.Timeout>()
  const [smartDecode, setSmartDecode] = useState<{
    openId: number
    rangeValue: string
    editorInfo?: EditorDetailInfoProps
    anchorRect: SmartDecodeAnchorRect
  } | null>(null)
  const openSmartDecodeRef = useRef<(rangeValue: string, info?: EditorDetailInfoProps, rect?: DOMRect) => void>()
  openSmartDecodeRef.current = (rangeValue, info, rect) => {
    if (!rect) return
    setSmartDecode({
      openId: Date.now(), // 强制 remount，避免旧拖拽位移残留
      rangeValue,
      editorInfo: info,
      anchorRect: snapshotRect(rect),
    })
  }

  const onOpenSmartDecode = useMemoizedFn((rangeValue: string, anchorRect?: DOMRect) => {
    openSmartDecodeRef.current?.(rangeValue, editorInfo.current, anchorRect)
  })
  // 编辑器菜单

  useEffect(() => {
    // 此处一个页面可能存在多个monaco
    // 因此仅仅在monaco刚打开时获取最新的快捷键事件和对应按键
    getStorageYakEditorShortcutKeyEvents()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      // 阻止事件冒泡
      event.stopPropagation()
    }
    const inputElement = ref.current
    inputElement && inputElement.addEventListener('keydown', handleKeyDown)
    // 清理函数
    return () => {
      if (inputElement) {
        inputElement.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [])

  // 数组去重
  const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)
  useEffect(() => {
    if (Array.isArray(shortcutIds)) {
      setFocusIds((prev) => filterItem([...prev, ...shortcutIds]))
    }
  }, [shortcutIds])

  const editorOptions = useMemo(
    () => ({
      readOnly: readOnly,
      scrollBeyondLastLine: false,
      fontWeight: '500',
      fontSize: nowFontsize || 12,
      showFoldingControls: 'always' as const,
      showUnused: true,
      wordWrap: (noWordWrap ? 'off' : 'on') as 'off' | 'on',
      renderLineHighlight,
      lineNumbers: (noLineNumber ? 'off' : 'on') as 'off' | 'on',
      minimap: noMiniMap ? { enabled: false } : undefined,
      lineNumbersMinChars: lineNumbersMinChars || 5,
      contextmenu: false,
      // 保持 all：与换行符 decoration / binary chip 空格策略一致，避免改变既有视觉行为
      renderWhitespace: 'all' as const,
      bracketPairColorization: {
        enabled: true,
        independentColorPoolPerBracketType: true,
      },
      fixedOverflowWidgets: true,
      renderValidationDecorations: renderValidationDecorations,
      glyphMargin,
    }),
    [
      readOnly,
      nowFontsize,
      noWordWrap,
      renderLineHighlight,
      noLineNumber,
      noMiniMap,
      lineNumbersMinChars,
      renderValidationDecorations,
      glyphMargin,
    ],
  )

  return (
    <div
      ref={ref}
      className={classNames('yakit-editor-code', styles['yakit-editor-wrapper'], {
        'yakit-editor-wrap-style': !showBreak,
        [styles['yakit-editor-disabled']]: disabled,
      })}
    >
      {/* 查看 monaco 的对应代码 colors 所需 token 值*/}
      {/* <button onClick={inspectTokens}>查看 token</button> */}
      <ReactResizeDetector
        onResize={(width, height) => {
          if (!width || !height) return
          /** 重绘编辑器尺寸 */
          if (editor) editor.layout({ height, width })
          /** 记录当前编辑器外边框尺寸 */
          preWidthRef.current = width
          preHeightRef.current = height
        }}
        handleWidth={true}
        handleHeight={true}
        refreshMode={'debounce'}
        refreshRate={30}
      />
      {disabled && <div className={styles['yakit-editor-shade']}></div>}
      {smartDecode && (
        <div className={styles['smart-decode-float-host']}>
          <SmartDecodeFloatPanel
            key={smartDecode.openId}
            rangeValue={smartDecode.rangeValue}
            editorInfo={smartDecode.editorInfo}
            anchorRect={smartDecode.anchorRect}
            onClose={() => setSmartDecode(null)}
            replace={(text) => {
              editor?.trigger('keyboard', 'paste', { text })
              setSmartDecode(null)
            }}
          />
        </div>
      )}
      <div
        className={styles['yakit-editor-container']}
        onContextMenu={(e) => {
          e.stopPropagation()
          e.preventDefault()
          showContextMenu(e)
        }}
      >
        <ShortcutKeyFocusHook style={{ height: '100%', width: '100%', overflow: 'hidden' }} focusId={focusIds}>
          <MonacoEditor
            // height={100}
            key={foldBinaryEnabled ? 'binary-fold-on' : 'binary-fold-off'}
            theme={theme || 'kurior'}
            value={displayValue}
            onChange={handleBinaryChange}
            language={language}
            editorDidMount={(editor: YakitIMonacoEditor, monaco) => {
              setEditor(editor)
              if (keepSearchName) {
                const keyword = keepSearchNameMap.get(keepSearchName)
                if (keyword) {
                  openFind(editor, keyword)
                }
              }
              /** 编辑器关光标，设置坐标0的初始位置 */
              editor.setSelection({
                startColumn: 0,
                startLineNumber: 0,
                endColumn: 0,
                endLineNumber: 0,
              })

              editor.onKeyDown((e) => {
                // 是否直接使用编辑器快捷键 不走自定义逻辑
                const isUseDefaultShortcut = isYakEditorDefaultShortcut(e.browserEvent)
                if (!isUseDefaultShortcut) {
                  // 判断当前输入是否激活 编辑器内部快捷键
                  const isActiveYakEditor = isYakEditorShortcut(e.browserEvent)
                  if (isActiveYakEditor) {
                    const keys = convertKeyEventToKeyCombination(e.browserEvent)
                    if (keys) {
                      let sortKeys = sortKeysCombination(keys)
                      const keyToMenu = keyBindingRef.current[sortKeys.join('-')]
                      if (!keyToMenu) return
                      menuItemHandle(keyToMenu[0], keyToMenu)
                    }
                    e.browserEvent.stopImmediatePropagation()
                    return
                  }
                  // 判断当前输入是否激活 页面级或全局快捷键
                  const event = isPageOrGlobalShortcut(e.browserEvent)
                  if (event) {
                    // 未接入时特殊处理removePage,接入monaco快捷键后移除此项
                    if (['removePage'].includes(event)) e.browserEvent.stopImmediatePropagation()
                    // 由于目前 存在老版本键盘快捷键(line：1112) 暂时不做后续接入 等待第二版焦点与monaco绑定
                    // e.browserEvent.stopImmediatePropagation()
                    return
                  }
                }
              })

              if (editorDidMount) editorDidMount(editor, monaco)
            }}
            options={editorOptions}
          />
        </ShortcutKeyFocusHook>
      </div>
    </div>
  )
})
