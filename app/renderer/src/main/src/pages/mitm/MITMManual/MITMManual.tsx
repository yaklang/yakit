import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    CurrentPacketInfoProps,
    ManualHijackInfoProps,
    ManualHijackInfoRefProps,
    MITMManualProps,
    MITMV2ManualEditorProps
} from "./MITMManualType"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {SingleManualHijackInfoMessage} from "../MITMHacker/utils"
import {useControllableValue, useCounter, useCreation, useMemoizedFn} from "ahooks"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {ManualHijackListAction, ManualHijackListStatus, ManualHijackListStatusMap} from "@/defaultConstants/mitmV2"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {OtherMenuListProps, YakitEditorKeyCode} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {availableColors, onSendToTab} from "@/components/HTTPFlowTable/HTTPFlowTable"
import classNames from "classnames"
import styles from "./MITMManual.module.scss"
import {convertKeyboard} from "@/components/yakitUI/YakitEditor/editorUtils"
import {SystemInfo} from "@/constants/hardware"
import {
    grpcMITMSetColor,
    grpcMITMV2CancelHijackedCurrentResponse,
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
    grpcMITMV2SubmitPayloadData
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {NewHTTPPacketEditor, RenderTypeOptionVal} from "@/utils/editors"
import {EditorMenuItemType} from "@/components/yakitUI/YakitEditor/EditorMenu"
import {openPacketNewWindow} from "@/utils/openWebsite"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {isEqual} from "lodash"
import {Tooltip} from "antd"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"

const MITMManual: React.FC<MITMManualProps> = React.memo((props) => {
    const {manualHijackList, manualHijackListAction, downstreamProxyStr, autoForward, handleAutoForward} = props
    const [data, setData] = useState<SingleManualHijackInfoMessage[]>([])
    const [currentSelectItem, setCurrentSelectItem] = useState<SingleManualHijackInfoMessage>()
    const [editorShowIndex, setEditorShowIndexShowIndex] = useState<number>(0) // request 编辑器中显示的index
    const [scrollToIndex, setScrollToIndex] = useState<number>()

    const [currentOrder, {inc: addOrder, set: setOrder, reset: resetOrder}] = useCounter(1, {min: 1})

    const mitmManualContextmenuRef = useRef([
        {
            key: "hijacking-response",
            label: "劫持该Request对应得响应"
        },
        {
            key: "submit-data",
            label: "提交数据"
        },
        {
            key: "discard-data",
            label: "丢弃数据"
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
                                {convertKeyboard(SystemInfo.system || "Darwin", [
                                    YakitEditorKeyCode.Control,
                                    YakitEditorKeyCode.KEY_R
                                ])}
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
                                {convertKeyboard(SystemInfo.system || "Darwin", [
                                    YakitEditorKeyCode.Control,
                                    YakitEditorKeyCode.Shift,
                                    YakitEditorKeyCode.KEY_R
                                ])}
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
    ])
    const manualHijackInfoRef = useRef<ManualHijackInfoRefProps>({
        onSubmitData: () => {},
        onHijackingForward: () => {}
    })
    useEffect(() => {
        if (autoForward !== "manual") {
            resetOrder()
        }
    }, [autoForward])
    useEffect(() => {
        handleManualHijackList()
    }, [manualHijackList, manualHijackListAction])
    /**处理手动劫持数据,后端在发送数据得时候已经做过节流/防抖处理 */
    const handleManualHijackList = useMemoizedFn(() => {
        // 只有manualHijackListAction为ManualHijackListAction.Hijack_List_Reload，manualHijackList才有可能为空,为空就相当于清空数据
        const item = manualHijackList[0] || {}
        const taskID = item.TaskID
        switch (manualHijackListAction) {
            case ManualHijackListAction.Hijack_List_Add:
                if (data.length === 0) {
                    const selectItem: SingleManualHijackInfoMessage = {
                        ...item,
                        arrivalOrder: currentOrder
                    }
                    setCurrentSelectItem(selectItem)
                    setEditorShowIndexShowIndex(0)
                }
                setData((preV) => {
                    const index = preV.findIndex((item) => item.TaskID === taskID)
                    const addItem = {...item, arrivalOrder: currentOrder}
                    return index === -1 ? [...preV, {...addItem}] : preV
                })
                addOrder()
                break
            case ManualHijackListAction.Hijack_List_Delete:
                if (currentSelectItem?.TaskID === taskID) {
                    let selectItem: SingleManualHijackInfoMessage | undefined = undefined
                    let selectIndex = editorShowIndex
                    // 删除后选中下一个数据
                    if (editorShowIndex === 0) {
                        selectItem = data[editorShowIndex + 1]
                    } else if (editorShowIndex === data.length - 1) {
                        selectIndex = editorShowIndex - 1
                        selectItem = data[selectIndex]
                    } else if (editorShowIndex) {
                        selectItem = data[editorShowIndex + 1]
                    }
                    setCurrentSelectItem(selectItem)
                    if (selectItem) {
                        setEditorShowIndexShowIndex(selectIndex)
                    } else {
                        setEditorShowIndexShowIndex(0)
                    }
                }
                setData((preV) => preV.filter((item) => item.TaskID !== taskID))
                break
            case ManualHijackListAction.Hijack_List_Update:
                if (currentSelectItem?.TaskID === taskID) {
                    setCurrentSelectItem({
                        ...item,
                        arrivalOrder: currentSelectItem.arrivalOrder
                    })
                }
                setData((preV) => {
                    const newV = [...preV]
                    const index = newV.findIndex((item) => item.TaskID === taskID)
                    if (index === -1) return newV
                    newV.splice(index, 1, {...item, arrivalOrder: newV[index].arrivalOrder})
                    return newV
                })
                break
            case ManualHijackListAction.Hijack_List_Reload:
                let order = 0
                const newData = manualHijackList.map((ele) => {
                    order += 1
                    return {
                        ...ele,
                        arrivalOrder: order
                    }
                })
                setData(newData)
                setCurrentSelectItem(undefined)
                setEditorShowIndexShowIndex(0)
                setOrder(order + 1)
                break
            default:
                break
        }
    })
    const onRowContextMenu = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
        if (rowData) {
            onSetCurrentRow(rowData)
        }
        showByRightContext({
            width: 180,
            data: mitmManualContextmenuRef.current,
            onClick: ({key, keyPath}) => {
                if (keyPath.includes("mark-color")) {
                    const colorItem = availableColors.find((e) => e.title === key)
                    if (!colorItem) return
                    onSetColor(colorItem.color, rowData)
                    return
                }
                switch (key) {
                    case "hijacking-response":
                        onHijackingResponse(rowData)
                        manualHijackInfoRef.current.onSubmitData(rowData)
                        break
                    case "cancel-hijacking-response":
                        onCancelHijackingResponse(rowData)
                        break
                    case "submit-data":
                        manualHijackInfoRef.current.onSubmitData(rowData)
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

    /** 取消 劫持该Request对应得响应 */
    const onCancelHijackingResponse = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
        if (rowData.Status === ManualHijackListStatus.WaitHijack) {
            yakitNotify("warning", "当前状态不允许取消劫持")
            return
        }
        grpcMITMV2CancelHijackedCurrentResponse(rowData.TaskID)
    })

    const onDiscardData = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
        if (rowData.Status === ManualHijackListStatus.WaitHijack) {
            yakitNotify("warning", "当前状态不允许丢弃数据")
            return
        }
        const value: MITMV2DropRequest = {
            TaskID: rowData.TaskID,
            Drop: true
        }
        grpcMITMV2Drop(value)
    })
    const onSetColor = useMemoizedFn((color: string, rowData: SingleManualHijackInfoMessage) => {
        if (rowData.Status === ManualHijackListStatus.WaitHijack) {
            yakitNotify("warning", "当前状态不允许设置颜色")
            return
        }
        const existedTags = rowData.Tags ? rowData.Tags.filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
        existedTags.push(`YAKIT_COLOR_${color.toUpperCase()}`)
        const value: MITMSetColorRequest = {
            TaskID: rowData.TaskID,
            Tags: existedTags
        }
        grpcMITMSetColor(value)
    })
    const onRemoveColor = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
        if (rowData.Status === ManualHijackListStatus.WaitHijack) {
            yakitNotify("warning", "当前状态不允许设置颜色")
            return
        }
        const existedTags = rowData.Tags ? rowData.Tags.filter((i) => !!i && !i.startsWith("YAKIT_COLOR_")) : []
        const value: MITMSetColorRequest = {
            TaskID: rowData.TaskID,
            Tags: existedTags
        }
        grpcMITMSetColor(value)
    })
    const onSetCurrentRow = useMemoizedFn((val) => {
        setCurrentSelectItem(val)
        const index = data.findIndex((i) => i.TaskID === val.TaskID)
        if (index !== -1) {
            setEditorShowIndexShowIndex(index)
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
                render: (value: string) => ManualHijackListStatusMap[value],
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
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (onlyShowFirstNode) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [onlyShowFirstNode])
    return (
        <YakitResizeBox
            firstMinSize={160}
            firstNode={
                <TableVirtualResize<SingleManualHijackInfoMessage>
                    isRefresh={false}
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
                />
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
                        autoForward={autoForward}
                        handleAutoForward={handleAutoForward}
                        onDiscardData={onDiscardData}
                    />
                )
            }
            secondNodeStyle={{padding: onlyShowFirstNode ? 0 : undefined, display: onlyShowFirstNode ? "none" : ""}}
            {...ResizeBoxProps}
        ></YakitResizeBox>
    )
})

export default MITMManual

const ManualHijackInfo: React.FC<ManualHijackInfoProps> = React.memo(
    forwardRef((props, ref) => {
        const {info, index, autoForward, handleAutoForward, onDiscardData, onScrollTo} = props
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
        useImperativeHandle(
            ref,
            () => {
                return {
                    onSubmitData: (v) => onSubmitData(v),
                    onHijackingForward: (v) => onHijackingForward(v)
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
            let rowData: SingleManualHijackInfoMessage = {
                ...value,
                Request: new Uint8Array(StringToUint8Array(modifiedRequestPacket)),
                Response: new Uint8Array(StringToUint8Array(modifiedResponsePacket))
            }
            if (rowData.IsWebsocket) {
                rowData = {
                    ...value,
                    Payload: new Uint8Array(StringToUint8Array(modifiedRequestPacket))
                }
            } else {
                rowData = {
                    ...value,
                    Request: new Uint8Array(StringToUint8Array(modifiedRequestPacket)),
                    Response: new Uint8Array(StringToUint8Array(modifiedResponsePacket))
                }
            }
            switch (rowData.Status) {
                case ManualHijackListStatus.Hijacking_Request:
                    onSubmitRequestData(rowData)
                    break
                case ManualHijackListStatus.Hijacking_Response:
                    onSubmitResponseData(rowData)
                    break
                case ManualHijackListStatus.Hijack_WS:
                    onSubmitPayloadData(rowData)
                    break
                default:
                    break
            }
        })
        const onSubmitRequestData = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
            if (rowData.Status === ManualHijackListStatus.WaitHijack) {
                yakitNotify("warning", "当前状态不允许提交数据")
                return
            }
            if (isEqual(rowData.Request, info.Request)) {
                grpcMITMV2Forward({
                    TaskID: rowData.TaskID,
                    Forward: true
                })
                return
            }
            const value: MITMV2SubmitRequestDataRequest = {
                TaskID: rowData.TaskID,
                Request: rowData.Request
            }
            grpcMITMV2SubmitRequestData(value)
        })
        const onSubmitResponseData = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
            if (rowData.Status === ManualHijackListStatus.WaitHijack) {
                yakitNotify("warning", "当前状态不允许提交数据")
                return
            }
            if (isEqual(rowData.Response, info.Response)) {
                grpcMITMV2Forward({
                    TaskID: rowData.TaskID,
                    Forward: true
                })
                return
            }
            const value: MITMV2SubmitRequestDataResponseRequest = {
                TaskID: rowData.TaskID,
                Response: rowData.Response
            }
            grpcMITMV2SubmitResponseData(value)
        })
        const onSubmitPayloadData = useMemoizedFn((rowData: SingleManualHijackInfoMessage) => {
            if (rowData.Status === ManualHijackListStatus.WaitHijack) {
                yakitNotify("warning", "当前状态不允许提交数据")
                return
            }
            if (isEqual(rowData.Payload, info.Payload)) {
                grpcMITMV2Forward({
                    TaskID: rowData.TaskID,
                    Forward: true
                })
                return
            }
            const value: MITMV2SubmitPayloadDataRequest = {
                TaskID: rowData.TaskID,
                Payload: rowData.Payload
            }
            grpcMITMV2SubmitPayloadData(value)
        })
        // 先取消劫持响应再提交数据
        const onHijackingForward = useMemoizedFn((value: SingleManualHijackInfoMessage) => {
            if (value.Status === ManualHijackListStatus.WaitHijack) {
                yakitNotify("warning", "当前状态不允许 放行该 HTTP Response")
                return
            }
            grpcMITMV2CancelHijackedCurrentResponse(value.TaskID).then(() => {
                setTimeout(() => {
                    onSubmitData(value)
                }, 200)
            })
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
        return (
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
                            onHijackingForward={onHijackingForward}
                            typeOptionVal={requestTypeOptionVal}
                            onTypeOptionVal={onRequestTypeOptionVal}
                        />
                    </div>
                }
                secondMinSize={300}
                secondNode={
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
                            onHijackingForward={onHijackingForward}
                            typeOptionVal={responseTypeOptionVal}
                            onTypeOptionVal={onResponseTypeOptionVal}
                        />
                    </div>
                }
                lineStyle={{display: !currentResponsePacketInfo.currentPacket ? "none" : ""}}
                secondNodeStyle={{display: currentResponsePacketInfo.currentPacket ? "block" : "none"}}
                {...ResizeBoxProps}
            />
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
        isResponse,
        onScrollTo,
        handleAutoForward,
        onHijackingForward,
        typeOptionVal,
        onTypeOptionVal
    } = props
    const {currentPacket, requestPacket} = currentPacketInfo
    const [modifiedPacket, setModifiedPacket] = useControllableValue<string>(props, {
        valuePropName: "modifiedPacket",
        trigger: "setModifiedPacket"
    })

    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)
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
                key: "forward-response",
                label: "放行该 HTTP Response"
            },
            {
                key: "drop-response",
                label: "丢弃该 HTTP Response"
            }
        ]
        if (!forResponse) {
            menu.push({
                key: "hijack-current-response",
                label: "劫持该 Request 对应的响应"
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
                        case "forward-response":
                            onHijackingForward(info)
                            break
                        case "drop-response":
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
    }, [forResponse, info])

    const onHijackCurrentResponse = useMemoizedFn(() => {
        if (info.Status === ManualHijackListStatus.WaitHijack) {
            yakitNotify("warning", "当前状态不允许 劫持该 Request 对应的响应")
            return
        }
        onHijackingResponse(info)
        setTimeout(() => {
            onSubmitData(info)
        }, 200)
    })

    const btnDisable = useCreation(() => {
        return info.Status === ManualHijackListStatus.WaitHijack
    }, [info])
    return (
        <NewHTTPPacketEditor
            noMinimap={!isResponse}
            noHex={true}
            noHeader={false}
            hideSearch={true}
            isShowBeautifyRender={true}
            noPacketModifier={true}
            readOnly={disabled}
            isResponse={isResponse}
            titleStyle={{overflow: "hidden"}}
            // typeOptionVal={typeOptionVal}
            // onTypeOptionVal={(v) => onTypeOptionVal && onTypeOptionVal(v)}
            title={
                isResponse ? (
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
                )
            }
            extra={
                !disabled && (
                    <div className={styles["mitm-v2-manual-editor-btn"]}>
                        {!isResponse && (
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
                            丢弃数据
                        </YakitButton>
                        <YakitButton
                            disabled={btnDisable}
                            type='primary'
                            size='small'
                            onClick={() => onSubmitData && onSubmitData(info)}
                        >
                            提交数据
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

/** 劫持该Request对应得响应 */
const onHijackingResponse = (rowData: SingleManualHijackInfoMessage) => {
    if (rowData.Status === ManualHijackListStatus.WaitHijack) {
        yakitNotify("warning", "当前状态不允许劫持")
        return
    }
    grpcMITMV2HijackedCurrentResponse(rowData.TaskID)
}
