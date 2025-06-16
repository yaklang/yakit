import React, {forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    CurrentPacketInfoProps,
    ManualHijackInfoProps,
    ManualHijackInfoRefProps,
    MITMManualProps,
    MITMV2ManualEditorProps,
    PackageTypeProps
} from "./MITMManualType"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {
    ClientMITMHijackedResponse,
    grpcClientMITMHijacked,
    isMITMV2Response,
    MITMV2Response,
    SingleManualHijackInfoMessage
} from "../MITMHacker/utils"
import {
    useControllableValue,
    useCounter,
    useCreation,
    useGetState,
    useInterval,
    useInViewport,
    useMap,
    useMemoizedFn,
    useUpdateEffect
} from "ahooks"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {
    ManualHijackListAction,
    ManualHijackListStatus,
    ManualHijackListStatusMap,
    PackageType
} from "@/defaultConstants/mitmV2"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {OtherMenuListProps, YakitEditorKeyCode} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {availableColors, onSendToTab} from "@/components/HTTPFlowTable/HTTPFlowTable"
import classNames from "classnames"
import styles from "./MITMManual.module.scss"
import {SystemInfo} from "@/constants/hardware"
import {
    grpcMITMSetColor,
    grpcMITMV2Drop,
    grpcMITMV2Forward,
    grpcMITMV2HijackedCurrentResponse,
    MITMV2SubmitPayloadDataRequest,
    grpcMITMV2SubmitRequestData,
    grpcMITMV2SubmitResponseData,
    MITMSetColorRequest,
    MITMV2DropRequest,
    MITMV2SubmitRequestDataRequest,
    MITMV2SubmitRequestDataResponseRequest,
    grpcMITMV2SubmitPayloadData,
    MITMV2HijackedCurrentResponseRequest
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {NewHTTPPacketEditor, RenderTypeOptionVal} from "@/utils/editors"
import {EditorMenuItemType} from "@/components/yakitUI/YakitEditor/EditorMenu"
import {openPacketNewWindow} from "@/utils/openWebsite"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {cloneDeep, isEqual} from "lodash"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {setClipboardText} from "@/utils/clipboard"
import {OutlineArrowleftIcon, OutlineArrowrightIcon, OutlineLoadingIcon} from "@/assets/icon/outline"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import MITMContext, {MITMVersion} from "../Context/MITMContext"
import {convertKeyboardToUIKey} from "@/utils/globalShortcutKey/utils"
import {getGlobalShortcutKeyEvents} from "@/utils/globalShortcutKey/events/global"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"

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
            setAutoForward
        } = props
        const [data, setData] = useState<SingleManualHijackInfoMessage[]>([])
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [currentSelectItem, setCurrentSelectItem, getCurrentSelectItem] =
            useGetState<SingleManualHijackInfoMessage>()
        const [editorShowIndex, setEditorShowIndexShowIndex] = useState<number>(0) // request 编辑器中显示的index
        const [scrollToIndex, setScrollToIndex] = useState<number>()

        const [loadingMap, {set: setLoading, remove: removeLoading, get: getLoading, reset: resetLoading}] = useMap<
            string,
            boolean
        >(new Map())

        const [currentOrder, {inc: addOrder, set: setOrder, reset: resetOrder}] = useCounter(1, {min: 1})
        const [intervalTime, setIntervalTime] = useState<number>()
        const mitmV2HijackInfoRef = useRef<SingleManualHijackInfoMessage[]>([])
        const clearMITMHijackV2 = useInterval(() => {
            handleManualHijackList()
        }, intervalTime)

        const manualHijackInfoRef = useRef<ManualHijackInfoRefProps>({
            onSubmitData: () => {},
            onHijackingResponse: () => {}
        })
        const mitmContent = useContext(MITMContext)

        const mitmVersion = useCreation(() => {
            return mitmContent.mitmStore.version
        }, [mitmContent.mitmStore.version])
        useImperativeHandle(
            ref,
            () => {
                return {
                    onBatchDiscardData: () => onBatchDiscardData(),
                    onBatchSubmitData: () => onBatchSubmitData(),
                    onBatchHijackingResponse: () => onBatchHijackingResponse(),
                    onSubmitAllData: () => onSubmitAllData()
                }
            },
            []
        )

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
                clearMITMHijackV2()
                grpcClientMITMHijacked(mitmVersion).remove()
            }
        }, [])
        useEffect(() => {
            if (autoForward !== "manual") {
                resetOrder()
            }
        }, [autoForward])

        const forwardHandlerV2 = useMemoizedFn((value: MITMV2Response) => {
            if (autoForward !== "manual" && value.ManualHijackListAction) {
                if (hijackFilterFlag) {
                    setAutoForward("manual")
                    yakitNotify("info", "已触发 条件 劫持")
                }
            }
            const hijackData = value.ManualHijackList[0]
            switch (value.ManualHijackListAction) {
                case ManualHijackListAction.Hijack_List_Add: // 新增的需要考虑到达顺序/arrivalOrder
                    if (!!hijackData) {
                        const item: SingleManualHijackInfoMessage = {
                            ...hijackData,
                            arrivalOrder: currentOrder,
                            manualHijackListAction: ManualHijackListAction.Hijack_List_Add
                        }
                        mitmV2HijackInfoRef.current.push(item)
                        addOrder()
                    }
                    break
                case ManualHijackListAction.Hijack_List_Delete:
                    const deleteIndex = mitmV2HijackInfoRef.current.findIndex((ele) => ele.TaskID === hijackData.TaskID)
                    const deleteItem: SingleManualHijackInfoMessage = {
                        ...hijackData,
                        manualHijackListAction: ManualHijackListAction.Hijack_List_Delete
                    }
                    if (deleteIndex === -1) {
                        mitmV2HijackInfoRef.current.push(deleteItem)
                    } else {
                        mitmV2HijackInfoRef.current.splice(deleteIndex, 1, {
                            ...deleteItem,
                            arrivalOrder: mitmV2HijackInfoRef.current[deleteIndex].arrivalOrder
                        })
                    }
                    break
                case ManualHijackListAction.Hijack_List_Update:
                    const updateIndex = mitmV2HijackInfoRef.current.findIndex((ele) => ele.TaskID === hijackData.TaskID)
                    if (updateIndex === -1) {
                        // 缓存数据中没有数据，直接使用data
                        const updateDataIndex = data.findIndex((ele) => ele.TaskID === hijackData.TaskID)
                        if (updateDataIndex !== -1) {
                            mitmV2HijackInfoRef.current.push({
                                ...hijackData,
                                manualHijackListAction: ManualHijackListAction.Hijack_List_Update,
                                arrivalOrder: data[updateDataIndex].arrivalOrder
                            })
                        }
                    } else {
                        // 缓存数据中有add数据或者Update，以缓存数据中的manualHijackListAction为准
                        mitmV2HijackInfoRef.current.splice(updateIndex, 1, {
                            ...hijackData,
                            manualHijackListAction: mitmV2HijackInfoRef.current[updateIndex].manualHijackListAction,
                            arrivalOrder: mitmV2HijackInfoRef.current[updateIndex].arrivalOrder
                        })
                    }

                    break
                case ManualHijackListAction.Hijack_List_Reload:
                    mitmV2HijackInfoRef.current = []
                    resetLoading()
                    let order = 0
                    const newData = value.ManualHijackList.map((ele) => {
                        order += 1
                        return {
                            ...ele,
                            arrivalOrder: order
                        }
                    })
                    setOrder(order + 1)
                    setCurrentSelectItem(undefined)
                    setEditorShowIndexShowIndex(0)
                    setData(newData)
                    setIsRefresh(!isRefresh)
                    break
                default:
                    break
            }
            if (mitmV2HijackInfoRef.current.length > 0 && !intervalTime) {
                setIntervalTime(100)
            }
        })
        /**处理手动劫持数据,后端在发送数据得时候已经做过节流/防抖处理 */
        const handleManualHijackList = useMemoizedFn(() => {
            const length = mitmV2HijackInfoRef.current.length
            if (!length) return
            let newData = [...data]
            let newSelectItem = currentSelectItem
            let newEditorShowIndexShowIndex = editorShowIndex
            for (let index = 0; index < length; index++) {
                const item = mitmV2HijackInfoRef.current[index]
                const taskID = item.TaskID
                const manualHijackListAction = item.manualHijackListAction
                switch (manualHijackListAction) {
                    case ManualHijackListAction.Hijack_List_Add:
                        const index = newData.findIndex((ele) => ele.TaskID === taskID)
                        if (index === -1) {
                            setLoading(taskID, false)
                            if (newData.length === 0 && !newSelectItem) {
                                newSelectItem = {
                                    ...item
                                }
                                newEditorShowIndexShowIndex = 0
                            }
                            newData.push(item)
                            if (item.Status === ManualHijackListStatus.Hijacking_Request && isOnlyLookResponse) {
                                setLoading(taskID, true)
                                // 该状态下默认劫持响应为true时,自动发送劫持响应数据
                                const params: MITMV2HijackedCurrentResponseRequest = {
                                    TaskID: taskID,
                                    SendPacket: true,
                                    Request: item.Request
                                }
                                grpcMITMV2HijackedCurrentResponse(params)
                            }
                        }
                        break
                    case ManualHijackListAction.Hijack_List_Delete:
                        removeLoading(taskID)
                        newData = newData.filter((ele) => ele.TaskID !== taskID)
                        if (newSelectItem?.TaskID === taskID) {
                            if (newData.length === 1) {
                                newEditorShowIndexShowIndex = 0
                                newSelectItem = newData[0]
                            } else if (newEditorShowIndexShowIndex >= newData.length - 1) {
                                newEditorShowIndexShowIndex = newData.length - 1
                                newSelectItem = newData[newEditorShowIndexShowIndex]
                            } else {
                                newSelectItem = newData[newEditorShowIndexShowIndex]
                            }
                        }
                        break
                    case ManualHijackListAction.Hijack_List_Update:
                        setLoading(taskID, false)
                        if (newSelectItem?.TaskID === taskID) {
                            newSelectItem = {
                                ...item
                            }
                        }
                        const updateIndex = newData.findIndex((ele) => ele.TaskID === taskID)
                        newData.splice(updateIndex, 1, {...item, arrivalOrder: newData[updateIndex].arrivalOrder})
                        break
                    default:
                        break
                }
            }
            setCurrentSelectItem(newSelectItem)
            setEditorShowIndexShowIndex(newSelectItem ? newEditorShowIndexShowIndex : 0)
            setData([...newData])
            mitmV2HijackInfoRef.current = []
            setIntervalTime(undefined)
        })

        const getMitmManualContextMenu = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
            const getStatusStr = () => {
                switch (rowData.Status) {
                    case ManualHijackListStatus.Hijacking_Request:
                    case ManualHijackListStatus.WaitHijack:
                        return "请求"
                    case ManualHijackListStatus.Hijacking_Response:
                        return "响应"
                    default:
                        return ""
                }
            }

            let menu = [
                {
                    key: "submit-data",
                    label: `放行${getStatusStr()}`
                },
                {
                    key: "hijacking-response",
                    label: "劫持响应"
                },
                {
                    key: "copy-url",
                    label: "复制 URL"
                },
                {
                    key: "discard-data",
                    label: `丢弃${getStatusStr()}`
                },
                {
                    key: "send-webFuzzer",
                    label: "发送到 Web Fuzzer",
                    children: [
                        // SystemInfo
                        {
                            key: "send-and-jump-to-webFuzzer",
                            label: (
                                <div className={styles["context-menu-keybind-wrapper"]}>
                                    <div className={styles["content-style"]}>发送并跳转</div>
                                    <div className={classNames(styles["keybind-style"], "keys-style")}>
                                        {convertKeyboardToUIKey(
                                            getGlobalShortcutKeyEvents()["sendAndJump*common"].keys
                                        )}
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: "send-to-webFuzzer",
                            label: (
                                <div className={styles["context-menu-keybind-wrapper"]}>
                                    <div className={styles["content-style"]}>仅发送</div>
                                    <div className={classNames(styles["keybind-style"], "keys-style")}>
                                        {convertKeyboardToUIKey(getGlobalShortcutKeyEvents()["send*common"].keys)}
                                    </div>
                                </div>
                            )
                        }
                    ]
                },
                {
                    key: "mark-color",
                    label: "标注颜色",
                    children: availableColors.map((i) => {
                        return {
                            key: i.title,
                            label: i.render
                        }
                    })
                },
                {
                    key: "remove-color",
                    label: "移除颜色"
                }
            ]
            if (rowData.Status !== ManualHijackListStatus.Hijacking_Request) {
                menu = menu.filter((item) => item.key !== "hijacking-response")
            }
            if (rowData.Status === ManualHijackListStatus.WaitHijack) {
                menu = menu.filter((item) => ["copy-url", "send-webFuzzer"].includes(item.key))
            }
            return menu
        })

        const mitmV2ManualTableRef = useRef<HTMLDivElement>(null)
        const [inViewport] = useInViewport(mitmV2ManualTableRef)
        useShortcutKeyTrigger("sendAndJump*common", () => {
            if (inViewport) {
                onSendToTab(getCurrentSelectItem(), true, downstreamProxyStr)
            }
        })

        useShortcutKeyTrigger("send*common", () => {
            if (inViewport) {
                onSendToTab(getCurrentSelectItem(), false, downstreamProxyStr)
            }
        })

        const onRowContextMenu = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
            if (rowData.TaskID !== currentSelectItem?.TaskID) {
                onSetCurrentRow(rowData)
            }

            let menu = getMitmManualContextMenu(rowData)

            showByRightContext({
                width: 180,
                data: menu,
                onClick: ({key, keyPath}) => {
                    if (keyPath.includes("mark-color")) {
                        const colorItem = availableColors.find((e) => e.title === key)
                        if (!colorItem) return
                        onSetColor(colorItem.color, rowData)
                        return
                    }
                    switch (key) {
                        case "hijacking-response":
                            manualHijackInfoRef.current.onHijackingResponse(rowData)
                            break
                        case "submit-data":
                            manualHijackInfoRef.current.onSubmitData(rowData)
                            break
                        case "copy-url":
                            setClipboardText(rowData.URL)
                            break
                        case "discard-data":
                            onDiscardData(rowData)
                            break
                        case "send-and-jump-to-webFuzzer":
                            onSendToTab(rowData, true, downstreamProxyStr)
                            break
                        case "send-to-webFuzzer":
                            onSendToTab(rowData, false, downstreamProxyStr)
                            break
                        case "remove-color":
                            onRemoveColor(rowData)
                            break
                        case "mark-color":
                        default:
                            break
                    }
                }
            })
        })

        const onDiscardData = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
            if (!!getLoading(rowData.TaskID) || rowData.Status === ManualHijackListStatus.WaitHijack) {
                return
            }
            const value: MITMV2DropRequest = {
                TaskID: rowData.TaskID,
                Drop: true
            }
            setLoading(rowData.TaskID, true)
            grpcMITMV2Drop(value)
        })
        const onSetColor = useMemoizedFn((color: string, rowData: SingleManualHijackInfoMessage) => {
            if (!!getLoading(rowData.TaskID) || rowData.Status === ManualHijackListStatus.WaitHijack) {
                return
            }
            const existedTags = rowData.Tags ? rowData.Tags.filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
            existedTags.push(`YAKIT_COLOR_${color.toUpperCase()}`)
            const value: MITMSetColorRequest = {
                TaskID: rowData.TaskID,
                Tags: existedTags
            }
            setLoading(rowData.TaskID, true)
            grpcMITMSetColor(value)
        })
        const onRemoveColor = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
            if (!!getLoading(rowData.TaskID) || rowData.Status === ManualHijackListStatus.WaitHijack) return

            const existedTags = rowData.Tags ? rowData.Tags.filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
            const value: MITMSetColorRequest = {
                TaskID: rowData.TaskID,
                Tags: existedTags
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
        const columns: ColumnsTypeProps[] = useCreation(() => {
            return [
                {
                    title: "到达顺序",
                    dataKey: "arrivalOrder",
                    width: 120
                },
                {
                    title: "状态",
                    dataKey: "Status",
                    render: (value: ManualHijackListStatus) => {
                        let icon = <></>
                        switch (value) {
                            case "hijacking request":
                                icon = <OutlineArrowrightIcon />
                                break
                            case "hijacking response":
                                icon = <OutlineArrowleftIcon />
                                break
                            case "wait hijack":
                                icon = <OutlineLoadingIcon className={styles["icon-rotate-animation"]} />
                                break
                        }
                        return (
                            <div className={styles["mitm-v2-manual-table-status"]}>
                                {ManualHijackListStatusMap[value]}
                                {icon}
                            </div>
                        )
                    },
                    width: 120
                },
                {
                    title: "方法",
                    dataKey: "Method",
                    width: 80
                },
                {
                    title: "URL",
                    dataKey: "URL"
                },
                {
                    title: "标记颜色",
                    dataKey: "Tags",
                    width: 200,
                    render: (text) => {
                        return text
                            ? `${text}`
                                  .split("|")
                                  .filter((i) => i.startsWith("YAKIT_COLOR_"))
                                  .join(", ")
                            : ""
                    }
                }
            ]
        }, [])
        const onlyShowFirstNode = useCreation(() => {
            return !(data.length && currentSelectItem && currentSelectItem.TaskID)
        }, [currentSelectItem, data.length])

        useUpdateEffect(() => {
            setManualTableTotal(data.length)
        }, [data.length])

        const lastRatioRef = useRef<{firstRatio: string; secondRatio: string}>({
            firstRatio: "21%",
            secondRatio: "79%"
        })
        useEffect(() => {
            getRemoteValue(RemoteGV.MITMManualHijackYakitResizeBox).then((res) => {
                if (res) {
                    try {
                        const {firstSizePercent, secondSizePercent} = JSON.parse(res)
                        lastRatioRef.current = {
                            firstRatio: firstSizePercent,
                            secondRatio: secondSizePercent
                        }
                    } catch (error) {}
                }
            })
        })
        const ResizeBoxProps = useCreation(() => {
            let p = cloneDeep(lastRatioRef.current)
            if (onlyShowFirstNode) {
                p.firstRatio = "100%"
                p.secondRatio = "0%"
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
            if (!!getLoading(item.TaskID)) return
            switch (item.Status) {
                case ManualHijackListStatus.Hijacking_Request:
                case ManualHijackListStatus.Hijacking_Response:
                case ManualHijackListStatus.Hijack_WS:
                    setLoading(item.TaskID, true)
                    grpcMITMV2Forward({
                        TaskID: item.TaskID,
                        Forward: true
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
                SendPacket: true
            }
            params = {
                ...params,
                Request: item.Request
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
                    <div className={styles["mitm-v2-manual-table-wrapper"]} ref={mitmV2ManualTableRef}>
                        <TableVirtualResize<SingleManualHijackInfoMessage>
                            isRefresh={isRefresh}
                            isShowTitle={false}
                            data={data}
                            renderKey='TaskID'
                            pagination={{
                                page: 1,
                                limit: 50,
                                total: data.length,
                                onChange: () => {}
                            }}
                            columns={columns}
                            onSetCurrentRow={onSetCurrentRow}
                            currentSelectItem={currentSelectItem}
                            onRowContextMenu={onRowContextMenu}
                            scrollToIndex={scrollToIndex}
                            rowSelection={{
                                isAll: allSelected,
                                type: "checkbox",
                                selectedRowKeys,
                                onSelectAll,
                                onChangeCheckboxSingle
                            }}
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
                            setLoading={(l) => setLoading(currentSelectItem.TaskID, l)}
                            isOnlyLookResponse={isOnlyLookResponse}
                        />
                    )
                }
                secondNodeStyle={{padding: onlyShowFirstNode ? 0 : undefined, display: onlyShowFirstNode ? "none" : ""}}
                onMouseUp={({firstSizePercent, secondSizePercent}) => {
                    lastRatioRef.current = {
                        firstRatio: firstSizePercent,
                        secondRatio: secondSizePercent
                    }
                    // 缓存比例用于下次加载
                    setRemoteValue(
                        RemoteGV.MITMManualHijackYakitResizeBox,
                        JSON.stringify({
                            firstSizePercent,
                            secondSizePercent
                        })
                    )
                }}
                {...ResizeBoxProps}
            />
        )
    })
)

export default MITMManual

const ManualHijackInfo: React.FC<ManualHijackInfoProps> = React.memo(
    forwardRef((props, ref) => {
        const {info, index, isOnlyLookResponse, handleAutoForward, onDiscardData, onScrollTo, loading, setLoading} =
            props
        // request/ws 修改的值
        const [modifiedRequestPacket, setModifiedRequestPacket] = useState<string>("")
        const [modifiedResponsePacket, setModifiedResponsePacket] = useState<string>("")
        // request/ws
        const [currentRequestPacketInfo, setCurrentRequestPacketInfo] = useState<CurrentPacketInfoProps>({
            requestPacket: "",
            TaskId: "",
            currentPacket: "",
            isHttp: true,
            traceInfo: {
                AvailableDNSServers: [],
                DurationMs: 0,
                DNSDurationMs: 0,
                ConnDurationMs: 0,
                TotalDurationMs: 0
            }
        })
        const [requestTypeOptionVal, setRequestTypeOptionVal] = useState<RenderTypeOptionVal>()
        // response
        const [currentResponsePacketInfo, setCurrentResponsePacketInfo] = useState<CurrentPacketInfoProps>({
            requestPacket: "",
            TaskId: "",
            currentPacket: "",
            isHttp: true,
            traceInfo: {
                AvailableDNSServers: [],
                DurationMs: 0,
                DNSDurationMs: 0,
                ConnDurationMs: 0,
                TotalDurationMs: 0
            }
        })
        const [responseTypeOptionVal, setResponseTypeOptionVal] = useState<RenderTypeOptionVal>()

        const [type, setType] = useState<PackageTypeProps>("response")

        useImperativeHandle(
            ref,
            () => {
                return {
                    onSubmitData: (v) => onSubmitData(v),
                    onHijackingResponse: (v) => onHijackingResponse(v)
                }
            },
            []
        )
        useEffect(() => {
            // Request
            getRequestEditorBeautify()
            // Response
            getResponseEditorBeautify()
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
            if (isOnlyLookResponse) setType("response")
        }, [isOnlyLookResponse])
        /**TODO - Request 美化缓存 */
        const getRequestEditorBeautify = useMemoizedFn(() => {
            // getRemoteValue(RemoteGV.MITMManualHijackRequestEditorBeautify).then((res) => {
            //     if (!!res) {
            //         setRequestTypeOptionVal(res)
            //     }
            // })
        })
        /**TODO - Response 美化缓存 */
        const getResponseEditorBeautify = useMemoizedFn(() => {
            // getRemoteValue(RemoteGV.MITMManualHijackResponseEditorBeautify).then((res) => {
            //     if (!!res) {
            //         setResponseTypeOptionVal(res)
            //     }
            // })
        })
        const onSetRequest = useMemoizedFn((info: SingleManualHijackInfoMessage) => {
            const currentRequestPacket = !!info?.IsWebsocket
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
                    TotalDurationMs: 0
                }
            })
        })
        const onSetResponse = useMemoizedFn((info: SingleManualHijackInfoMessage) => {
            const currentResponsePacket = !!info?.IsWebsocket
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
                    TotalDurationMs: 0
                }
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

            const request = new Uint8Array(StringToUint8Array(modifiedRequestPacket))
            if (isEqual(request, rowData.Request)) {
                grpcMITMV2Forward({
                    TaskID: rowData.TaskID,
                    Forward: true
                })
                return
            }
            const value: MITMV2SubmitRequestDataRequest = {
                TaskID: rowData.TaskID,
                Request: request
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
                    Forward: true
                })
                return
            }
            const value: MITMV2SubmitRequestDataResponseRequest = {
                TaskID: rowData.TaskID,
                Response: response
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
                    Forward: true
                })
                return
            }
            const value: MITMV2SubmitPayloadDataRequest = {
                TaskID: rowData.TaskID,
                Payload: payload
            }
            grpcMITMV2SubmitPayloadData(value)
        })
        /**处理当前操作得数据 */
        const getActionHijackingRData = useMemoizedFn((value: SingleManualHijackInfoMessage) => {
            let params: MITMV2HijackedCurrentResponseRequest = {
                TaskID: value.TaskID,
                SendPacket: true
            }
            switch (value.Status) {
                case ManualHijackListStatus.Hijacking_Request:
                    params = {
                        ...params,
                        Request: new Uint8Array(StringToUint8Array(modifiedRequestPacket))
                    }
                    break
                case ManualHijackListStatus.Hijacking_Response:
                    params = {
                        ...params,
                        Response: new Uint8Array(StringToUint8Array(modifiedRequestPacket))
                    }
                    break
                case ManualHijackListStatus.Hijack_WS:
                    params = {
                        ...params,
                        Payload: new Uint8Array(StringToUint8Array(modifiedRequestPacket))
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
            setType("response")
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
            let p = {
                firstRatio: "50%",
                secondRatio: "50%"
            }
            if (!currentResponsePacketInfo.currentPacket) {
                p.secondRatio = "0%"
                p.firstRatio = "100%"
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
                    return ""
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
                        requestPacket: "",
                        TaskId: "",
                        currentPacket: "",
                        isHttp: true,
                        traceInfo: {
                            AvailableDNSServers: [],
                            DurationMs: 0,
                            DNSDurationMs: 0,
                            ConnDurationMs: 0,
                            TotalDurationMs: 0
                        }
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

        const typeOptionVal = useCreation(() => {
            switch (type) {
                case PackageType.Request:
                case PackageType.WS:
                    return requestTypeOptionVal
                case PackageType.Response:
                    return responseTypeOptionVal
                default:
                    return "render"
            }
        }, [type, requestTypeOptionVal, responseTypeOptionVal])
        const isResponse = useCreation(() => {
            return type === "response"
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
                    <div style={{height: "100%"}}>
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
                            typeOptionVal={typeOptionVal}
                            onTypeOptionVal={onTypeOptionVal}
                            onHijackingResponse={onHijackingResponse}
                            isResponse={isResponse}
                            isOnlyLookResponse={true}
                        />
                    </div>
                ) : (
                    <YakitResizeBox
                        firstMinSize={300}
                        firstNode={
                            <div style={{height: "100%"}}>
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
                                    typeOptionVal={requestTypeOptionVal}
                                    onTypeOptionVal={onRequestTypeOptionVal}
                                    onHijackingResponse={onHijackingResponse}
                                />
                            </div>
                        }
                        secondMinSize={300}
                        secondNode={
                            <>
                                <div style={{height: "100%"}}>
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
                                        typeOptionVal={responseTypeOptionVal}
                                        onTypeOptionVal={onResponseTypeOptionVal}
                                        onHijackingResponse={onHijackingResponse}
                                    />
                                </div>
                            </>
                        }
                        lineStyle={{display: !currentResponsePacketInfo.currentPacket ? "none" : ""}}
                        secondNodeStyle={{display: currentResponsePacketInfo.currentPacket ? "block" : "none"}}
                        {...ResizeBoxProps}
                    />
                )}
            </YakitSpin>
        )
    })
)

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
        typeOptionVal,
        onTypeOptionVal,
        isOnlyLookResponse
    } = props
    const {currentPacket, requestPacket} = currentPacketInfo
    const [modifiedPacket, setModifiedPacket] = useControllableValue<string>(props, {
        valuePropName: "modifiedPacket",
        trigger: "setModifiedPacket"
    })

    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)

    const [type, setType] = useControllableValue<string>(props, {
        valuePropName: "type",
        trigger: "setType"
    })

    useEffect(() => {
        setRefreshTrigger(!refreshTrigger)
    }, [currentPacket])
    const forResponse = useCreation(() => {
        return info.Status === ManualHijackListStatus.Hijacking_Response
    }, [info])
    const mitmManualRightMenu: OtherMenuListProps = useCreation(() => {
        const menu: EditorMenuItemType[] = [
            {type: "divider"},
            {
                key: "trigger-auto-hijacked",
                label: "切换为自动劫持模式",
                keybindings: [
                    YakitEditorKeyCode.Shift,
                    SystemInfo.system === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                    YakitEditorKeyCode.KEY_T
                ]
            },
            {
                key: "submit-data",
                label: "放行数据"
            },
            {
                key: "drop-data",
                label: "丢弃数据"
            }
        ]
        if (!forResponse) {
            menu.push({
                key: "hijack-current-response",
                label: "劫持该响应"
            })
        }
        return {
            forResponseMITMMenu: {
                menu: menu,
                onRun: (_, key) => {
                    switch (key) {
                        case "trigger-auto-hijacked":
                            handleAutoForward("log")
                            break
                        case "submit-data":
                            onSubmitData(info)
                            break
                        case "drop-data":
                            onDiscardData && onDiscardData(info)
                            break
                        case "hijack-current-response":
                            onHijackCurrentResponse()
                            break
                        default:
                            break
                    }
                }
            }
        }
    }, [forResponse, info, modifiedPacket])

    const onHijackCurrentResponse = useMemoizedFn(() => {
        if (info.Status === ManualHijackListStatus.WaitHijack) {
            return
        }
        onHijackingResponse(info)
    })

    const btnDisable = useCreation(() => {
        return info.Status === ManualHijackListStatus.WaitHijack
    }, [info])
    return (
        <NewHTTPPacketEditor
            noMinimap={!isResponse}
            noHeader={false}
            isShowBeautifyRender={true}
            noPacketModifier={true}
            readOnly={disabled}
            isResponse={isResponse}
            titleStyle={{overflow: "hidden"}}
            // typeOptionVal={typeOptionVal}
            // onTypeOptionVal={(v) => onTypeOptionVal && onTypeOptionVal(v)}
            title={
                isOnlyLookResponse ? (
                    <div className={styles["mitm-v2-manual-editor-title"]}>
                        {info.IsWebsocket ? (
                            <YakitTag color='danger' size='small'>
                                Websocket
                            </YakitTag>
                        ) : (
                            <YakitRadioButtons
                                size='small'
                                buttonStyle='solid'
                                value={type}
                                options={[
                                    {
                                        label: "请求",
                                        value: "request"
                                    },
                                    {
                                        label: "响应",
                                        value: "response"
                                    }
                                ]}
                                onChange={(e) => {
                                    setType && setType(e.target.value)
                                }}
                                style={{marginRight: 8}}
                            />
                        )}
                        <YakitTag
                            color={"info"}
                            size='small'
                            style={{cursor: "pointer"}}
                            onClick={() => onScrollTo && onScrollTo(index || 0)}
                        >
                            index:{info.arrivalOrder}
                        </YakitTag>
                        <div className={styles["mitm-v2-manual-editor-title"]}>
                            <YakitTag color='green' size='small'>
                                {ManualHijackListStatusMap[info.Status]}
                            </YakitTag>
                        </div>
                        {isResponse && (
                            <div className={styles["mitm-v2-manual-editor-title"]}>
                                {info?.TraceInfo?.DurationMs && (
                                    <YakitTag size='small'>{info.TraceInfo.DurationMs} ms</YakitTag>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {isResponse ? (
                            <div className={styles["mitm-v2-manual-editor-title"]}>
                                <span style={{marginRight: 8}}>Response</span>
                                {info?.TraceInfo?.DurationMs && (
                                    <YakitTag size='small'>{info.TraceInfo.DurationMs} ms</YakitTag>
                                )}
                            </div>
                        ) : (
                            <div className={styles["mitm-v2-manual-editor-title"]}>
                                {info.IsWebsocket ? (
                                    <YakitTag color='danger' size='small'>
                                        Websocket
                                    </YakitTag>
                                ) : (
                                    <span style={{marginRight: 8}}>Request</span>
                                )}

                                <YakitTag
                                    color={"info"}
                                    size='small'
                                    style={{cursor: "pointer"}}
                                    onClick={() => onScrollTo && onScrollTo(index || 0)}
                                >
                                    index:{info.arrivalOrder}
                                </YakitTag>
                                <YakitTag color='green' size='small'>
                                    {ManualHijackListStatusMap[info.Status]}
                                </YakitTag>
                            </div>
                        )}
                    </>
                )
            }
            extra={
                !disabled && (
                    <div className={styles["mitm-v2-manual-editor-btn"]}>
                        {!isResponse && !info.IsWebsocket && (
                            <YakitButton
                                disabled={btnDisable}
                                type='outline1'
                                size='small'
                                onClick={onHijackCurrentResponse}
                            >
                                劫持响应
                            </YakitButton>
                        )}
                        <YakitButton
                            disabled={btnDisable}
                            type='outline1'
                            size='small'
                            onClick={() => onDiscardData && onDiscardData(info)}
                        >
                            丢弃
                        </YakitButton>
                        <YakitButton
                            disabled={btnDisable}
                            type='primary'
                            size='small'
                            onClick={() => onSubmitData && onSubmitData(info)}
                        >
                            放行
                        </YakitButton>
                    </div>
                )
            }
            defaultHttps={info.IsHttps}
            url={info.URL}
            originValue={modifiedPacket}
            onChange={setModifiedPacket}
            refreshTrigger={refreshTrigger}
            contextMenu={mitmManualRightMenu}
            editorOperationRecord='MITMV2_Manual_EDITOR_RECORF'
            isWebSocket={info.IsWebsocket && info.Status !== ManualHijackListStatus.WaitHijack}
            webSocketValue={requestPacket}
            webSocketToServer={currentPacket}
            webFuzzerValue={requestPacket}
            extraEditorProps={{
                isShowSelectRangeMenu: true
            }}
            showDownBodyMenu={false}
            sendToWebFuzzer={!isResponse && !info.IsWebsocket}
            onClickOpenPacketNewWindowMenu={useMemoizedFn(() => {
                openPacketNewWindow({
                    request: {
                        originValue: modifiedPacket
                    }
                })
            })}
        />
    )
})
