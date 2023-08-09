import React, {useEffect, useRef, useState} from "react"
import {
    ExtraSettingProps,
    FuzzerSequenceProps,
    FuzzerSequenceResponse,
    ResponseProps,
    SequenceItemProps,
    SequenceProps,
    SequenceResponseProps
} from "./FuzzerSequenceType"
import styles from "./FuzzerSequence.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidDragsortIcon, SolidPlayIcon, SolidPlusIcon, SolidStopIcon} from "@/assets/icon/solid"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {
    useCreation,
    useDebounceFn,
    useHover,
    useInViewport,
    useMap,
    useMemoizedFn,
    useSize,
    useThrottleEffect,
    useThrottleFn,
    useUpdateEffect
} from "ahooks"
import {OutlineCogIcon, OutlinePlussmIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {Divider, Form, Result} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import classNames from "classnames"
import {
    LabelNodeItem,
    defaultExtractorItem,
    defaultMatcherItem
} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {yakitNotify} from "@/utils/notification"
import {
    NodeInfoProps,
    PageInfoProps,
    PageNodeItemProps,
    WebFuzzerPageInfoProps,
    usePageNode
} from "@/store/pageNodeInfo"
import {YakitRoute} from "@/routes/newRoute"
import {
    FuzzerRequestProps,
    FuzzerResponse,
    ResponseViewer,
    SecondNodeExtra,
    SecondNodeTitle,
    WEB_FUZZ_HOTPATCH_CODE,
    WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE,
    advancedConfigValueToFuzzerRequests,
    defaultAdvancedConfigValue,
    defaultPostTemplate,
    emptyFuzzer
} from "../HTTPFuzzerPage"
import {randomString} from "@/utils/randomUtil"
import {getLocalValue, getRemoteValue} from "@/utils/kv"
import {AdvancedConfigValueProps} from "../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {ResizeCardBox} from "@/components/ResizeCardBox/ResizeCardBox"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {HTTPFuzzerPageTable, HTTPFuzzerPageTableQuery} from "../components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {StringToUint8Array} from "@/utils/str"
import {MatcherValueProps, ExtractorValueProps} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"

const {ipcRenderer} = window.require("electron")

// 拖拽功能所需
const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (isDragging) {
        const number = transform.indexOf("(")
        const index = transform.indexOf(",")
        if (index !== -1 && number !== -1) {
            const pre = transform.substring(0, number + 1)
            const after = transform.substring(index + 1, transform.length)
            transform = pre + "0px," + after
        }
    }
    return {
        ...draggableStyle,
        transform
    }
}

/**数组元素交换位置 */
const reorder = (arr, index1, index2) => {
    // 检查索引是否有效
    if (index1 < 0 || index1 >= arr.length || index2 < 0 || index2 >= arr.length) {
        // console.error("索引无效")
        return
    }

    // 交换元素位置
    var temp = arr[index1]
    arr[index1] = arr[index2]
    arr[index2] = temp

    return arr
}

const defaultPageParams: WebFuzzerPageInfoProps = {
    advancedConfigValue: {
        ...defaultAdvancedConfigValue
    },
    request: defaultPostTemplate
}

const isEmptySequence = (list: SequenceProps[]) => {
    return list.findIndex((ele) => !ele.pageId) !== -1
}

const FuzzerSequence: React.FC<FuzzerSequenceProps> = React.memo((props) => {
    const {setType}=props;
    const [loading, setLoading] = useState<boolean>(false)

    const [sequenceList, setSequenceList] = useState<SequenceProps[]>([])
    const [errorIndex, setErrorIndex] = useState<number>(-1)

    // Response
    const [currentSequenceItem, setCurrentSequenceItem] = useState<SequenceProps>()
    const [currentSelectRequest, setCurrentSelectRequest] = useState<WebFuzzerPageInfoProps>()
    const [currentSelectResponse, setCurrentSelectResponse] = useState<ResponseProps>()
    const [responseMap, {set: setResponse, get: getResponse, reset: resetResponse}] = useMap<string, ResponseProps>()

    const originSequenceListRef = useRef<SequenceProps[]>([])
    const fuzzTokenRef = useRef<string>(randomString(60))
    const hotPatchCodeRef = useRef<string>("")
    const hotPatchCodeWithParamGetterRef = useRef<string>("")

    const fuzzerSequenceRef = useRef(null)
    const [inViewport] = useInViewport(fuzzerSequenceRef)

    const {getPageNodeInfoByPageId} = usePageNode()

    useEffect(() => {
        const unSubPageNode = usePageNode.subscribe(
            (state) => state.pageNode.get(YakitRoute.HTTPFuzzer),
            () => {
                onUpdateSequence()
            }
        )
        return () => {
            unSubPageNode()
        }
    }, [])

    useUpdateEffect(() => {
        if (inViewport) onUpdateSequence()
    }, [inViewport])
    useUpdateEffect(() => {
        if (!loading) onUpdateSequence()
    }, [loading])
    useEffect(() => {
        getPageNodeInfoByPageIdByRoute()
    }, [])
    useEffect(() => {
        getRemoteValue(WEB_FUZZ_HOTPATCH_CODE).then((remoteData) => {
            if (!remoteData) {
                return
            }
            hotPatchCodeRef.current = `${remoteData}`
        })
        getRemoteValue(WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE).then((remoteData) => {
            if (!!remoteData) {
                hotPatchCodeWithParamGetterRef.current = `${remoteData}`
            }
        })
    }, [inViewport])

    const successCountRef = useRef<Map<string, number>>(new Map())
    const failedCountRef = useRef<Map<string, number>>(new Map())
    const successBufferRef = useRef<Map<string, FuzzerResponse[]>>(new Map())
    const failedBufferRef = useRef<Map<string, FuzzerResponse[]>>(new Map())

    useEffect(() => {
        if (currentSequenceItem) {
            setCurrentSelectRequest(currentSequenceItem.pageParams)
            const currentResponse = responseMap.get(currentSequenceItem.id)
            if (currentResponse) {
                setCurrentSelectResponse({...currentResponse})
            } else {
                setCurrentSelectResponse(undefined)
            }
        } else {
            setCurrentSelectRequest(undefined)
            setCurrentSelectResponse(undefined)
        }
        return () => {
            setCurrentSelectRequest(undefined)
            setCurrentSelectResponse(undefined)
        }
    }, [currentSequenceItem])
    useEffect(() => {
        const token = fuzzTokenRef.current
        const dataToken = `${token}-data`
        const errToken = `${token}-error`
        const endToken = `${token}-end`

        ipcRenderer.on(dataToken, (e: any, data: FuzzerSequenceResponse) => {
            const {Response, Request} = data
            const {FuzzerIndex = ""} = Request
            // console.log("data", Request, Response)
            if (Response.Ok) {
                // successCount++
                let currentSuccessCount = successCountRef.current.get(FuzzerIndex)
                if (currentSuccessCount) {
                    currentSuccessCount++
                    successCountRef.current.set(FuzzerIndex, currentSuccessCount)
                } else {
                    successCountRef.current.set(FuzzerIndex, 1)
                }
            } else {
                // failedCount++
                let currentFailedCount = failedCountRef.current.get(FuzzerIndex)
                if (currentFailedCount) {
                    currentFailedCount++
                    failedCountRef.current.set(FuzzerIndex, currentFailedCount)
                } else {
                    failedCountRef.current.set(FuzzerIndex, 1)
                }
            }
            if (onIsDropped(Response, FuzzerIndex)) return
            const r = {
                ...Response,
                Headers: Response.Headers || [],
                UUID: Response.UUID,
                Count: 0,
                cellClassName: Response.MatchedByMatcher ? `color-opacity-bg-${Response.HitColor}` : ""
            } as FuzzerResponse

            if (Response.Ok) {
                let successList = successBufferRef.current.get(FuzzerIndex)
                if (successList) {
                    successList.push(r)
                    successBufferRef.current.set(FuzzerIndex, successList)
                } else {
                    successBufferRef.current.set(FuzzerIndex, [r])
                }
            } else {
                let failedList = failedBufferRef.current.get(FuzzerIndex)
                if (failedList) {
                    failedList.push(r)
                    failedBufferRef.current.set(FuzzerIndex, failedList)
                } else {
                    failedBufferRef.current.set(FuzzerIndex, [r])
                }
            }
            updateData(FuzzerIndex)
        })
        ipcRenderer.on(endToken, () => {
            updateData("-1")
            setTimeout(() => {
                setLoading(false)
            }, 200)
        })
        ipcRenderer.on(errToken, (e, details) => {
            yakitNotify("error", `提交模糊测试请求失败 ${details}`)
            onUpdateSequence()
        })

        return () => {
            // resetResponse()
            // onClearRef()
            ipcRenderer.invoke("cancel-HTTPFuzzerSequence", token)
            ipcRenderer.removeAllListeners(errToken)
            ipcRenderer.removeAllListeners(dataToken)
            ipcRenderer.removeAllListeners(endToken)
        }
    }, [])

    useThrottleEffect(
        () => {
            if (responseMap.size === 1 && !currentSequenceItem) {
                // 获取迭代器对象
                const iterator = responseMap.entries()
                // 使用迭代器的next()方法获取第一个键值对
                const firstEntry = iterator.next().value
                const key = firstEntry[0]
                const value = firstEntry[1]
                const current: SequenceProps | undefined = sequenceList.find((ele) => ele.id === key)
                if (current) {
                    setCurrentSequenceItem(current)
                }
                setCurrentSelectResponse(value)
            }
            if (currentSequenceItem) {
                const currentResponse = responseMap.get(currentSequenceItem.id)
                if (currentResponse) setCurrentSelectResponse({...currentResponse})
            }
        },
        [responseMap],
        {
            wait: 200
        }
    )
    const updateData = useThrottleFn(
        (fuzzerIndex: string) => {
            if (fuzzerIndex === "-1") {
                onClearRef()
            }
            const successBuffer: FuzzerResponse[] = successBufferRef.current.get(fuzzerIndex) || []
            const failedBuffer: FuzzerResponse[] = failedBufferRef.current.get(fuzzerIndex) || []
            if (failedBuffer.length + successBuffer.length === 0) {
                return
            }
            const newSequenceList = sequenceList.map((item) => {
                if (item.disabled) {
                    return {
                        ...item,
                        disabled: item.id === fuzzerIndex ? false : true
                    }
                } else {
                    return item
                }
            })
            setSequenceList([...newSequenceList])

            let currentSuccessCount = successCountRef.current.get(fuzzerIndex) || 0
            let currentFailedCount = failedCountRef.current.get(fuzzerIndex) || 0
            if (successBuffer.length + failedBuffer.length === 1) {
                const onlyOneResponse = successBuffer.length === 1 ? successBuffer[0] : failedBuffer[0]
                // 设置第一个 response
                setResponse(fuzzerIndex, {
                    id: fuzzerIndex,
                    onlyOneResponse,
                    successCount: currentSuccessCount,
                    failedCount: currentFailedCount,
                    successFuzzer: successBuffer,
                    failedFuzzer: failedBuffer
                })
                return
            }
            const currentResponse = getResponse(fuzzerIndex)
            const newResponse: ResponseProps = {
                id: fuzzerIndex,
                onlyOneResponse: emptyFuzzer,
                ...currentResponse,
                successCount: currentSuccessCount,
                failedCount: currentFailedCount,
                successFuzzer: successBuffer,
                failedFuzzer: failedBuffer
            }
            setResponse(fuzzerIndex, newResponse)
        },
        {wait: 200}
    ).run
    const onClearRef = useMemoizedFn(() => {
        successCountRef.current.clear()
        failedCountRef.current.clear()
        successBufferRef.current.clear()
        failedBufferRef.current.clear()
    })
    /**
     * 组内的webFuzzer页面高级配置或者request发生变化，或者组发生变化，
     * 则更新原始序列originSequenceListRef,选中的item内容
     */
    const onUpdateSequence = useDebounceFn(
        useMemoizedFn(() => {
            if (loading || !inViewport) return
            const nodeInfo: NodeInfoProps | undefined = getPageNodeInfoByPageId(YakitRoute.HTTPFuzzer, props.pageId)
            if (!nodeInfo) return
            const {parentItem,subIndex} = nodeInfo
            if(subIndex===-1){
                setType('config')
                return
            }
            onSetOriginSequence(parentItem)
            const newSequenceList: SequenceProps[] = []
            sequenceList.forEach((item) => {
                const current = parentItem.pageChildrenList.find((ele) => ele.pageId === item.pageId)
                if(!item.pageId){
                    newSequenceList.push({
                        ...item,
                    })
                }
                if (current) {
                    newSequenceList.push({
                        ...item,
                        pageParams: current?.pageParamsInfo.webFuzzerPageInfo || defaultPageParams
                    })
                }
            })
            if (currentSequenceItem) {
                const index = newSequenceList.findIndex((ele) => currentSequenceItem.id === ele.id)
                if (index !== -1) setCurrentSequenceItem({...newSequenceList[index]})
            }
            setSequenceList([...newSequenceList])
        }),
        {wait: 200}
    ).run
    /**@returns bool false没有丢弃的数据，true有丢弃的数据 */
    const onIsDropped = useMemoizedFn((data, fuzzerIndex) => {
        const currentRequest = sequenceList.find((ele) => ele.id === fuzzerIndex)
        if (!currentRequest) return
        const advancedConfigValue: AdvancedConfigValueProps = {
            ...defaultAdvancedConfigValue,
            ...advancedConfigValueToFuzzerRequests(currentRequest.pageParams.advancedConfigValue)
        }
        if (advancedConfigValue.matchers?.length > 0) {
            // 设置了 matchers
            const hit = data["MatchedByMatcher"] === true
            // 丢包的条件：
            //   1. 命中过滤器，同时过滤模式设置为丢弃
            //   2. 未命中过滤器，过滤模式设置为保留
            if (
                (hit && advancedConfigValue.filterMode === "drop") ||
                (!hit && advancedConfigValue.filterMode === "match")
            ) {
                // 丢弃不匹配的内容
                return true
            }
            return false
        }
        return false
    })
    const getPageNodeInfoByPageIdByRoute = useMemoizedFn(() => {
        const nodeInfo: NodeInfoProps | undefined = getPageNodeInfoByPageId(YakitRoute.HTTPFuzzer, props.pageId)
        if (!nodeInfo) return
        const {parentItem, currentItem} = nodeInfo
        onSetOriginSequence(parentItem)
        if (sequenceList.length === 0) {
            const item = {
                id: `${randomString(8)}-1`,
                pageId: "",
                pageGroupId: currentItem.pageGroupId,
                pageName: "",
                pageParams: defaultPageParams,
                inheritCookies: false,
                inheritVariables: false
            }
            setSequenceList([item])
        }
    })

    /**设置原始序列 */
    const onSetOriginSequence = useMemoizedFn((parentItem: PageNodeItemProps) => {
        const newSequence: SequenceProps[] = parentItem.pageChildrenList?.map((item, index) => ({
            id: item.id,
            pageId: item.pageId,
            pageGroupId: item.pageGroupId,
            pageName: item.pageName,
            pageParams: item.pageParamsInfo.webFuzzerPageInfo || defaultPageParams,
            inheritCookies: false,
            inheritVariables: false
        }))
        originSequenceListRef.current = [...newSequence]
    })

    const onDragEnd = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const current: SequenceProps | undefined = sequenceList[result.source.index]
            if (current) {
                setCurrentSequenceItem(current)
                setCurrentSelectRequest(current.pageParams)
            }
            const newSequenceList: SequenceProps[] = reorder(
                sequenceList,
                result.source.index,
                result.destination.index
            )
            setSequenceList(newSequenceList)
        }
    })
    const onUpdateItem = useMemoizedFn((item: SequenceProps, index: number) => {
        if (index === errorIndex && item.pageId) {
            setErrorIndex(-1)
        }
        const originItem = originSequenceListRef.current.find((ele) => ele.pageId === item.pageId)
        if (!originItem) return
        sequenceList[index] = {...item, pageParams: originItem.pageParams}
        setSequenceList([...sequenceList])
    })
    /**
     * @description HotPatchCode和HotPatchCodeWithParamGetter一直使用缓存在数据库中的值
     * proxy,dnsServers,etcHosts使用各个页面上显示的值
     */
    const onStartExecution = useMemoizedFn(() => {
        const i = sequenceList.findIndex((ele) => !ele.pageId)
        if (i !== -1) {
            setErrorIndex(i)
            yakitNotify("error", "请配置序列后再执行")
            return
        }
        setLoading(true)
        const httpParams: FuzzerRequestProps[] = sequenceList.map((item) => ({
            ...advancedConfigValueToFuzzerRequests(item.pageParams.advancedConfigValue),
            RequestRaw: Buffer.from(item.pageParams.request, "utf8"), // StringToUint8Array(request, "utf8"),
            HotPatchCode: hotPatchCodeRef.current,
            // HotPatchCodeWithParamGetter: item.pageParams.request
            HotPatchCodeWithParamGetter: hotPatchCodeWithParamGetterRef.current,
            InheritCookies: item.inheritCookies,
            InheritVariables: item.inheritVariables,
            FuzzerIndex: item.id
        }))
        console.log("httpParams", httpParams)
        const newSequenceList = sequenceList.map((item) => ({...item, disabled: true}))
        setSequenceList([...newSequenceList])
        ipcRenderer.invoke("HTTPFuzzerSequence", {Requests: httpParams}, fuzzTokenRef.current)
    })
    const onForcedStop = useMemoizedFn(() => {
        setLoading(false)
        ipcRenderer.invoke("cancel-HTTPFuzzerSequence", fuzzTokenRef.current)
    })
    const onAddSequenceNode = useMemoizedFn(() => {
        if (isEmptySequence(sequenceList)) {
            yakitNotify("error", "已有空节点，请配置后再添加")
            return
        }
        const addItem: SequenceProps = {
            id: `${randomString(8)}-${sequenceList.length + 1}`,
            pageId: "",
            pageName: "",
            pageGroupId: "",
            inheritCookies: false,
            inheritVariables: false,
            pageParams: defaultPageParams
        }
        setSequenceList([...sequenceList, addItem])
    })
    const onApplyOtherNodes = useMemoizedFn((extraSetting: ExtraSettingProps) => {
        const newSequenceList = sequenceList.map((item) => ({
            ...item,
            ...extraSetting
        }))
        setSequenceList([...newSequenceList])
    })
    const onRemoveNode = useMemoizedFn((index: number) => {
        if (index === errorIndex) {
            setErrorIndex(-1)
        }
        if (sequenceList.length <= 1) {
            const newItem: SequenceProps = {
                id: "1",
                pageId: "",
                pageGroupId: "",
                pageName: "",
                inheritCookies: false,
                inheritVariables: false,
                pageParams: defaultPageParams
            }
            setSequenceList([newItem])
            setCurrentSequenceItem(undefined)
        } else {
            if (currentSequenceItem?.id === sequenceList[index].id) setCurrentSequenceItem(sequenceList[index - 1])
            sequenceList.splice(index, 1)
            setSequenceList([...sequenceList])
        }
    })
    const onSelect = useMemoizedFn((val: SequenceProps) => {
        if (!val.pageId) {
            yakitNotify("error", "请配置序列后再选中")
            return
        }
        setCurrentSequenceItem(val)
    })
    return (
        <div className={styles["fuzzer-sequence"]} ref={fuzzerSequenceRef}>
            <div className={styles["fuzzer-sequence-left"]}>
                <div className={styles["fuzzer-sequence-left-heard"]}>
                    <span>序列配置</span>
                    <div className={styles["fuzzer-sequence-left-heard-extra"]}>
                        <YakitButton type='text' disabled={loading} onClick={() => onAddSequenceNode()}>
                            添加节点
                            <SolidPlusIcon className={styles["plus-icon"]} />
                        </YakitButton>
                        {loading ? (
                            <YakitButton
                                onClick={() => onForcedStop()}
                                icon={<SolidStopIcon className={styles["stop-icon"]} />}
                                className='button-primary-danger'
                                danger={true}
                                type={"primary"}
                            >
                                强制停止
                            </YakitButton>
                        ) : (
                            <YakitButton
                                onClick={() => onStartExecution()}
                                icon={<SolidPlayIcon className={styles["play-icon"]} />}
                                type={"primary"}
                            >
                                开始执行
                            </YakitButton>
                        )}
                    </div>
                </div>
                <div className={styles["fuzzer-sequence-left-body"]}>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId='droppable1'>
                            {(provided, snapshot) => {
                                return (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={styles["fuzzer-sequence-list"]}
                                    >
                                        {sequenceList.map((sequenceItem, index) => {
                                            return (
                                                <Draggable
                                                    key={sequenceItem.id}
                                                    draggableId={sequenceItem.id}
                                                    index={index}
                                                    isDragDisabled={loading}
                                                >
                                                    {(providedItem, snapshotItem) => (
                                                        <div
                                                            ref={providedItem.innerRef}
                                                            {...providedItem.draggableProps}
                                                            {...providedItem.dragHandleProps}
                                                            style={getItemStyle(
                                                                snapshotItem.isDragging,
                                                                providedItem.draggableProps.style
                                                            )}
                                                        >
                                                            <SequenceItem
                                                                pageNodeList={originSequenceListRef.current}
                                                                item={sequenceItem}
                                                                isSelect={currentSequenceItem?.id === sequenceItem.id}
                                                                index={index}
                                                                errorIndex={errorIndex}
                                                                isDragging={snapshotItem.isDragging}
                                                                disabled={sequenceItem.disabled}
                                                                isShowLine={
                                                                    loading && index === sequenceList.length - 1
                                                                }
                                                                onApplyOtherNodes={onApplyOtherNodes}
                                                                onUpdateItem={(item) => onUpdateItem(item, index)}
                                                                onRemove={() => {
                                                                    onRemoveNode(index)
                                                                }}
                                                                onSelect={(val) => onSelect(val)}
                                                            />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            )
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )
                            }}
                        </Droppable>
                    </DragDropContext>
                    {!loading && (
                        <div className={styles["plus-sm-icon-body"]}>
                            <OutlinePlussmIcon className={styles["plus-sm-icon"]} onClick={() => onAddSequenceNode()} />
                        </div>
                    )}
                    <div className={styles["to-end"]}>已经到底啦～</div>
                </div>
            </div>
            <div className={classNames(styles["fuzzer-sequence-content"])}>
                {currentSequenceItem && currentSequenceItem.id ? (
                    <SequenceResponse
                        requestInfo={currentSelectRequest}
                        responseInfo={currentSelectResponse}
                        loading={loading}
                    />
                ) : (
                    <YakitEmpty title='请选择 Web Fuzzer' />
                )}
            </div>
        </div>
    )
})

export default FuzzerSequence

const SequenceItem: React.FC<SequenceItemProps> = React.memo((props) => {
    const {
        item,
        pageNodeList,
        index,
        isDragging,
        disabled,
        isShowLine,
        errorIndex,
        isSelect,
        onUpdateItem,
        onApplyOtherNodes,
        onRemove,
        onSelect
    } = props
    const [visible, setVisible] = useState<boolean>(false)

    const selectRef = useRef(null)
    const isHovering = useHover(selectRef)

    const options = useCreation(() => {
        return pageNodeList.map((ele) => ({
            value: ele.pageId,
            label: ele.pageName
        }))
    }, [pageNodeList])
    return (
        <div
            className={styles["fuzzer-sequence-list-item-body"]}
            onClick={() => {
                if (disabled) return
                onSelect(item)
            }}
        >
            <div
                className={classNames(styles["fuzzer-sequence-list-item"], {
                    [styles["fuzzer-sequence-list-item-hover"]]: visible,
                    [styles["fuzzer-sequence-list-item-hover-none"]]: disabled || isHovering,
                    [styles["fuzzer-sequence-list-item-disabled"]]: disabled,
                    [styles["fuzzer-sequence-list-item-isDragging"]]: isDragging,
                    [styles["fuzzer-sequence-list-item-isSelect"]]: isSelect,
                    [styles["fuzzer-sequence-list-item-errorIndex"]]: errorIndex === index,
                    [styles["fuzzer-sequence-list-item-no-line"]]: isShowLine
                })}
            >
                <div className={styles["fuzzer-sequence-list-item-heard"]}>
                    <div className={styles["fuzzer-sequence-list-item-heard-title"]}>
                        <SolidDragsortIcon
                            className={classNames(styles["drag-sort-icon"], {
                                [styles["drag-sort-disabled-icon"]]: disabled
                            })}
                        />
                        Step [{index}]
                    </div>
                    <div className={styles["fuzzer-sequence-list-item-heard-extra"]}>
                        <OutlineTrashIcon
                            className={classNames(styles["trash-icon"], {
                                [styles["item-disabled-icon"]]: disabled
                            })}
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemove(item)
                            }}
                        />
                        {index > 0 && (
                            <>
                                <Divider type='vertical' style={{margin: 0}} />
                                <YakitPopover
                                    title={
                                        <div className={styles["cog-popover-heard"]}>
                                            <span className={styles["cog-popover-heard-title"]}>节点配置</span>
                                            <span
                                                className={styles["cog-popover-heard-extra"]}
                                                onClick={() =>
                                                    onApplyOtherNodes({
                                                        inheritVariables: item.inheritVariables,
                                                        inheritCookies: item.inheritCookies
                                                    })
                                                }
                                            >
                                                应用到其他节点
                                            </span>
                                        </div>
                                    }
                                    content={
                                        <div className={styles["cog-popover-content"]}>
                                            <LabelNodeItem
                                                label='继承变量'
                                                labelClassName={styles["cog-popover-content-item"]}
                                            >
                                                <YakitSwitch
                                                    checked={item.inheritVariables}
                                                    onChange={(checked) =>
                                                        onUpdateItem({...item, inheritVariables: checked})
                                                    }
                                                />
                                            </LabelNodeItem>
                                            <LabelNodeItem
                                                label='继承 Cookie'
                                                labelClassName={styles["cog-popover-content-item"]}
                                            >
                                                <YakitSwitch
                                                    checked={item.inheritCookies}
                                                    onChange={(checked) =>
                                                        onUpdateItem({...item, inheritCookies: checked})
                                                    }
                                                />
                                            </LabelNodeItem>
                                        </div>
                                    }
                                    visible={visible}
                                    onVisibleChange={(v) => {
                                        if (disabled) return
                                        setVisible(v)
                                    }}
                                    overlayClassName={styles["cog-popover"]}
                                >
                                    <OutlineCogIcon
                                        className={classNames(styles["cog-icon"], {
                                            [styles["cog-icon-hover"]]: visible,
                                            [styles["item-disabled-icon"]]: disabled
                                        })}
                                    />
                                </YakitPopover>
                            </>
                        )}
                    </div>
                </div>
                <div
                    ref={selectRef}
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                >
                    <YakitSelect
                        value={{
                            value: item.pageId,
                            label: item.pageName
                        }}
                        labelInValue
                        options={options}
                        onChange={(v) => {
                            onUpdateItem({...item, pageId: v.value, pageName: v.label})
                        }}
                        getPopupContainer={(dom) => dom}
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    )
})

const SequenceResponse: React.FC<SequenceResponseProps> = React.memo((props) => {
    const {requestInfo, responseInfo, loading} = props
    const {
        id: responseInfoId,
        onlyOneResponse: httpResponse,
        successFuzzer,
        failedFuzzer,
        successCount,
        failedCount
    } = responseInfo || {
        id: "0",
        onlyOneResponse: {...emptyFuzzer},
        successFuzzer: [],
        failedFuzzer: [],
        successCount: 0,
        failedCount: 0
    }
    const {request, advancedConfigValue} = requestInfo || {
        request: "",
        advancedConfigValue: {...defaultAdvancedConfigValue}
    }

    const [showSuccess, setShowSuccess] = useState(true)
    const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()
    const [affixSearch, setAffixSearch] = useState<string>("")
    const [defaultResponseSearch, setDefaultResponseSearch] = useState<string>("")
    const [isRefresh, setIsRefresh] = useState<boolean>(false)

    const secondNodeRef = useRef(null)
    const secondNodeSize = useSize(secondNodeRef)

    const successTableRef = useRef<any>()

    const cachedTotal: number = useCreation(() => {
        return failedCount + successCount
    }, [failedCount, successCount])
    const onlyOneResponse: boolean = useCreation(() => {
        return cachedTotal === 1
    }, [cachedTotal])
    const [extractedMap, {setAll, reset}] = useMap<string, string>()
    useEffect(() => {
        ipcRenderer.on("fetch-extracted-to-table", (e: any, data: {extractedMap: Map<string, string>}) => {
            setAll(data.extractedMap)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-extracted-to-table")
        }
    }, [])
    useUpdateEffect(() => {
        if (successTableRef.current) {
            successTableRef.current.setCurrentSelectItem(undefined)
            successTableRef.current.setFirstFull(true)
        }
        setIsRefresh(!isRefresh)
        setQuery(undefined)
    }, [responseInfoId])
    const sendToFuzzer = useMemoizedFn((isHttps: boolean, requestValue: string) => {
        ipcRenderer.invoke("send-to-tab", {
            type: "fuzzer",
            data: {isHttps: isHttps, isGmTLS: advancedConfigValue.isGmTLS, request: requestValue}
        })
    })
    return (
        <ResizeCardBox
            firstMinSize={380}
            secondMinSize={480}
            isShowDefaultLineStyle={false}
            style={{overflow: "hidden"}}
            firstNodeProps={{
                title: "Request"
            }}
            secondNodeProps={{
                title: (
                    <>
                        <span style={{marginRight: 8}}>Responses</span>
                        <SecondNodeTitle
                            cachedTotal={cachedTotal}
                            onlyOneResponse={onlyOneResponse}
                            rsp={httpResponse}
                            successFuzzerLength={(successFuzzer || []).length}
                            failedFuzzerLength={(failedFuzzer || []).length}
                            showSuccess={showSuccess}
                            setShowSuccess={(v) => {
                                setShowSuccess(v)
                                setQuery(undefined)
                            }}
                        />
                    </>
                ),
                extra: (
                    <SecondNodeExtra
                        onlyOneResponse={onlyOneResponse}
                        cachedTotal={cachedTotal}
                        rsp={httpResponse}
                        valueSearch={affixSearch}
                        onSearchValueChange={(value) => {
                            setAffixSearch(value)
                            if (value === "" && defaultResponseSearch !== "") {
                                setDefaultResponseSearch("")
                            }
                        }}
                        onSearch={() => {
                            setDefaultResponseSearch(affixSearch)
                        }}
                        successFuzzer={successFuzzer}
                        secondNodeSize={secondNodeSize}
                        query={query}
                        setQuery={(q) => setQuery({...q})}
                    />
                )
            }}
            firstNode={
                <NewHTTPPacketEditor
                    noHex={true}
                    noHeader={true}
                    hideSearch={true}
                    bordered={false}
                    noMinimap={true}
                    utf8={true}
                    originValue={StringToUint8Array(request)}
                    readOnly={true}
                    // onChange={(i) => setRequest(Uint8ArrayToString(i, "utf8"))}
                />
            }
            secondNode={
                <div ref={secondNodeRef} style={{height: "100%", overflow: "hidden"}}>
                    {onlyOneResponse ? (
                        <ResponseViewer
                            fuzzerResponse={httpResponse}
                            defaultResponseSearch={defaultResponseSearch}
                            webFuzzerValue={httpResponse.ResponseRaw}
                            showMatcherAndExtraction={false}
                            setShowMatcherAndExtraction={() => {}}
                            matcherValue={{
                                filterMode: "matchers",
                                hitColor: "",
                                matchersCondition: "and",
                                matchersList: []
                            }}
                            extractorValue={{
                                extractorList: []
                            }}
                            defActiveKey={""}
                            defActiveType={"matchers"}
                            onSaveMatcherAndExtraction={() => {}}
                        />
                    ) : (
                        <>
                            {cachedTotal > 1 ? (
                                <>
                                    {showSuccess && (
                                        <HTTPFuzzerPageTable
                                            ref={successTableRef}
                                            isRefresh={isRefresh}
                                            onSendToWebFuzzer={sendToFuzzer}
                                            success={showSuccess}
                                            data={successFuzzer}
                                            query={query}
                                            setQuery={setQuery}
                                            extractedMap={extractedMap}
                                            isEnd={loading}
                                            isShowDebug={false}
                                        />
                                    )}
                                    {!showSuccess && (
                                        <HTTPFuzzerPageTable
                                            isRefresh={isRefresh}
                                            success={showSuccess}
                                            data={failedFuzzer}
                                            query={query}
                                            setQuery={setQuery}
                                            isEnd={loading}
                                            extractedMap={extractedMap}
                                        />
                                    )}
                                </>
                            ) : (
                                <Result status={"warning"} title={"请执行序列后进行查看"} />
                            )}
                        </>
                    )}
                </div>
            }
        />
    )
})
