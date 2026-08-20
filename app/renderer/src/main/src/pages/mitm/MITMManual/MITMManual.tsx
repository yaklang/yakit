import React, { forwardRef, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type {
  CurrentPacketInfoProps,
  LargeRequestReplacementResult,
  ManualHijackInfoProps,
  ManualHijackInfoRefProps,
  MITMManualProps,
  MITMV2ManualEditorProps,
  PackageTypeProps,
  RenderAndHexTypeOptions,
  RenderAndHexTypeOptionVal,
} from './MITMManualType'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import {
  type ClientMITMHijackedResponse,
  grpcClientMITMHijacked,
  isMITMV2Response,
  type MITMV2Response,
  type SingleManualHijackInfoMessage,
} from '../MITMHacker/utils'
import {
  useControllableValue,
  useCreation,
  useGetState,
  useInViewport,
  useMap,
  useMemoizedFn,
  useUpdateEffect,
} from 'ahooks'
import type { ColumnsTypeProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import {
  ManualHijackListAction,
  ManualHijackListStatus,
  ManualHijackListStatusMap,
  PackageType,
} from '@/defaultConstants/mitmV2'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { showByRightContext } from '@/components/yakitUI/YakitMenu/showByRightContext'
import type { OtherMenuListProps } from '@/components/yakitUI/YakitEditor/YakitEditorType'
import { availableColors, onSendToTab } from '@/components/HTTPFlowTable/HTTPFlowTable'
import { filterColorTag } from '@/components/TableVirtualResize/utils'
import classNames from 'classnames'
import styles from './MITMManual.module.scss'
import {
  grpcMITMSetColor,
  grpcMITMV2Drop,
  grpcMITMV2Forward,
  grpcMITMV2HijackedCurrentResponse,
  type MITMV2SubmitPayloadDataRequest,
  grpcMITMV2SubmitRequestData,
  grpcMITMV2SubmitResponseData,
  type MITMSetColorRequest,
  type MITMV2DropRequest,
  type MITMV2SubmitRequestDataRequest,
  type MITMV2SubmitRequestDataResponseRequest,
  grpcMITMV2SubmitPayloadData,
  type MITMV2HijackedCurrentResponseRequest,
} from './utils'
import { yakitNotify } from '@/utils/notification'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'
import { type IMonacoEditor, NewHTTPPacketEditor } from '@/utils/editors'
import type { EditorMenuItemType } from '@/components/yakitUI/YakitEditor/EditorMenu'
import { openPacketNewWindow } from '@/utils/openWebsite'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { cloneDeep, isEqual } from 'lodash'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteGV } from '@/yakitGV'
import { setClipboardText } from '@/utils/clipboard'
import { OutlineArrowleftIcon, OutlineArrowrightIcon, OutlineLoadingIcon } from '@/assets/icon/outline'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import MITMContext, { MITMVersion } from '../Context/MITMContext'
import { convertKeyboardToUIKey } from '@/utils/globalShortcutKey/utils'
import {
  getGlobalShortcutKeyEvents,
  GlobalShortcutKey,
  ShortcutKeyFocusType,
} from '@/utils/globalShortcutKey/events/global'
import useShortcutKeyTrigger from '@/utils/globalShortcutKey/events/useShortcutKeyTrigger'
import { formatPacketRender, prettifyPacketCode, prettifyPacketRender } from '@/utils/prettifyPacket'
import { YakitCheckableTag } from '@/components/yakitUI/YakitTag/YakitCheckableTag'
import { YakEditorOptionShortcutKey } from '@/utils/globalShortcutKey/events/page/yakEditor'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getMitmShortcutKeyEvents, MitmShortcutKey } from '@/utils/globalShortcutKey/events/page/mitm'
import { JSONParseLog } from '@/utils/tool'
import { applyManualHijackBatch, decorateManualHijackRows } from './manualHijackListModel'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { LargeRequestFileReplaceModal } from './LargeMultipartFileReplaceModal'
import {
  getLargeRequestReplacementKey,
  matchLargeRequestReplacementLine,
  withLargeRequestReplacementLineNumber,
  sanitizeChipInjectedText,
  type LargeRequestReplacementMarker,
} from './largeMultipartReplacement'

const MITMManual: React.FC<MITMManualProps> = React.memo(
  forwardRef((props, ref) => {
    const {
      autoForward,
      downstreamProxyStr,
      handleAutoForward,
      setManualTableTotal,
      setManualTableSelectNumber,
      isOnlyLookResponse,
      hijackFilterFlag,
      setAutoForward,
    } = props
    const { t, i18nRefresh } = useI18nNamespaces(['history', 'yakitUi', 'mitm'])
    const [data, setData] = useState<SingleManualHijackInfoMessage[]>([])
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [currentSelectItem, setCurrentSelectItem, getCurrentSelectItem] = useGetState<SingleManualHijackInfoMessage>()
    const [editorShowIndex, setEditorShowIndexShowIndex] = useState<number>(0) // request 编辑器中显示的index
    const [scrollToIndex, setScrollToIndex] = useState<number>()

    const [loadingMap, { set: setLoading, remove: removeLoading, get: getLoading, reset: resetLoading }] = useMap<
      string,
      boolean
    >(new Map())

    // 超大请求替换结果按 TaskID 持久化，切行重开仍可回显「已替换为」
    const [largeRequestReplacementsByTaskID, setLargeRequestReplacementsByTaskID] = useState<
      Record<string, Record<string, LargeRequestReplacementResult>>
    >({})
    const clearLargeRequestReplacements = useMemoizedFn((taskID: string) => {
      setLargeRequestReplacementsByTaskID((previous) => {
        if (!(taskID in previous)) return previous
        const next = { ...previous }
        delete next[taskID]
        return next
      })
    })
    const onLargeRequestReplacementComplete = useMemoizedFn(
      (taskID: string, replacementKey: string, result: LargeRequestReplacementResult) => {
        setLargeRequestReplacementsByTaskID((previous) => ({
          ...previous,
          [taskID]: {
            ...previous[taskID],
            [replacementKey]: result,
          },
        }))
      },
    )

    // 性能优化：currentOrder 仅在 forwardHandlerV2 中赋值 arrivalOrder，不在 JSX 中读取，改为 ref 避免 Add 消息触发重渲染
    const currentOrderRef = useRef<number>(1)
    const addOrder = useMemoizedFn(() => {
      currentOrderRef.current++
    })
    const setOrder = useMemoizedFn((v: number) => {
      currentOrderRef.current = v
    })
    const resetOrder = useMemoizedFn(() => {
      currentOrderRef.current = 1
    })
    // 性能优化：intervalTime 仅用于控制 flush 定时器的启停，不在 JSX 中读取。
    // 改为 ref + 手动 setInterval/clearInterval，避免每次 flush 周期的两次 setState 重渲染
    const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const startFlushInterval = useMemoizedFn(() => {
      if (flushIntervalRef.current !== null) return
      flushIntervalRef.current = setInterval(() => {
        handleManualHijackList()
      }, 100)
    })
    const stopFlushInterval = useMemoizedFn(() => {
      if (flushIntervalRef.current !== null) {
        clearInterval(flushIntervalRef.current)
        flushIntervalRef.current = null
      }
    })
    const mitmV2HijackInfoRef = useRef<SingleManualHijackInfoMessage[]>([])
    const mitmV2HijackIndexRef = useRef<Map<string, number>>(new Map())
    const displayedHijackByTaskID = useMemo(() => new Map(data.map((item) => [item.TaskID, item])), [data])

    const manualHijackInfoRef = useRef<ManualHijackInfoRefProps>({
      onSubmitData: () => {},
      onHijackingResponse: () => {},
    })
    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
      return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])
    useImperativeHandle(ref, () => {
      return {
        onBatchDiscardData: () => onBatchDiscardData(),
        onBatchSubmitData: () => onBatchSubmitData(),
        onBatchHijackingResponse: () => onBatchHijackingResponse(),
        onSubmitAllData: () => onSubmitAllData(),
      }
    }, [])

    useEffect(() => {
      // v2版本的手动劫持处理
      if (mitmVersion !== MITMVersion.V2) return
      grpcClientMITMHijacked(mitmVersion).on((data: ClientMITMHijackedResponse) => {
        if (mitmVersion === MITMVersion.V2) {
          if (!isMITMV2Response(data)) return
          forwardHandlerV2(data)
        }
      })
      return () => {
        stopFlushInterval()
        grpcClientMITMHijacked(mitmVersion).remove()
      }
    }, [])
    useEffect(() => {
      if (autoForward !== 'manual') {
        resetOrder()
      }
    }, [autoForward])

    const forwardHandlerV2 = useMemoizedFn((value: MITMV2Response) => {
      if (autoForward !== 'manual' && value.ManualHijackListAction) {
        if (hijackFilterFlag) {
          setAutoForward('manual')
          yakitNotify('info', t('MITMManual.conditional_hijack_triggered'))
        }
      }
      const hijackData = value.ManualHijackList[0]
      switch (value.ManualHijackListAction) {
        case ManualHijackListAction.Hijack_List_Add: // 新增的需要考虑到达顺序/arrivalOrder
          if (hijackData) {
            const item: SingleManualHijackInfoMessage = {
              ...hijackData,
              arrivalOrder: currentOrderRef.current,
              manualHijackListAction: ManualHijackListAction.Hijack_List_Add,
            }
            if (!mitmV2HijackIndexRef.current.has(item.TaskID)) {
              mitmV2HijackIndexRef.current.set(item.TaskID, mitmV2HijackInfoRef.current.length)
            }
            mitmV2HijackInfoRef.current.push(item)
            addOrder()
          }
          break
        case ManualHijackListAction.Hijack_List_Delete:
          {
            const deleteIndex = mitmV2HijackIndexRef.current.get(hijackData.TaskID) ?? -1
            const deleteItem: SingleManualHijackInfoMessage = {
              ...hijackData,
              manualHijackListAction: ManualHijackListAction.Hijack_List_Delete,
            }
            if (deleteIndex === -1) {
              mitmV2HijackIndexRef.current.set(deleteItem.TaskID, mitmV2HijackInfoRef.current.length)
              mitmV2HijackInfoRef.current.push(deleteItem)
            } else {
              mitmV2HijackInfoRef.current.splice(deleteIndex, 1, {
                ...deleteItem,
                arrivalOrder: mitmV2HijackInfoRef.current[deleteIndex].arrivalOrder,
              })
            }
          }
          break
        case ManualHijackListAction.Hijack_List_Update:
          {
            const updateIndex = mitmV2HijackIndexRef.current.get(hijackData.TaskID) ?? -1
            const updateItem: SingleManualHijackInfoMessage = {
              ...hijackData,
              manualHijackListAction: ManualHijackListAction.Hijack_List_Update,
            }
            if (updateIndex === -1) {
              // 缓存数据中没有数据，直接使用data
              const displayedItem = displayedHijackByTaskID.get(hijackData.TaskID)
              if (displayedItem) {
                mitmV2HijackIndexRef.current.set(hijackData.TaskID, mitmV2HijackInfoRef.current.length)
                mitmV2HijackInfoRef.current.push({
                  ...updateItem,
                  arrivalOrder: displayedItem.arrivalOrder,
                })
              }
            } else {
              // 同一刷新窗口内后到的状态覆盖先到的，避免 wait hijack 盖住 hijacking response
              // 保留原 action：若先 Add 再 Update，仍按新增入库，否则刷新时列表还没有该行会被丢掉
              const prev = mitmV2HijackInfoRef.current[updateIndex]
              const manualHijackListAction =
                prev.manualHijackListAction === ManualHijackListAction.Hijack_List_Add
                  ? ManualHijackListAction.Hijack_List_Add
                  : ManualHijackListAction.Hijack_List_Update
              mitmV2HijackInfoRef.current[updateIndex] = {
                ...updateItem,
                manualHijackListAction,
                arrivalOrder: prev.arrivalOrder,
              }
            }
          }
          break
        case ManualHijackListAction.Hijack_List_Reload:
          {
            mitmV2HijackInfoRef.current = []
            mitmV2HijackIndexRef.current.clear()
            stopFlushInterval()
            resetLoading()
            setLargeRequestReplacementsByTaskID({})
            let order = 0
            const newData = value.ManualHijackList.map((ele) => {
              order += 1
              return {
                ...ele,
                arrivalOrder: order,
              }
            })
            setOrder(order + 1)
            setCurrentSelectItem(undefined)
            setEditorShowIndexShowIndex(0)
            setData(newData)
            setIsRefresh(!isRefresh)
          }
          break
        default:
          break
      }
      if (mitmV2HijackInfoRef.current.length > 0 && flushIntervalRef.current === null) {
        startFlushInterval()
      }
    })
    /**处理手动劫持数据,后端在发送数据得时候已经做过节流/防抖处理 */
    const handleManualHijackList = useMemoizedFn(() => {
      const length = mitmV2HijackInfoRef.current.length
      if (!length) return
      let newSelectItem = currentSelectItem
      let newEditorShowIndexShowIndex = editorShowIndex
      const { data: mergedData } = applyManualHijackBatch(data, mitmV2HijackInfoRef.current, {
        onAdd: (item, dataBeforeAdd) => {
          const taskID = item.TaskID
          setLoading(taskID, false)
          if (dataBeforeAdd.length === 0 && !newSelectItem) {
            newSelectItem = {
              ...item,
            }
            newEditorShowIndexShowIndex = 0
          }
          if (item.Status === ManualHijackListStatus.Hijacking_Request && isOnlyLookResponse) {
            setLoading(taskID, true)
            // 该状态下默认劫持响应为true时,自动发送劫持响应数据
            const params: MITMV2HijackedCurrentResponseRequest = {
              TaskID: taskID,
              SendPacket: true,
              Request: item.Request,
            }
            grpcMITMV2HijackedCurrentResponse(params)
          }
        },
        onDelete: (item, dataAfterDelete) => {
          const taskID = item.TaskID
          removeLoading(taskID)
          clearLargeRequestReplacements(taskID)
          if (newSelectItem?.TaskID === taskID) {
            if (dataAfterDelete.length === 0) {
              newEditorShowIndexShowIndex = 0
              newSelectItem = undefined
            } else if (dataAfterDelete.length === 1) {
              newEditorShowIndexShowIndex = 0
              newSelectItem = dataAfterDelete.at(0)
            } else if (newEditorShowIndexShowIndex >= dataAfterDelete.length - 1) {
              newEditorShowIndexShowIndex = dataAfterDelete.length - 1
              newSelectItem = dataAfterDelete.at(newEditorShowIndexShowIndex)
            } else {
              newSelectItem = dataAfterDelete.at(newEditorShowIndexShowIndex)
            }
          }
        },
        onUpdate: (item, found) => {
          const taskID = item.TaskID
          setLoading(taskID, false)
          if (found && newSelectItem?.TaskID === taskID) {
            newSelectItem = {
              ...item,
            }
          }
        },
      })
      setCurrentSelectItem(newSelectItem)
      setEditorShowIndexShowIndex(newSelectItem ? newEditorShowIndexShowIndex : 0)
      // 性能优化：只对新增/更新的行计算 cellClassName，未变化的行保持原对象引用，
      // 让 TableVirtualResize 的 CellRender memo 能跳过未变化行的 reconciliation
      const changedTaskIDs = new Set<string>()
      for (let index = 0; index < length; index++) {
        const item = mitmV2HijackInfoRef.current[index]
        if (
          item.manualHijackListAction === ManualHijackListAction.Hijack_List_Add ||
          item.manualHijackListAction === ManualHijackListAction.Hijack_List_Update
        ) {
          changedTaskIDs.add(item.TaskID)
        }
      }
      const newData = decorateManualHijackRows(mergedData, filterColorTag, changedTaskIDs)
      setData(newData)
      mitmV2HijackInfoRef.current = []
      mitmV2HijackIndexRef.current.clear()
      stopFlushInterval()
    })

    const getMitmManualContextMenu = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
      const getStatusStr = () => {
        switch (rowData.Status) {
          case ManualHijackListStatus.Hijacking_Request:
          case ManualHijackListStatus.WaitHijack:
            return '请求'
          case ManualHijackListStatus.Hijacking_Response:
            return '响应'
          default:
            return ''
        }
      }

      let menu = [
        {
          key: 'submit-data',
          label: (
            <div className={styles['context-menu-keybind-wrapper']}>
              <div className={styles['content-style']}>放行{getStatusStr()}</div>
              <div className={classNames(styles['keybind-style'], 'keys-style')}>
                {convertKeyboardToUIKey(getMitmShortcutKeyEvents()[MitmShortcutKey.SubmitDataMitm].keys)}
              </div>
            </div>
          ),
        },
        {
          key: 'hijacking-response',
          label: (
            <div className={styles['context-menu-keybind-wrapper']}>
              <div className={styles['content-style']}>劫持响应</div>
              <div className={classNames(styles['keybind-style'], 'keys-style')}>
                {convertKeyboardToUIKey(getMitmShortcutKeyEvents()[MitmShortcutKey.HijackResponseMitm].keys)}
              </div>
            </div>
          ),
        },
        {
          key: 'copy-url',
          label: t('MITMManual.copy_url'),
        },
        {
          key: 'discard-data',
          label: (
            <div className={styles['context-menu-keybind-wrapper']}>
              <div className={styles['content-style']}>丢弃{getStatusStr()}</div>
              <div className={classNames(styles['keybind-style'], 'keys-style')}>
                {convertKeyboardToUIKey(getMitmShortcutKeyEvents()[MitmShortcutKey.DropDataMitm].keys)}
              </div>
            </div>
          ),
        },
        {
          key: 'send-webFuzzer',
          label: t('MITMManual.send_to_web_fuzzer'),
          children: [
            // SystemInfo
            {
              key: 'send-and-jump-to-webFuzzer',
              label: (
                <div className={styles['context-menu-keybind-wrapper']}>
                  <div className={styles['content-style']}>发送并跳转</div>
                  <div className={classNames(styles['keybind-style'], 'keys-style')}>
                    {convertKeyboardToUIKey(
                      getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendAndJumpToWebFuzzer].keys,
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'send-to-webFuzzer',
              label: (
                <div className={styles['context-menu-keybind-wrapper']}>
                  <div className={styles['content-style']}>仅发送</div>
                  <div className={classNames(styles['keybind-style'], 'keys-style')}>
                    {convertKeyboardToUIKey(getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendToWebFuzzer].keys)}
                  </div>
                </div>
              ),
            },
          ],
        },
        {
          key: 'mark-color',
          label: t('MITMManual.mark_color'),
          children: availableColors.map((i) => {
            return {
              key: i.title,
              label: i.render(t),
            }
          }),
        },
        {
          key: 'remove-color',
          label: t('MITMManual.remove_color'),
        },
      ]
      if (rowData.Status !== ManualHijackListStatus.Hijacking_Request) {
        menu = menu.filter((item) => item.key !== 'hijacking-response')
      }
      if (rowData.Status === ManualHijackListStatus.WaitHijack) {
        menu = menu.filter((item) => ['copy-url', 'send-webFuzzer'].includes(item.key))
      }
      return menu
    })

    const mitmV2ManualTableRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(mitmV2ManualTableRef)
    useShortcutKeyTrigger('sendAndJump*common', (focus) => {
      const item = (focus || []).find((item) => item.startsWith(ShortcutKeyFocusType.Monaco))
      if (inViewport && !item) {
        onSendToTab(getCurrentSelectItem(), true, downstreamProxyStr, true)
      }
    })

    useShortcutKeyTrigger('send*common', (focus) => {
      const item = (focus || []).find((item) => item.startsWith(ShortcutKeyFocusType.Monaco))
      if (inViewport && !item) {
        onSendToTab(getCurrentSelectItem(), false, downstreamProxyStr, true)
      }
    })

    useShortcutKeyTrigger(MitmShortcutKey.HijackResponseMitm, () => {
      currentSelectItem && manualHijackInfoRef.current.onHijackingResponse(currentSelectItem)
    })

    useShortcutKeyTrigger(MitmShortcutKey.DropDataMitm, () => {
      currentSelectItem && onDiscardData(currentSelectItem)
    })

    useShortcutKeyTrigger(MitmShortcutKey.SubmitDataMitm, () => {
      currentSelectItem && manualHijackInfoRef.current.onSubmitData(currentSelectItem)
    })

    const onRowContextMenu = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
      if (rowData.TaskID !== currentSelectItem?.TaskID) {
        onSetCurrentRow(rowData)
      }

      const menu = getMitmManualContextMenu(rowData)

      showByRightContext({
        width: 180,
        data: menu,
        onClick: ({ key, keyPath }) => {
          if (keyPath.includes('mark-color')) {
            const colorItem = availableColors.find((e) => e.title === key)
            if (!colorItem) return
            onSetColor(colorItem.color, rowData)
            return
          }
          switch (key) {
            case 'hijacking-response':
              manualHijackInfoRef.current.onHijackingResponse(rowData)
              break
            case 'submit-data':
              manualHijackInfoRef.current.onSubmitData(rowData)
              break
            case 'copy-url':
              setClipboardText(rowData.URL)
              break
            case 'discard-data':
              onDiscardData(rowData)
              break
            case 'send-and-jump-to-webFuzzer':
              onSendToTab(rowData, true, downstreamProxyStr, true)
              break
            case 'send-to-webFuzzer':
              onSendToTab(rowData, false, downstreamProxyStr, true)
              break
            case 'remove-color':
              onRemoveColor(rowData)
              break
            case 'mark-color':
            default:
              break
          }
        },
      })
    })

    const onDiscardData = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
      if (!!getLoading(rowData.TaskID) || rowData.Status === ManualHijackListStatus.WaitHijack) {
        return
      }
      const value: MITMV2DropRequest = {
        TaskID: rowData.TaskID,
        Drop: true,
      }
      setLoading(rowData.TaskID, true)
      clearLargeRequestReplacements(rowData.TaskID)
      grpcMITMV2Drop(value)
    })
    const onSetColor = useMemoizedFn((color: string, rowData: SingleManualHijackInfoMessage) => {
      if (!!getLoading(rowData.TaskID) || rowData.Status === ManualHijackListStatus.WaitHijack) {
        return
      }
      const existedTags = rowData.Tags ? rowData.Tags.filter((i) => !!i && !i.startsWith('YAKIT_COLOR_')) : []
      existedTags.push(`YAKIT_COLOR_${color.toUpperCase()}`)
      const value: MITMSetColorRequest = {
        TaskID: rowData.TaskID,
        Tags: existedTags,
      }
      setLoading(rowData.TaskID, true)
      grpcMITMSetColor(value)
    })
    const onRemoveColor = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
      if (!!getLoading(rowData.TaskID) || rowData.Status === ManualHijackListStatus.WaitHijack) return

      const existedTags = rowData.Tags ? rowData.Tags.filter((i) => !!i && !i.startsWith('YAKIT_COLOR_')) : []
      const value: MITMSetColorRequest = {
        TaskID: rowData.TaskID,
        Tags: existedTags,
      }
      setLoading(rowData.TaskID, true)
      grpcMITMSetColor(value)
    })
    const onSetCurrentRow = useMemoizedFn((val) => {
      if (val) {
        setCurrentSelectItem(val)
        const index = data.findIndex((i) => i.TaskID === val.TaskID)
        if (index !== -1) {
          setEditorShowIndexShowIndex(index)
        }
      } else {
        setCurrentSelectItem(undefined)
        setEditorShowIndexShowIndex(0)
      }
    })
    const onScrollTo = useMemoizedFn((val: number) => {
      setScrollToIndex(val)
    })
    // 性能优化：setLoading 提取为稳定引用，避免每次渲染创建新箭头函数破坏 ManualHijackInfo 的 React.memo
    const onSetLoading = useMemoizedFn((l: boolean) => {
      const item = getCurrentSelectItem()
      if (item) setLoading(item.TaskID, l)
    })
    const columns: ColumnsTypeProps[] = useCreation(() => {
      return [
        {
          title: t('MITMManual.arrival_order'),
          dataKey: 'arrivalOrder',
          width: 120,
        },
        {
          title: t('MITMManual.status'),
          dataKey: 'Status',
          render: (value: ManualHijackListStatus) => {
            let icon = <></>
            switch (value) {
              case 'hijacking request':
                icon = <OutlineArrowrightIcon />
                break
              case 'hijacking response':
                icon = <OutlineArrowleftIcon />
                break
              case 'wait hijack':
                icon = <OutlineLoadingIcon className={styles['icon-rotate-animation']} />
                break
            }
            return (
              <div className={styles['mitm-v2-manual-table-status']}>
                {ManualHijackListStatusMap[value]}
                {icon}
              </div>
            )
          },
          width: 120,
        },
        {
          title: t('MITMManual.method'),
          dataKey: 'Method',
          width: 80,
        },
        {
          title: 'URL',
          dataKey: 'URL',
        },
        {
          title: t('MITMManual.mark_color'),
          dataKey: 'Tags',
          width: 200,
          render: (text) => {
            return text
              ? `${text}`
                  .split('|')
                  .filter((i) => i.startsWith('YAKIT_COLOR_'))
                  .join(', ')
              : ''
          },
        },
      ]
    }, [i18nRefresh])
    const onlyShowFirstNode = useCreation(() => {
      return !(data.length && currentSelectItem && currentSelectItem.TaskID)
    }, [currentSelectItem, data.length])

    useUpdateEffect(() => {
      setManualTableTotal(data.length)
    }, [data.length])

    // 性能优化：pagination 对象用 useMemo 缓存，避免每次渲染创建新引用
    const pagination = useMemo(
      () => ({
        page: 1,
        limit: 50,
        total: data.length,
        onChange: () => {},
      }),
      [data.length],
    )

    const lastRatioRef = useRef<{ firstRatio: string; secondRatio: string }>({
      firstRatio: '21%',
      secondRatio: '79%',
    })
    useEffect(() => {
      getRemoteValue(RemoteGV.MITMManualHijackYakitResizeBox).then((res) => {
        if (res) {
          try {
            const { firstSizePercent, secondSizePercent } = JSONParseLog(res, {
              page: 'MITMManual',
              fun: 'MITMManualHijackYakitResizeBox',
            })
            lastRatioRef.current = {
              firstRatio: firstSizePercent,
              secondRatio: secondSizePercent,
            }
          } catch (error) {}
        }
      })
    }, [])
    const ResizeBoxProps = useCreation(() => {
      const p = cloneDeep(lastRatioRef.current)
      if (onlyShowFirstNode) {
        p.firstRatio = '100%'
        p.secondRatio = '0%'
      }
      return p
    }, [onlyShowFirstNode])
    //#region 勾选/批量操作
    const [allSelected, setAllSelected] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const onSelectAll = useMemoizedFn((selectedRowKeyList: string[], _, c: boolean) => {
      if (c) {
        setManualTableSelectNumber(selectedRowKeyList.length)
        setSelectedRowKeys(selectedRowKeyList)
      } else {
        setManualTableSelectNumber(0)
        setSelectedRowKeys([])
      }
      setAllSelected(c)
    })
    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string) => {
      if (c) {
        const newSelect = [...selectedRowKeys, key]
        setSelectedRowKeys(newSelect)
        setManualTableSelectNumber(newSelect.length)
      } else {
        const newSelect = selectedRowKeys.filter((ele) => ele !== key)
        setAllSelected(false)
        setSelectedRowKeys(newSelect)
        setManualTableSelectNumber(newSelect.length)
      }
    })
    // 性能优化：rowSelection 对象用 useMemo 缓存
    const rowSelection = useMemo(
      () => ({
        isAll: allSelected,
        type: 'checkbox' as const,
        selectedRowKeys,
        onSelectAll,
        onChangeCheckboxSingle,
      }),
      [allSelected, selectedRowKeys, onSelectAll, onChangeCheckboxSingle],
    )
    /**全部放行，不用管当前选中得数据是否被修改，除了等待劫持状态全部原封不动得转发 */
    const onSubmitAllData = useMemoizedFn(() => {
      const length = data.length
      for (let index = 0; index < length; index++) {
        const item = data[index]
        if (!item) continue
        onForwardData(item)
      }
      onSelectAll([], [], false)
    })
    /**原封不动转发 */
    const onForwardData = useMemoizedFn((item: SingleManualHijackInfoMessage) => {
      if (getLoading(item.TaskID)) return
      switch (item.Status) {
        case ManualHijackListStatus.Hijacking_Request:
        case ManualHijackListStatus.Hijacking_Response:
        case ManualHijackListStatus.Hijack_WS:
          setLoading(item.TaskID, true)
          clearLargeRequestReplacements(item.TaskID)
          grpcMITMV2Forward({
            TaskID: item.TaskID,
            Forward: true,
          })
          break
        default:
          break
      }
    })
    /**批量操作中得劫持响应,只有http的请求有劫持响应 */
    const onHijackingResponseByBatch = useMemoizedFn((item: SingleManualHijackInfoMessage) => {
      if (!!getLoading(item.TaskID) || item.Status !== ManualHijackListStatus.Hijacking_Request) return
      let params: MITMV2HijackedCurrentResponseRequest = {
        TaskID: item.TaskID,
        SendPacket: true,
      }
      params = {
        ...params,
        Request: item.Request,
      }
      setLoading(item.TaskID, true)
      grpcMITMV2HijackedCurrentResponse(params)
    })
    const onBatchDiscardData = useMemoizedFn(() => {
      onBatchBase((item) => onDiscardData(item))
    })
    /**批量放行，不用管当前选中得数据是否被修改，除了等待劫持状态全部原封不动得转发 */
    const onBatchSubmitData = useMemoizedFn(() => {
      onBatchBase((item) => onForwardData(item))
    })
    const onBatchHijackingResponse = useMemoizedFn(() => {
      onBatchBase((item) => onHijackingResponseByBatch(item))
    })
    const onBatchBase = useMemoizedFn((fun) => {
      const length = selectedRowKeys.length
      for (let index = 0; index < length; index++) {
        const taskId = selectedRowKeys[index]
        const item = data.find((ele) => ele.TaskID === taskId)
        if (!item) continue
        fun(item)
      }
      onSelectAll([], [], false)
    })
    //#endregion
    return (
      <YakitResizeBox
        firstMinSize={70}
        firstNode={
          <div className={styles['mitm-v2-manual-table-wrapper']} ref={mitmV2ManualTableRef}>
            <TableVirtualResize<SingleManualHijackInfoMessage>
              isRefresh={isRefresh}
              isShowTitle={false}
              data={data}
              renderKey="TaskID"
              pagination={pagination}
              columns={columns}
              onSetCurrentRow={onSetCurrentRow}
              currentSelectItem={currentSelectItem}
              onRowContextMenu={onRowContextMenu}
              scrollToIndex={scrollToIndex}
              rowSelection={rowSelection}
            />
          </div>
        }
        isVer={true}
        freeze={!onlyShowFirstNode}
        secondNode={
          currentSelectItem && (
            <ManualHijackInfo
              ref={manualHijackInfoRef}
              index={editorShowIndex}
              onScrollTo={onScrollTo}
              info={currentSelectItem}
              handleAutoForward={handleAutoForward}
              onDiscardData={onDiscardData}
              loading={!!getLoading(currentSelectItem.TaskID)}
              setLoading={onSetLoading}
              isOnlyLookResponse={isOnlyLookResponse}
              largeRequestReplacements={
                largeRequestReplacementsByTaskID[currentSelectItem.TaskID] || emptyLargeRequestReplacements
              }
              onLargeRequestReplacementComplete={(replacementKey, result) =>
                onLargeRequestReplacementComplete(currentSelectItem.TaskID, replacementKey, result)
              }
              onClearLargeRequestReplacements={() => clearLargeRequestReplacements(currentSelectItem.TaskID)}
            />
          )
        }
        secondNodeStyle={{ padding: onlyShowFirstNode ? 0 : undefined, display: onlyShowFirstNode ? 'none' : '' }}
        onMouseUp={({ firstSizePercent, secondSizePercent }) => {
          lastRatioRef.current = {
            firstRatio: firstSizePercent,
            secondRatio: secondSizePercent,
          }
          // 缓存比例用于下次加载
          setRemoteValue(
            RemoteGV.MITMManualHijackYakitResizeBox,
            JSON.stringify({
              firstSizePercent,
              secondSizePercent,
            }),
          )
        }}
        {...ResizeBoxProps}
      />
    )
  }),
)

const emptyLargeRequestReplacements: Record<string, LargeRequestReplacementResult> = {}

export default MITMManual

const ManualHijackInfo: React.FC<ManualHijackInfoProps> = React.memo(
  forwardRef((props, ref) => {
    const {
      info,
      index,
      isOnlyLookResponse,
      handleAutoForward,
      onDiscardData,
      onScrollTo,
      loading,
      setLoading,
      largeRequestReplacements,
      onLargeRequestReplacementComplete,
      onClearLargeRequestReplacements,
    } = props
    // request/ws 修改的值
    const [modifiedRequestPacket, setModifiedRequestPacket] = useState<string>('')
    const [modifiedResponsePacket, setModifiedResponsePacket] = useState<string>('')
    // request/ws
    const [currentRequestPacketInfo, setCurrentRequestPacketInfo] = useState<CurrentPacketInfoProps>({
      requestPacket: '',
      TaskId: '',
      currentPacket: '',
      isHttp: true,
      traceInfo: {
        AvailableDNSServers: [],
        DurationMs: 0,
        DNSDurationMs: 0,
        ConnDurationMs: 0,
        TotalDurationMs: 0,
      },
    })
    // response
    const [currentResponsePacketInfo, setCurrentResponsePacketInfo] = useState<CurrentPacketInfoProps>({
      requestPacket: '',
      TaskId: '',
      currentPacket: '',
      isHttp: true,
      traceInfo: {
        AvailableDNSServers: [],
        DurationMs: 0,
        DNSDurationMs: 0,
        ConnDurationMs: 0,
        TotalDurationMs: 0,
      },
    })

    const [type, setType] = useState<PackageTypeProps>('response')

    useImperativeHandle(ref, () => {
      return {
        onSubmitData: (v) => onSubmitData(v),
        onHijackingResponse: (v) => onHijackingResponse(v),
      }
    }, [])
    useEffect(() => {
      if (info.IsWebsocket) {
        // WS Request
        onSetRequest(info)
      } else {
        // Request
        onSetRequest(info)
        // Response
        onSetResponse(info)
      }
    }, [info])
    useEffect(() => {
      if (isOnlyLookResponse) setType('response')
    }, [isOnlyLookResponse])
    const onSetRequest = useMemoizedFn((info: SingleManualHijackInfoMessage) => {
      const currentRequestPacket = info?.IsWebsocket
        ? Uint8ArrayToString(info.Payload)
        : Uint8ArrayToString(info.Request)
      setModifiedRequestPacket(currentRequestPacket)
      setCurrentRequestPacketInfo({
        currentPacket: currentRequestPacket,
        TaskId: info.TaskID,
        isHttp: info.IsHttps,
        requestPacket: Uint8ArrayToString(info.Request),
        traceInfo: info.TraceInfo || {
          AvailableDNSServers: [],
          DurationMs: 0,
          DNSDurationMs: 0,
          ConnDurationMs: 0,
          TotalDurationMs: 0,
        },
      })
    })
    const onSetResponse = useMemoizedFn((info: SingleManualHijackInfoMessage) => {
      const currentResponsePacket = info?.IsWebsocket
        ? Uint8ArrayToString(info.Payload)
        : Uint8ArrayToString(info.Response)
      setModifiedResponsePacket(currentResponsePacket)
      setCurrentResponsePacketInfo({
        currentPacket: currentResponsePacket,
        TaskId: info.TaskID,
        isHttp: info.IsHttps,
        requestPacket: Uint8ArrayToString(info.Request),
        traceInfo: info.TraceInfo || {
          AvailableDNSServers: [],
          DurationMs: 0,
          DNSDurationMs: 0,
          ConnDurationMs: 0,
          TotalDurationMs: 0,
        },
      })
    })
    const disabledRequest = useCreation(() => {
      return info.IsWebsocket ? false : info.Status !== ManualHijackListStatus.Hijacking_Request
    }, [info.IsWebsocket, info.Status])
    const disabledResponse = useCreation(() => {
      return info.IsWebsocket ? false : info.Status !== ManualHijackListStatus.Hijacking_Response
    }, [info.IsWebsocket, info.Status])
    /**提交数据 */
    const onSubmitData = useMemoizedFn((value: SingleManualHijackInfoMessage) => {
      switch (value.Status) {
        case ManualHijackListStatus.Hijacking_Request:
          onSubmitRequestData(value)
          break
        case ManualHijackListStatus.Hijacking_Response:
          onSubmitResponseData(value)
          break
        case ManualHijackListStatus.Hijack_WS:
          onSubmitPayloadData(value)
          break
        default:
          break
      }
    })
    const onSubmitRequestData = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
      if (loading || rowData.Status === ManualHijackListStatus.WaitHijack) return

      if (rowData.TaskID === info.TaskID) setLoading(true)

      const hasLargeRequestReplacement = Object.keys(largeRequestReplacements || {}).length > 0
      const request = new Uint8Array(StringToUint8Array(modifiedRequestPacket))
      // 已上传超大文件替换时优先 Forward，避免 Submit skeleton 冲掉引擎临时文件
      if (hasLargeRequestReplacement || isEqual(request, rowData.Request)) {
        if (hasLargeRequestReplacement) onClearLargeRequestReplacements()
        grpcMITMV2Forward({
          TaskID: rowData.TaskID,
          Forward: true,
        })
        return
      }
      const value: MITMV2SubmitRequestDataRequest = {
        TaskID: rowData.TaskID,
        Request: request,
      }
      grpcMITMV2SubmitRequestData(value)
    })
    const onSubmitResponseData = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
      if (loading || rowData.Status === ManualHijackListStatus.WaitHijack) return

      if (rowData.TaskID === info.TaskID) setLoading(true)

      const response = new Uint8Array(StringToUint8Array(modifiedResponsePacket))

      if (isEqual(response, rowData.Response)) {
        grpcMITMV2Forward({
          TaskID: rowData.TaskID,
          Forward: true,
        })
        return
      }
      const value: MITMV2SubmitRequestDataResponseRequest = {
        TaskID: rowData.TaskID,
        Response: response,
      }
      grpcMITMV2SubmitResponseData(value)
    })
    const onSubmitPayloadData = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
      if (loading || rowData.Status === ManualHijackListStatus.WaitHijack) return

      if (rowData.TaskID === info.TaskID) setLoading(true)

      const payload = new Uint8Array(StringToUint8Array(modifiedRequestPacket))
      if (isEqual(payload, rowData.Payload)) {
        grpcMITMV2Forward({
          TaskID: rowData.TaskID,
          Forward: true,
        })
        return
      }
      const value: MITMV2SubmitPayloadDataRequest = {
        TaskID: rowData.TaskID,
        Payload: payload,
      }
      grpcMITMV2SubmitPayloadData(value)
    })
    /**处理当前操作得数据 */
    const getActionHijackingRData = useMemoizedFn((value: SingleManualHijackInfoMessage) => {
      let params: MITMV2HijackedCurrentResponseRequest = {
        TaskID: value.TaskID,
        SendPacket: true,
      }
      switch (value.Status) {
        case ManualHijackListStatus.Hijacking_Request:
          params = {
            ...params,
            Request: new Uint8Array(StringToUint8Array(modifiedRequestPacket)),
          }
          break
        case ManualHijackListStatus.Hijacking_Response:
          params = {
            ...params,
            Response: new Uint8Array(StringToUint8Array(modifiedRequestPacket)),
          }
          break
        case ManualHijackListStatus.Hijack_WS:
          params = {
            ...params,
            Payload: new Uint8Array(StringToUint8Array(modifiedRequestPacket)),
          }
          break
        default:
          break
      }
      return params
    })
    /**劫持响应并提交数据 */
    const onHijackingResponse = useMemoizedFn((value: SingleManualHijackInfoMessage) => {
      if (loading || value.Status === ManualHijackListStatus.WaitHijack) return

      if (value.TaskID === info.TaskID) setLoading(true)

      grpcMITMV2HijackedCurrentResponse(getActionHijackingRData(value))
      setType('response')
    })
    const onRequestTypeOptionVal = useMemoizedFn((value) => {
      // setRequestTypeOptionVal(value)
      // setRemoteValue(RemoteGV.MITMManualHijackRequestEditorBeautify, value ? value : "")
    })
    const onResponseTypeOptionVal = useMemoizedFn((value) => {
      // setResponseTypeOptionVal(value)
      // setRemoteValue(RemoteGV.MITMManualHijackResponseEditorBeautify, value ? value : "")
    })
    const ResizeBoxProps = useCreation(() => {
      const p = {
        firstRatio: '50%',
        secondRatio: '50%',
      }
      if (!currentResponsePacketInfo.currentPacket) {
        p.secondRatio = '0%'
        p.firstRatio = '100%'
      }
      return p
    }, [currentResponsePacketInfo.currentPacket])
    const modifiedPacket = useCreation(() => {
      switch (type) {
        case PackageType.Request:
        case PackageType.WS:
          return modifiedRequestPacket
        case PackageType.Response:
          return modifiedResponsePacket
        default:
          return ''
      }
    }, [type, modifiedResponsePacket, modifiedRequestPacket])
    const currentPacketInfo = useCreation(() => {
      switch (type) {
        case PackageType.Request:
        case PackageType.WS:
          return currentRequestPacketInfo
        case PackageType.Response:
          return currentResponsePacketInfo
        default:
          return {
            requestPacket: '',
            TaskId: '',
            currentPacket: '',
            isHttp: true,
            traceInfo: {
              AvailableDNSServers: [],
              DurationMs: 0,
              DNSDurationMs: 0,
              ConnDurationMs: 0,
              TotalDurationMs: 0,
            },
          }
      }
    }, [type, currentRequestPacketInfo, currentResponsePacketInfo])
    const disabled = useCreation(() => {
      switch (type) {
        case PackageType.Request:
        case PackageType.WS:
          return disabledRequest
        case PackageType.Response:
          return disabledResponse
        default:
          return true
      }
    }, [type, disabledRequest, disabledResponse])

    const isResponse = useCreation(() => {
      return type === 'response'
    }, [type])
    const onSetModifiedPacket = useMemoizedFn((v) => {
      switch (type) {
        case PackageType.Request:
        case PackageType.WS:
          setModifiedRequestPacket(v)
          break
        case PackageType.Response:
          setModifiedResponsePacket(v)
          break
        default:
          break
      }
    })
    const onTypeOptionVal = useMemoizedFn((v) => {
      switch (type) {
        case PackageType.Request:
        case PackageType.WS:
          onRequestTypeOptionVal(v)
          break
        case PackageType.Response:
          onResponseTypeOptionVal(v)
          break
        default:
          break
      }
    })
    return (
      <YakitSpin spinning={loading}>
        {isOnlyLookResponse ? (
          <div style={{ height: '100%' }}>
            <MITMV2ManualEditor
              type={type}
              setType={setType}
              index={index}
              onScrollTo={onScrollTo}
              modifiedPacket={modifiedPacket}
              setModifiedPacket={onSetModifiedPacket}
              info={info}
              onDiscardData={onDiscardData}
              onSubmitData={onSubmitData}
              currentPacketInfo={currentPacketInfo}
              disabled={disabled}
              handleAutoForward={handleAutoForward}
              onHijackingResponse={onHijackingResponse}
              isResponse={isResponse}
              isOnlyLookResponse={true}
              largeRequestReplacements={largeRequestReplacements}
              onLargeRequestReplacementComplete={onLargeRequestReplacementComplete}
            />
          </div>
        ) : (
          <YakitResizeBox
            firstMinSize={300}
            firstNode={
              <div style={{ height: '100%' }}>
                <MITMV2ManualEditor
                  index={index}
                  onScrollTo={onScrollTo}
                  modifiedPacket={modifiedRequestPacket}
                  setModifiedPacket={setModifiedRequestPacket}
                  isResponse={false}
                  info={info}
                  onDiscardData={onDiscardData}
                  onSubmitData={onSubmitData}
                  currentPacketInfo={currentRequestPacketInfo}
                  disabled={disabledRequest}
                  handleAutoForward={handleAutoForward}
                  onHijackingResponse={onHijackingResponse}
                  largeRequestReplacements={largeRequestReplacements}
                  onLargeRequestReplacementComplete={onLargeRequestReplacementComplete}
                />
              </div>
            }
            secondMinSize={300}
            secondNode={
              <>
                <div style={{ height: '100%' }}>
                  <MITMV2ManualEditor
                    modifiedPacket={modifiedResponsePacket}
                    setModifiedPacket={setModifiedResponsePacket}
                    isResponse={true}
                    info={info}
                    onDiscardData={onDiscardData}
                    onSubmitData={onSubmitData}
                    currentPacketInfo={currentResponsePacketInfo}
                    disabled={disabledResponse}
                    handleAutoForward={handleAutoForward}
                    onHijackingResponse={onHijackingResponse}
                  />
                </div>
              </>
            }
            lineStyle={{ display: !currentResponsePacketInfo.currentPacket ? 'none' : '' }}
            secondNodeStyle={{ display: currentResponsePacketInfo.currentPacket ? 'block' : 'none' }}
            {...ResizeBoxProps}
          />
        )}
      </YakitSpin>
    )
  }),
)

// 性能优化：静态样式/属性常量，避免每次渲染创建新对象破坏 NewHTTPPacketEditor 的 React.memo
const editorTitleStyle = { overflow: 'hidden' }
const editorExtraProps = { isShowSelectRangeMenu: true }

const MITMV2ManualEditor: React.FC<MITMV2ManualEditorProps> = React.memo((props) => {
  const {
    index,
    disabled,
    currentPacketInfo,
    info,
    onDiscardData,
    onSubmitData,
    onScrollTo,
    handleAutoForward,
    onHijackingResponse,
    isResponse,
    isOnlyLookResponse,
  } = props
  const { i18nRefresh, t } = useI18nNamespaces(['mitm', 'yakitUi'])
  const { currentPacket, requestPacket } = currentPacketInfo
  const [modifiedPacket, setModifiedPacket] = useControllableValue<string>(props, {
    valuePropName: 'modifiedPacket',
    trigger: 'setModifiedPacket',
  })

  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)
  const [packetEditor, setPacketEditor] = useState<IMonacoEditor>()
  const largeRequestReplacements = props.largeRequestReplacements || emptyLargeRequestReplacements
  const onLargeRequestReplacementComplete = props.onLargeRequestReplacementComplete

  const [type, setType] = useControllableValue<string>(props, {
    valuePropName: 'type',
    trigger: 'setType',
  })

  useEffect(() => {
    setRefreshTrigger(!refreshTrigger)
  }, [currentPacket])
  const openLargeRequestFileReplace = useMemoizedFn((marker: LargeRequestReplacementMarker) => {
    const modal = showYakitModal({
      title:
        marker.kind === 'body'
          ? t('MITMManual.replace_large_body_title', { size: marker.sizeVerbose })
          : t('MITMManual.replace_large_file_title', { filename: marker.filename }),
      width: 660,
      footer: null,
      content: (
        <LargeRequestFileReplaceModal
          taskID={info.TaskID}
          marker={marker}
          onCancel={() => modal.destroy()}
          onComplete={(result) => {
            onLargeRequestReplacementComplete?.(getLargeRequestReplacementKey(marker), result)
            modal.destroy()
          }}
        />
      ),
      onCancel: () => modal.destroy(),
    })
  })
  useEffect(() => {
    if (!packetEditor || disabled || isResponse || info.IsWebsocket) return
    const model = packetEditor.getModel()
    if (!model) return

    let decorationIDs: string[] = []
    let mouseDisposable: { dispose: () => void } | undefined
    let modelMarkers: LargeRequestReplacementMarker[] = []

    const applyDecorations = () => {
      mouseDisposable?.dispose()
      mouseDisposable = undefined
      modelMarkers = []
      for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
        const matched = matchLargeRequestReplacementLine(model.getLineContent(lineNumber))
        if (!matched) continue
        modelMarkers.push(withLargeRequestReplacementLineNumber(matched, lineNumber))
      }
      decorationIDs = packetEditor.deltaDecorations(
        decorationIDs,
        modelMarkers.map((marker) => {
          const replacement = largeRequestReplacements[getLargeRequestReplacementKey(marker)]
          const markerText = model.getLineContent(marker.lineNumber).slice(0, marker.lineLength)
          const hint = replacement
            ? t('MITMManual.replaced_with_file', { filename: replacement.Filename })
            : t('MITMManual.click_to_replace')
          const chipClass = replacement
            ? `${styles['large-request-replace-chip']} ${styles['large-request-replace-chip-replaced']}`
            : styles['large-request-replace-chip']
          return {
            range: {
              startLineNumber: marker.lineNumber,
              startColumn: 1,
              endLineNumber: marker.lineNumber,
              endColumn: marker.lineLength + 1,
            },
            options: {
              inlineClassName: chipClass,
              inlineClassNameAffectsLetterSpacing: true,
              after: {
                content: sanitizeChipInjectedText(` ${hint}`),
                inlineClassName: chipClass,
                inlineClassNameAffectsLetterSpacing: true,
              },
              hoverMessage: { value: `${markerText}\n${hint}` },
            },
          }
        }),
      )
      if (modelMarkers.length === 0) return
      mouseDisposable = packetEditor.onMouseDown((event) => {
        if (!event.event.leftButton) return
        const domTarget = (event.event.browserEvent?.target ?? null) as HTMLElement | null
        const chipEl =
          domTarget && typeof domTarget.closest === 'function'
            ? domTarget.closest(`.${styles['large-request-replace-chip']}`)
            : null
        if (!chipEl) return
        const position = event.target.position
        let marker: LargeRequestReplacementMarker | undefined
        if (position) {
          const sameLine = modelMarkers.filter((item) => item.lineNumber === position.lineNumber)
          if (sameLine.length >= 1) marker = sameLine[0]
        }
        if (!marker && modelMarkers.length === 1) marker = modelMarkers[0]
        if (marker) openLargeRequestFileReplace(marker)
      })
    }

    // model 可能晚于 modifiedPacket 同步（refreshTrigger）；内容变化后再扫一次
    applyDecorations()
    const contentDisposable = packetEditor.onDidChangeModelContent(() => applyDecorations())
    return () => {
      contentDisposable.dispose()
      mouseDisposable?.dispose()
      packetEditor.deltaDecorations(decorationIDs, [])
    }
  }, [disabled, info.IsWebsocket, isResponse, largeRequestReplacements, modifiedPacket, packetEditor, t])
  const forResponse = useCreation(() => {
    return info.Status === ManualHijackListStatus.Hijacking_Response
  }, [info])
  const mitmManualRightMenu: OtherMenuListProps = useCreation(() => {
    const menu: EditorMenuItemType[] = [
      { type: 'divider' },
      {
        key: 'trigger-auto-hijacked',
        label: t('MITMManual.switch_to_auto_hijack_mode'),
        keybindings: YakEditorOptionShortcutKey.TriggerAutoHijacked,
      },
      {
        key: 'submit-data',
        label: t('MITMManual.forward_data'),
        keybindings: YakEditorOptionShortcutKey.SubmitDataMitm,
      },
      {
        key: 'drop-data',
        label: t('MITMManual.drop_data'),
        keybindings: YakEditorOptionShortcutKey.DropDataMitm,
      },
    ]
    if (!forResponse) {
      menu.push({
        key: 'hijack-current-response',
        label: t('MITMManual.hijack_response'),
        keybindings: YakEditorOptionShortcutKey.HijackResponseMitm,
      })
    }
    return {
      forResponseMITMMenu: {
        menu: menu,
        onRun: (_, key) => {
          switch (key) {
            case 'trigger-auto-hijacked':
              handleAutoForward('log')
              break
            case 'submit-data':
              onSubmitData(info)
              break
            case 'drop-data':
              onDiscardData && onDiscardData(info)
              break
            case 'hijack-current-response':
              onHijackCurrentResponse()
              break
            default:
              break
          }
        },
      },
    }
  }, [forResponse, info, modifiedPacket, i18nRefresh])

  const onHijackCurrentResponse = useMemoizedFn(() => {
    if (info.Status === ManualHijackListStatus.WaitHijack) {
      return
    }
    onHijackingResponse(info)
  })

  const btnDisable = useCreation(() => {
    return info.Status === ManualHijackListStatus.WaitHijack
  }, [info])

  // #region 美化、渲染、hex
  const [renderAndHexTypeOptions, setRenderAndHexTypeOptions] = useState<RenderAndHexTypeOptions[]>([])
  const [renderAndHexTag, setRenderAndHexTag] = useState<RenderAndHexTypeOptionVal>()
  const [renderHtml, setRenderHtml] = useState<React.ReactNode>()
  const updateRender = useMemoizedFn(() => {
    setRenderAndHexTypeOptions([
      {
        value: 'hex',
        label: 'HEX',
      },
    ])
    setRenderAndHexTag(undefined)
    setRenderHtml(undefined)
    if (modifiedPacket) {
      if (isResponse) {
        formatPacketRender(StringToUint8Array(modifiedPacket), (packet) => {
          if (packet) {
            setRenderAndHexTypeOptions([
              {
                value: 'hex',
                label: 'HEX',
              },
              {
                value: 'render',
                label: t('MITMManual.render'),
              },
            ])
          }
        })
      }
    }
  })
  useEffect(() => {
    updateRender()
  }, [currentPacket])
  const onSetBeautify = useMemoizedFn(() => {
    setRenderAndHexTag(undefined)
    setRenderHtml(undefined)
    if (modifiedPacket === '') {
      return
    }
    const encoder = new TextEncoder()
    const bytes = encoder.encode(modifiedPacket)
    const mb = bytes.length / 1024 / 1024
    if (mb > 0.5) {
      return
    } else {
      prettifyPacketCode(modifiedPacket).then((res) => {
        if (res) {
          setModifiedPacket(Uint8ArrayToString(res as Uint8Array))
          setRefreshTrigger((prev) => !prev)
        }
      })
    }
  })
  const onSetRenderHTML = useMemoizedFn(async () => {
    const renderValue = await prettifyPacketRender(StringToUint8Array(modifiedPacket))
    setRenderHtml(
      <iframe srcDoc={renderValue as string} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="" />,
    )
  })
  useEffect(() => {
    if (renderAndHexTag === 'render') {
      onSetRenderHTML()
    } else {
      setRenderHtml(undefined)
    }
  }, [renderAndHexTag])
  // #endregion

  return (
    <NewHTTPPacketEditor
      onEditor={setPacketEditor}
      noMinimap={!isResponse}
      noHeader={false}
      noPacketModifier={true}
      readOnly={disabled}
      isResponse={isResponse}
      foldBinaryFuzztag={true}
      titleStyle={editorTitleStyle}
      isShowBeautifyRender={false}
      fromMITM={true}
      title={
        isOnlyLookResponse ? (
          <div className={styles['mitm-v2-manual-editor-title']}>
            {info.IsWebsocket ? (
              <YakitTag color="danger" size="small">
                Websocket
              </YakitTag>
            ) : (
              <YakitRadioButtons
                size="small"
                buttonStyle="solid"
                value={type}
                options={[
                  {
                    label: t('MITMRule.request'),
                    value: 'request',
                  },
                  {
                    label: t('MITMRule.response'),
                    value: 'response',
                  },
                ]}
                onChange={(e) => {
                  setType && setType(e.target.value)
                }}
                style={{ marginRight: 8 }}
              />
            )}
            <YakitTag
              color={'info'}
              size="small"
              style={{ cursor: 'pointer' }}
              onClick={() => onScrollTo && onScrollTo(index || 0)}
            >
              index:{info.arrivalOrder}
            </YakitTag>
            <div className={styles['mitm-v2-manual-editor-title']}>
              <YakitTag color="green" size="small">
                {ManualHijackListStatusMap[info.Status]}
              </YakitTag>
            </div>
            {isResponse && (
              <div className={styles['mitm-v2-manual-editor-title']}>
                {info?.TraceInfo?.DurationMs && <YakitTag size="small">{info.TraceInfo.DurationMs} ms</YakitTag>}
              </div>
            )}
          </div>
        ) : (
          <>
            {isResponse ? (
              <div className={styles['mitm-v2-manual-editor-title']}>
                <span style={{ marginRight: 8 }}>Response</span>
                {info?.TraceInfo?.DurationMs && <YakitTag size="small">{info.TraceInfo.DurationMs} ms</YakitTag>}
              </div>
            ) : (
              <div className={styles['mitm-v2-manual-editor-title']}>
                {info.IsWebsocket ? (
                  <YakitTag color="danger" size="small">
                    Websocket
                  </YakitTag>
                ) : (
                  <span style={{ marginRight: 8 }}>Request</span>
                )}

                <YakitTag
                  color={'info'}
                  size="small"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onScrollTo && onScrollTo(index || 0)}
                >
                  index:{info.arrivalOrder}
                </YakitTag>
                <YakitTag color="green" size="small">
                  {ManualHijackListStatusMap[info.Status]}
                </YakitTag>
              </div>
            )}
          </>
        )
      }
      extra={
        <div className={styles['mitm-v2-manual-editor-btn']}>
          <>
            {!disabled && (
              <>
                {!isResponse && !info.IsWebsocket && (
                  <YakitButton disabled={btnDisable} type="outline1" size="small" onClick={onHijackCurrentResponse}>
                    劫持响应
                    {convertKeyboardToUIKey(getMitmShortcutKeyEvents()[MitmShortcutKey.HijackResponseMitm].keys)}
                  </YakitButton>
                )}
                <YakitButton
                  disabled={btnDisable}
                  type="outline1"
                  size="small"
                  onClick={() => onDiscardData && onDiscardData(info)}
                >
                  丢弃
                  {convertKeyboardToUIKey(getMitmShortcutKeyEvents()[MitmShortcutKey.DropDataMitm].keys)}
                </YakitButton>
                <YakitButton
                  disabled={btnDisable}
                  type="primary"
                  size="small"
                  onClick={() => onSubmitData && onSubmitData(info)}
                >
                  放行
                  {convertKeyboardToUIKey(getMitmShortcutKeyEvents()[MitmShortcutKey.SubmitDataMitm].keys)}
                </YakitButton>
              </>
            )}
            <>
              <YakitButton type="primary" size="small" onClick={onSetBeautify}>
                美化
              </YakitButton>
              <div>
                {renderAndHexTypeOptions.map((item) => (
                  <YakitCheckableTag
                    key={item.value}
                    checked={renderAndHexTag === item.value}
                    onChange={(checked) => {
                      if (checked) {
                        setRenderAndHexTag(item.value as RenderAndHexTypeOptionVal)
                      } else {
                        setRenderAndHexTag(undefined)
                      }
                    }}
                  >
                    {item.label}
                  </YakitCheckableTag>
                ))}
              </div>
            </>
          </>
        </div>
      }
      noShowHex={renderAndHexTag != 'hex'}
      renderHtml={renderHtml}
      defaultHttps={info.IsHttps}
      url={info.URL}
      originValue={modifiedPacket}
      onChange={setModifiedPacket}
      refreshTrigger={refreshTrigger}
      contextMenu={mitmManualRightMenu}
      editorOperationRecord="MITMV2_Manual_EDITOR_RECORF"
      isWebSocket={info.IsWebsocket && info.Status !== ManualHijackListStatus.WaitHijack}
      webSocketValue={requestPacket}
      webSocketToServer={currentPacket}
      webFuzzerValue={requestPacket}
      extraEditorProps={editorExtraProps}
      showDownBodyMenu={false}
      sendToWebFuzzer={!isResponse && !info.IsWebsocket}
      onClickOpenPacketNewWindowMenu={useMemoizedFn(() => {
        openPacketNewWindow({
          request: {
            originValue: modifiedPacket,
          },
        })
      })}
    />
  )
})
