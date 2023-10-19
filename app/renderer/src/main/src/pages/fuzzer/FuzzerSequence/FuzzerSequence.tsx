import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    ExtraSettingProps,
    FuzzerSequenceProps,
    FuzzerSequenceResponse,
    ResponseProps,
    SequenceItemProps,
    SequenceProps,
    SequenceResponseHeardProps,
    SequenceResponseProps,
    SequenceResponseRefProps
} from "./FuzzerSequenceType"
import styles from "./FuzzerSequence.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    SolidDragsortIcon,
    SolidPlayIcon,
    SolidPlusIcon,
    SolidStopIcon,
    SolidSwitchConfigurationIcon
} from "@/assets/icon/solid"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {
    useCreation,
    useDebounceEffect,
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
import {
    OutlineArrowcirclerightIcon,
    OutlinePencilaltIcon,
    OutlinePlussmIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {Divider, Result, Tooltip} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import classNames from "classnames"
import {LabelNodeItem, MatcherAndExtractionDrawer} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {yakitNotify} from "@/utils/notification"
import {YakitRoute} from "@/routes/newRoute"
import {
    FuzzerExtraShow,
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
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {AdvancedConfigValueProps} from "../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {HTTP_PACKET_EDITOR_Response_Info} from "@/utils/editors"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {HTTPFuzzerPageTable, HTTPFuzzerPageTableQuery} from "../components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import {
    MatcherValueProps,
    ExtractorValueProps,
    MatchingAndExtraction,
    MatcherAndExtractionRefProps,
    MatcherAndExtractionValueProps
} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {InheritLineIcon, InheritArrowIcon} from "./icon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ArrowsExpandIcon, ArrowsRetractIcon} from "@/assets/newIcon"
import {WebFuzzerNewEditor} from "../WebFuzzerNewEditor/WebFuzzerNewEditor"
import {shallow} from "zustand/shallow"
import {useFuzzerSequence} from "@/store/fuzzerSequence"
import {PageNodeItemProps, WebFuzzerPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {compareAsc} from "@/pages/yakitStore/viewers/base"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {monacoEditorWrite} from "../fuzzerTemplates"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {HTTPFuzzerHotPatch} from "../HTTPFuzzerHotPatch"

const ResponseCard = React.lazy(() => import("./ResponseCard"))

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

const reorder = (list: any[], startIndex: number, endIndex: number) => {
    const result = Array.from(list)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}

const defaultPageParams: WebFuzzerPageInfoProps = {
    pageId: "",
    advancedConfigValue: {
        ...defaultAdvancedConfigValue
    },
    request: defaultPostTemplate
}

const isEmptySequence = (list: SequenceProps[]) => {
    return list.findIndex((ele) => !ele.pageId) !== -1
}

const FuzzerSequence: React.FC<FuzzerSequenceProps> = React.memo((props) => {
    const {queryPagesDataById, selectGroupId, getPagesDataByGroupId} = usePageInfo(
        (state) => ({
            queryPagesDataById: state.queryPagesDataById,
            selectGroupId: state.selectGroupId.get(YakitRoute.HTTPFuzzer) || "",
            getPagesDataByGroupId: state.getPagesDataByGroupId
        }),
        shallow
    )
    const {queryFuzzerSequenceCacheDataByGroupId, updateFuzzerSequenceCacheData, addFuzzerSequenceCacheData} =
        useFuzzerSequence(
            (state) => ({
                queryFuzzerSequenceCacheDataByGroupId: state.queryFuzzerSequenceCacheDataByGroupId,
                updateFuzzerSequenceCacheData: state.updateFuzzerSequenceCacheData,
                addFuzzerSequenceCacheData: state.addFuzzerSequenceCacheData
            }),
            shallow
        )

    const {setType, groupId: propsGroupId} = props

    const [loading, setLoading] = useState<boolean>(false)

    const [originSequenceList, setOriginSequenceList] = useState<SequenceProps[]>([])
    const [sequenceList, setSequenceList] = useState<SequenceProps[]>(
        queryFuzzerSequenceCacheDataByGroupId(propsGroupId)
    )
    const [errorIndex, setErrorIndex] = useState<number>(-1)

    const [showAllResponse, setShowAllResponse] = useState<boolean>(false)

    // Request
    const [currentSelectRequest, setCurrentSelectRequest] = useState<WebFuzzerPageInfoProps>()
    const [requestMap, {set: setRequest, get: getRequest}] = useMap<string, AdvancedConfigValueProps>(new Map())

    // Response
    const [currentSequenceItem, setCurrentSequenceItem] = useState<SequenceProps>()

    const [currentSelectResponse, setCurrentSelectResponse] = useState<ResponseProps>()
    const [responseMap, {set: setResponse, get: getResponse, reset: resetResponse}] = useMap<string, ResponseProps>()
    const [droppedCountMap, {set: setDroppedCount, get: getDroppedCount, reset: resetDroppedCount}] = useMap<
        string,
        number
    >(new Map())

    const fuzzTokenRef = useRef<string>(randomString(60))
    const hotPatchCodeRef = useRef<string>("")
    const hotPatchCodeWithParamGetterRef = useRef<string>("")
    const sequenceResponseRef = useRef<SequenceResponseRefProps>({
        validate: () => new Promise(() => {})
    })

    const fuzzerSequenceRef = useRef(null)
    const [inViewport] = useInViewport(fuzzerSequenceRef)

    const [extractedMap, {reset, set}] = useMap<string, Map<string, string>>()

    useDebounceEffect(
        () => {
            const effectiveSequenceList = sequenceList.filter((ele) => ele.pageId)
            if (effectiveSequenceList.length > 0) {
                updateFuzzerSequenceCacheData(propsGroupId, effectiveSequenceList)
            } else {
                addFuzzerSequenceCacheData(propsGroupId, [])
            }
        },
        [sequenceList],
        {wait: 200}
    )
    useEffect(() => {
        ipcRenderer.on(
            "fetch-extracted-to-table",
            (e: any, data: {pageId: string; type: string; extractedMap: Map<string, string>}) => {
                if (data.type === "fuzzerSequence") {
                    setExtractedMap(data.extractedMap)
                }
            }
        )
        return () => {
            ipcRenderer.removeAllListeners("fetch-extracted-to-table")
        }
    }, [])

    useEffect(() => {
        if (inViewport) {
            const unSubPageNode = usePageInfo.subscribe(
                (state) => {
                    const names = state.getCurrentGroupAllTabName(YakitRoute.HTTPFuzzer)
                    return names
                },
                (selectedState, previousSelectedState) => {
                    onUpdateSequence()
                }
            )
            return () => {
                unSubPageNode()
            }
        }
    }, [inViewport])

    useUpdateEffect(() => {
        if (!loading) {
            onUpdateSequence()
            const newSequenceList = sequenceList.map((item) => ({
                ...item,
                disabled: false
            }))
            setSequenceList([...newSequenceList])
            onClearRef()
        }
    }, [loading])
    useEffect(() => {
        getPageNodeInfoByPageIdByRoute()
    }, [])
    useEffect(() => {
        if (!inViewport) return
        onUpdateSequence()
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
        setTimeout(() => {
            if (currentSequenceItem) {
                const currentSequenceRequest = getCurrentSequenceRequest(currentSequenceItem.pageId)
                if (currentSequenceRequest?.pageParamsInfo.webFuzzerPageInfo) {
                    setCurrentSelectRequest({
                        ...currentSequenceRequest.pageParamsInfo.webFuzzerPageInfo
                    })
                }
            }
        }, 200)
    }, [inViewport])

    const successCountRef = useRef<Map<string, number>>(new Map())
    const failedCountRef = useRef<Map<string, number>>(new Map())
    const successBufferRef = useRef<Map<string, FuzzerResponse[]>>(new Map())
    const failedBufferRef = useRef<Map<string, FuzzerResponse[]>>(new Map())

    useEffect(() => {
        if (currentSequenceItem) {
            const currentSequenceRequest = getCurrentSequenceRequest(currentSequenceItem.pageId)
            if (currentSequenceRequest?.pageParamsInfo.webFuzzerPageInfo) {
                setCurrentSelectRequest({
                    ...currentSequenceRequest.pageParamsInfo.webFuzzerPageInfo
                })
            }

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
    useThrottleEffect(
        () => {
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
    useEffect(() => {
        const token = fuzzTokenRef.current
        const dataToken = `${token}-data`
        const errToken = `${token}-error`
        const endToken = `${token}-end`
        ipcRenderer.on(dataToken, (e: any, data: FuzzerSequenceResponse) => {
            const {Response, Request} = data
            const {FuzzerIndex = ""} = Request
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
            onSetFirstAsSelected(FuzzerIndex)
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
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })
        ipcRenderer.on(errToken, (e, details) => {
            yakitNotify("error", `提交模糊测试请求失败 ${details}`)
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })

        return () => {
            ipcRenderer.invoke("cancel-HTTPFuzzerSequence", token)
            ipcRenderer.removeAllListeners(errToken)
            ipcRenderer.removeAllListeners(dataToken)
            ipcRenderer.removeAllListeners(endToken)
        }
    }, [])
    const getCurrentSequenceRequest = useMemoizedFn((pageId: string) => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
        if (currentItem) {
            return currentItem
        }
    })
    const getCurrentGroupSequence = useMemoizedFn(() => {
        const pageChildrenList = getPagesDataByGroupId(YakitRoute.HTTPFuzzer, selectGroupId)
        return pageChildrenList.sort((a, b) => compareAsc(a, b, "sortFieId")) || []
    })
    const setExtractedMap = useMemoizedFn((extractedMap: Map<string, string>) => {
        if (inViewport && currentSequenceItem) set(currentSequenceItem?.id, extractedMap)
    })
    /**点击开始执行后，如果没有选中项，则设置返回的第一个为选中item */
    const onSetFirstAsSelected = useMemoizedFn((fuzzerIndex: string) => {
        if (!currentSequenceItem) {
            const current: SequenceProps | undefined = sequenceList.find((ele) => ele.id === fuzzerIndex)
            if (current) {
                setCurrentSequenceItem(current)
            }
        }
    })
    const updateData = useThrottleFn(
        (fuzzerIndex: string) => {
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
                successFuzzer: [...successBuffer],
                failedFuzzer: [...failedBuffer]
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
            const pageChildrenList = getCurrentGroupSequence()
            if (pageChildrenList.length === 0) {
                if (setType) setType("config")
                return
            }

            onSetOriginSequence(pageChildrenList)
            const newSequenceList: SequenceProps[] = []
            sequenceList.forEach((item) => {
                const current = pageChildrenList.find((ele) => ele.pageId === item.pageId)
                if (!item.pageId) {
                    newSequenceList.push({
                        ...item
                    })
                }
                if (current) {
                    newSequenceList.push({
                        ...item
                    })
                }
            })
            if (newSequenceList.findIndex((ele) => ele.pageId === currentSequenceItem?.pageId) === -1) {
                setCurrentSequenceItem(undefined)
            }
            if (newSequenceList.length === 0) {
                const newItem: SequenceProps = {
                    id: "1",
                    name: `Step [0]`,
                    pageId: "",
                    pageGroupId: "",
                    pageName: "",
                    inheritCookies: true,
                    inheritVariables: true
                    // pageParams: defaultPageParams
                }
                newSequenceList.push(newItem)
            }
            setSequenceList([...newSequenceList])
        }),
        {wait: 200}
    ).run
    /**@returns bool false没有丢弃的数据，true有丢弃的数据 */
    const onIsDropped = useMemoizedFn((data, fuzzerIndex) => {
        const currentRequest = getRequest(fuzzerIndex)
        if (!currentRequest) return
        const advancedConfigValue: AdvancedConfigValueProps = {
            ...defaultAdvancedConfigValue,
            ...currentRequest
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
                let dropCount = getDroppedCount(fuzzerIndex)
                if (dropCount) {
                    dropCount++
                } else {
                    dropCount = 1
                }
                setDroppedCount(fuzzerIndex, dropCount)
                return true
            }
            return false
        }
        return false
    })
    const getPageNodeInfoByPageIdByRoute = useMemoizedFn(() => {
        const pageChildrenList = getCurrentGroupSequence()
        onSetOriginSequence(pageChildrenList)
        if (sequenceList.length === 0) {
            const item: SequenceProps = {
                id: `${randomString(8)}-1`,
                name: "Step [0]",
                pageId: "",
                pageGroupId: pageChildrenList[0]?.pageGroupId || props.groupId,
                pageName: "",
                inheritCookies: true,
                inheritVariables: true
            }
            setCurrentSequenceItem({...item})
            setSequenceList([item])
        }
    })

    /**设置原始序列 */
    const onSetOriginSequence = useMemoizedFn((pageChildrenList: PageNodeItemProps[]) => {
        const newSequence: SequenceProps[] = pageChildrenList.map((item, index) => ({
            id: item.id,
            name: `Step [${index}]`,
            pageId: item.pageId,
            pageGroupId: item.pageGroupId,
            pageName: item.pageName,
            pageParams: item.pageParamsInfo.webFuzzerPageInfo || defaultPageParams,
            inheritCookies: true,
            inheritVariables: true
        }))
        setOriginSequenceList([...newSequence])
    })

    const onDragEnd = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const current: SequenceProps | undefined = sequenceList[result.source.index]
            if (current) {
                setCurrentSequenceItem(current)
            }
            const newSequenceList: SequenceProps[] = reorder(
                sequenceList,
                result.source.index,
                result.destination.index
            )
            setSequenceList(newSequenceList)
        }
    })
    const onUpdateItemPage = useMemoizedFn((item: SequenceProps, index: number) => {
        if (index === errorIndex && item.pageId) {
            setErrorIndex(-1)
        }
        const originItem = originSequenceList.find((ele) => ele.pageId === item.pageId)
        if (!originItem) return
        sequenceList[index] = {
            ...item
            //  pageParams: originItem.pageParams
        }
        setCurrentSequenceItem({...item})
        setSequenceList([...sequenceList])
    })
    const onUpdateItem = useMemoizedFn((item: SequenceProps, index: number) => {
        if (item.id === currentSequenceItem?.id) {
            setCurrentSequenceItem({...item})
        }
        sequenceList[index] = {...item}
        setSequenceList([...sequenceList])
    })
    /**
     * @description HotPatchCode和HotPatchCodeWithParamGetter一直使用缓存在数据库中的值
     * proxy,dnsServers,etcHosts使用各个页面上显示的值
     */
    const getHttpParams = useMemoizedFn(() => {
        const httpParams: FuzzerRequestProps[] = []
        const pageChildrenList = getCurrentGroupSequence()
        sequenceList.forEach((item) => {
            const requestItem = pageChildrenList.find((ele) => ele.pageId === item.pageId)
            const webFuzzerPageInfo = requestItem?.pageParamsInfo.webFuzzerPageInfo
            if (webFuzzerPageInfo) {
                const httpParamsItem: FuzzerRequestProps = {
                    ...advancedConfigValueToFuzzerRequests(webFuzzerPageInfo.advancedConfigValue),
                    RequestRaw: Buffer.from(webFuzzerPageInfo.request, "utf8"), // StringToUint8Array(request, "utf8"),
                    HotPatchCode: hotPatchCodeRef.current,
                    // HotPatchCodeWithParamGetter: item.pageParams.request,
                    HotPatchCodeWithParamGetter: hotPatchCodeWithParamGetterRef.current,
                    InheritCookies: item.inheritCookies,
                    InheritVariables: item.inheritVariables,
                    FuzzerIndex: item.id,
                    FuzzerTabIndex: item.pageId
                }
                setRequest(item.id, webFuzzerPageInfo.advancedConfigValue)
                httpParams.push(httpParamsItem)
            }
        })
        // console.log("httpParams", httpParams)
        return httpParams
    })

    const isShowSequenceResponse = useMemo(() => {
        return currentSequenceItem && currentSequenceItem.id && currentSelectRequest
    }, [currentSequenceItem, currentSelectRequest])

    const onValidateMatcherAndExtraction = useMemoizedFn(async () => {
        if (isShowSequenceResponse && sequenceResponseRef && sequenceResponseRef.current) {
            await sequenceResponseRef.current.validate()
            onStartExecution()
        } else {
            onStartExecution()
        }
    })

    const onStartExecution = useMemoizedFn(() => {
        const i = sequenceList.findIndex((ele) => !ele.pageId)
        if (i !== -1) {
            setErrorIndex(i)
            yakitNotify("error", "请配置序列后再执行")
            return
        }
        setLoading(true)
        onClearRef()
        resetResponse()
        resetDroppedCount()
        setCurrentSelectResponse(undefined)
        const newSequenceList = sequenceList.map((item) => ({...item, disabled: true}))
        setSequenceList([...newSequenceList])
        ipcRenderer.invoke("HTTPFuzzerSequence", {Requests: getHttpParams()}, fuzzTokenRef.current)
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
            name: `Step [${sequenceList.length}]`,
            pageId: "",
            pageName: "",
            pageGroupId: "",
            inheritCookies: true,
            inheritVariables: true
            // pageParams: defaultPageParams
        }
        setCurrentSequenceItem({...addItem})
        setSequenceList([...sequenceList, addItem])
    })
    const onApplyOtherNodes = useMemoizedFn((extraSetting: ExtraSettingProps) => {
        const newSequenceList = sequenceList.map((item) => ({
            ...item,
            ...extraSetting
        }))
        setSequenceList([...newSequenceList])
        yakitNotify("success", "应用成功")
    })
    const onRemoveNode = useMemoizedFn((index: number) => {
        if (index === errorIndex) {
            setErrorIndex(-1)
        }
        if (sequenceList.length <= 1) {
            const newItem: SequenceProps = {
                id: "1",
                name: `Step [0]`,
                pageId: "",
                pageGroupId: "",
                pageName: "",
                inheritCookies: true,
                inheritVariables: true
                // pageParams: defaultPageParams
            }
            setSequenceList([newItem])
            setCurrentSequenceItem({...newItem})
        } else {
            if (currentSequenceItem?.id === sequenceList[index].id) {
                setCurrentSequenceItem(sequenceList[index - 1])
            }
            sequenceList.splice(index, 1)
            setSequenceList([...sequenceList])
        }
    })
    const onSelect = useMemoizedFn((val: SequenceProps) => {
        if (!val.pageId) {
            yakitNotify("error", "请配置序列后再选中")
            return
        }
        setCurrentSequenceItem({...val})
    })
    const onSetShowAllResponse = useMemoizedFn(() => {
        setShowAllResponse(false)
    })

    const setHotPatchCode = useMemoizedFn((val) => {
        hotPatchCodeRef.current = val
    })
    const setHotPatchCodeWithParamGetter = useMemoizedFn((val) => {
        hotPatchCodeWithParamGetterRef.current = val
    })
    return (
        <>
            <div
                className={styles["fuzzer-sequence"]}
                style={{display: showAllResponse ? "none" : ""}}
                ref={fuzzerSequenceRef}
            >
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
                                    colors='danger'
                                    type={"primary"}
                                >
                                    强制停止
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    onClick={onValidateMatcherAndExtraction}
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
                                                                    pageNodeList={originSequenceList}
                                                                    item={sequenceItem}
                                                                    isSelect={
                                                                        currentSequenceItem?.id === sequenceItem.id
                                                                    }
                                                                    index={index}
                                                                    errorIndex={errorIndex}
                                                                    isDragging={snapshotItem.isDragging}
                                                                    disabled={sequenceItem.disabled}
                                                                    isShowLine={
                                                                        loading && index === sequenceList.length - 1
                                                                    }
                                                                    onApplyOtherNodes={onApplyOtherNodes}
                                                                    onUpdateItemPage={(item) =>
                                                                        onUpdateItemPage(item, index)
                                                                    }
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
                                {sequenceList.length > 0 && (
                                    <div className={classNames(styles["inherit-line-icon"])}>
                                        <InheritLineIcon />
                                    </div>
                                )}
                                <OutlinePlussmIcon
                                    className={styles["plus-sm-icon"]}
                                    onClick={() => onAddSequenceNode()}
                                />
                            </div>
                        )}
                        <div className={styles["to-end"]}>已经到底啦～</div>
                    </div>
                </div>
                <div className={classNames(styles["fuzzer-sequence-content"])}>
                    {currentSequenceItem && isShowSequenceResponse ? (
                        <>
                            <SequenceResponseHeard
                                currentSequenceItemName={currentSequenceItem.name}
                                currentSequenceItemPageName={currentSequenceItem.pageName}
                                disabled={responseMap.size === 0 || loading}
                                responseInfo={currentSelectResponse}
                                advancedConfigValue={currentSelectRequest?.advancedConfigValue}
                                droppedCount={getDroppedCount(currentSequenceItem.id) || 0}
                                onShowAll={() => {
                                    setShowAllResponse(true)
                                }}
                            />
                            <SequenceResponse
                                ref={sequenceResponseRef}
                                requestInfo={currentSelectRequest}
                                responseInfo={currentSelectResponse}
                                loading={loading}
                                extractedMap={extractedMap.get(currentSequenceItem.id) || new Map()}
                                hotPatchCode={hotPatchCodeRef.current}
                                hotPatchCodeWithParamGetter={hotPatchCodeWithParamGetterRef.current}
                                setHotPatchCode={setHotPatchCode}
                                setHotPatchCodeWithParamGetter={setHotPatchCodeWithParamGetter}
                            />
                        </>
                    ) : (
                        <YakitEmpty title='请选择 Web Fuzzer(如需使用序列，请将其他标签页拖入该分组)' />
                    )}
                </div>
            </div>
            <React.Suspense fallback={<>loading allFuzzerSequenceList ...</>}>
                <ResponseCard
                    showAllResponse={showAllResponse}
                    responseMap={responseMap}
                    setShowAllResponse={onSetShowAllResponse}
                />
            </React.Suspense>
        </>
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
        errorIndex,
        isSelect,
        onUpdateItemPage,
        onUpdateItem,
        onApplyOtherNodes,
        onRemove,
        onSelect
    } = props
    const [selectVisible, setSelectVisible] = useState<boolean>(false)
    const [visible, setVisible] = useState<boolean>(false)
    const [editNameVisible, setEditNameVisible] = useState<boolean>(false)
    const [name, setName] = useState<string>(item.name)

    const selectRef = useRef(null)
    const isHovering = useHover(selectRef)

    const options = useCreation(() => {
        return pageNodeList.map((ele) => ({
            value: ele.pageId,
            label: ele.pageName
        }))
    }, [pageNodeList])
    const tipText = useMemo(() => {
        const t: string[] = []
        if (item?.inheritVariables) t.push("变量")
        if (item?.inheritCookies) t.push("Cookie")
        return t.join("  ,  ")
    }, [item?.inheritVariables, item?.inheritCookies])
    const onSelectSubMenuById = useMemoizedFn((pageId: string) => {
        ipcRenderer.invoke("send-open-subMenu-item", {pageId})
    })
    return (
        <>
            {index > 0 && (
                <div
                    className={styles["fuzzer-sequence-list-item-footer"]}
                    style={{
                        opacity: isDragging ? 0 : 1
                    }}
                >
                    <div
                        className={classNames(styles["fuzzer-sequence-list-item-footer-line"], {
                            [styles["fuzzer-sequence-list-item-footer-line-primary"]]:
                                item?.inheritVariables || item?.inheritCookies
                        })}
                    >
                        <InheritLineIcon />
                    </div>
                    {(item?.inheritVariables || item?.inheritCookies) && (
                        <>
                            <div className={styles["fuzzer-sequence-list-item-footer-tag"]}>{tipText}</div>
                            <InheritArrowIcon />
                        </>
                    )}
                </div>
            )}
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
                        [styles["fuzzer-sequence-list-item-errorIndex"]]: errorIndex === index
                        // [styles["fuzzer-sequence-list-item-no-line"]]: isShowLine
                    })}
                >
                    <div className={styles["fuzzer-sequence-list-item-heard"]}>
                        <div className={styles["fuzzer-sequence-list-item-heard-title"]}>
                            <SolidDragsortIcon
                                className={classNames(styles["drag-sort-icon"], {
                                    [styles["drag-sort-disabled-icon"]]: disabled
                                })}
                            />
                            <Tooltip title={item.name}>
                                <span className='content-ellipsis'>{item.name}</span>
                            </Tooltip>
                            <YakitPopover
                                overlayClassName={styles["edit-name-popover"]}
                                content={
                                    <div
                                        className={styles["edit-name-popover-content"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        <div className={styles["edit-name-popover-content-title"]}>修改名称</div>
                                        <YakitInput
                                            defaultValue={item.name}
                                            value={name}
                                            showCount
                                            maxLength={20}
                                            onChange={(e) => {
                                                const {value} = e.target
                                                setName(value)
                                            }}
                                            onBlur={(e) => {
                                                const {value} = e.target
                                                if (!value) {
                                                    yakitNotify("error", "名称不能为空")
                                                    return
                                                }
                                                if (value.length > 20) {
                                                    yakitNotify("error", "不超过20个字符")
                                                    return
                                                }
                                                onUpdateItem({...item, name: value})
                                            }}
                                        />
                                    </div>
                                }
                                placement='top'
                                trigger={["click"]}
                                visible={editNameVisible}
                                onVisibleChange={setEditNameVisible}
                            >
                                <OutlinePencilaltIcon
                                    className={classNames(styles["list-item-icon"], {
                                        [styles["icon-active"]]: editNameVisible
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                    }}
                                />
                            </YakitPopover>
                        </div>
                        <div className={styles["fuzzer-sequence-list-item-heard-extra"]}>
                            <OutlineTrashIcon
                                className={classNames(styles["list-item-icon"], {
                                    [styles["list-item-disabled-icon"]]: disabled
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
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onApplyOtherNodes({
                                                            inheritVariables: item.inheritVariables,
                                                            inheritCookies: item.inheritCookies
                                                        })
                                                    }}
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
                                            if (!item.pageId) return
                                            setVisible(v)
                                        }}
                                        overlayClassName={styles["cog-popover"]}
                                    >
                                        <SolidSwitchConfigurationIcon
                                            className={classNames(styles["list-item-icon"], {
                                                [styles["list-item-icon-hover"]]: visible,
                                                [styles["list-item-disabled-icon"]]: disabled
                                            })}
                                        />
                                    </YakitPopover>
                                </>
                            )}
                            <Divider type='vertical' style={{margin: 0}} />
                            <Tooltip title='前往Fuzzer配置'>
                                <OutlineArrowcirclerightIcon
                                    className={classNames(styles["list-item-icon"], {
                                        [styles["list-item-disabled-icon"]]: disabled
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (disabled) return
                                        if (!item.pageId) {
                                            yakitNotify("error", "请选择页面")
                                        } else {
                                            onSelectSubMenuById(item.pageId)
                                        }
                                    }}
                                />
                            </Tooltip>
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
                                onUpdateItemPage({...item, pageId: v.value, pageName: v.label})
                            }}
                            getPopupContainer={(dom) => dom}
                            disabled={disabled}
                            onDropdownVisibleChange={(v) => {
                                setSelectVisible(v)
                            }}
                            open={selectVisible && !isDragging}
                        />
                    </div>
                </div>
            </div>
        </>
    )
})

const SequenceResponseHeard: React.FC<SequenceResponseHeardProps> = React.memo((props) => {
    const {
        advancedConfigValue,
        droppedCount,
        responseInfo,
        disabled,
        onShowAll,
        currentSequenceItemName,
        currentSequenceItemPageName
    } = props
    const {
        onlyOneResponse: httpResponse,
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
    const cachedTotal: number = useCreation(() => {
        return failedCount + successCount
    }, [failedCount, successCount])
    const onlyOneResponse: boolean = useCreation(() => {
        return cachedTotal === 1
    }, [cachedTotal])
    return (
        <div className={styles["sequence-response-heard"]}>
            <div className={styles["sequence-response-heard-left"]}>
                <span>
                    <span className={styles["sequence-response-heard-left-title"]}>
                        {currentSequenceItemName || ""}
                    </span>
                    <span className={styles["sequence-response-heard-left-subTitle"]}>
                        {currentSequenceItemPageName || ""}
                    </span>
                </span>

                <FuzzerExtraShow
                    droppedCount={droppedCount}
                    advancedConfigValue={advancedConfigValue || defaultAdvancedConfigValue}
                    onlyOneResponse={onlyOneResponse}
                    httpResponse={httpResponse}
                />
            </div>
            <div>
                {/* <ShareImportExportData module='fuzzer' supportShare={false} supportImport={false} getFuzzerRequestParams={getHttpParams} /> */}
                <YakitButton type='primary' disabled={disabled} onClick={() => onShowAll()}>
                    展示全部响应
                </YakitButton>
            </div>
        </div>
    )
})

const SequenceResponse: React.FC<SequenceResponseProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            requestInfo,
            responseInfo,
            loading,
            extractedMap,
            hotPatchCode,
            setHotPatchCode,
            hotPatchCodeWithParamGetter,
            setHotPatchCodeWithParamGetter
        } = props
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
        const {request, advancedConfigValue, pageId} = requestInfo || {
            request: "",
            advancedConfigValue: {...defaultAdvancedConfigValue}
        }
        const [showSuccess, setShowSuccess] = useState(true)
        const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()
        const [affixSearch, setAffixSearch] = useState<string>("")
        const [defaultResponseSearch, setDefaultResponseSearch] = useState<string>("")
        const [isRefresh, setIsRefresh] = useState<boolean>(false)

        const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)

        const [showExtra, setShowExtra] = useState<boolean>(false) // Response中显示payload和提取内容
        const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)

        // 匹配器和提取器相关
        const [visibleDrawer, setVisibleDrawer] = useState<boolean>(false)
        const [type, setType] = useState<MatchingAndExtraction>("matchers")
        const [matcherAndExtractionHttpResponse, setMatcherAndExtractionHttpResponse] = useState<string>("")
        const [showMatcherAndExtraction, setShowMatcherAndExtraction] = useState<boolean>(false) // Response中显示匹配和提取器
        const [matcherValue, setMatcherValue] = useState<MatcherValueProps>({
            filterMode: advancedConfigValue.filterMode,
            matchersList: advancedConfigValue.matchers || [],
            matchersCondition: advancedConfigValue.matchersCondition,
            hitColor: advancedConfigValue.hitColor || "red"
        })
        const [extractorValue, setExtractorValue] = useState<ExtractorValueProps>({
            extractorList: advancedConfigValue.extractors || []
        })

        const secondNodeRef = useRef(null)
        const secondNodeSize = useSize(secondNodeRef)

        const successTableRef = useRef<any>()
        const requestHttpRef = useRef<string>(request)

        const webFuzzerNewEditorRef = useRef<any>()

        const cachedTotal: number = useCreation(() => {
            return failedCount + successCount
        }, [failedCount, successCount])
        const onlyOneResponse: boolean = useCreation(() => {
            return cachedTotal === 1
        }, [cachedTotal])

        const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
            (s) => ({
                queryPagesDataById: s.queryPagesDataById,
                updatePagesDataCacheById: s.updatePagesDataCacheById
            }),
            shallow
        )
        useImperativeHandle(
            ref,
            () => ({
                validate: onValidateMatcherAndExtraction
            }),
            []
        )

        const responseViewerRef = useRef<MatcherAndExtractionRefProps>({
            validate: () => new Promise(() => {})
        })
        const onValidateMatcherAndExtraction = useMemoizedFn(() => {
            return new Promise((resolve: (val: boolean) => void, reject) => {
                try {
                    if (showMatcherAndExtraction && responseViewerRef.current) {
                        responseViewerRef.current
                            .validate()
                            .then((data: MatcherAndExtractionValueProps) => {
                                onSaveMatcherAndExtractionDrawer(data.matcher, data.extractor)
                            })
                            .finally(() => {
                                resolve(true)
                            })
                    } else {
                        resolve(true)
                    }
                } catch (error) {
                    reject(false)
                    yakitNotify("error", "匹配器和提取器验证失败:" + error)
                }
            })
        })
        useEffect(() => {
            getRemoteValue(HTTP_PACKET_EDITOR_Response_Info)
                .then((data) => {
                    setShowResponseInfoSecondEditor(data === "false" ? false : true)
                })
                .catch(() => {
                    setShowResponseInfoSecondEditor(true)
                })
        }, [])

        useEffect(() => {
            if (!pageId) return
            requestHttpRef.current = request
            setRefreshTrigger(!refreshTrigger)
        }, [pageId, request])

        useUpdateEffect(() => {
            if (successTableRef.current) {
                successTableRef.current.setCurrentSelectItem(undefined)
                successTableRef.current.setFirstFull(true)
            }
            setIsRefresh(!isRefresh)
            setQuery({})
        }, [responseInfoId])

        useUpdateEffect(() => {
            setMatcherValue({
                filterMode: advancedConfigValue.filterMode,
                matchersList: advancedConfigValue.matchers || [],
                matchersCondition: advancedConfigValue.matchersCondition,
                hitColor: advancedConfigValue.hitColor || "red"
            })
            setExtractorValue({
                extractorList: advancedConfigValue.extractors || []
            })
        }, [advancedConfigValue])

        const onSetRequestHttp = useMemoizedFn((i: string) => {
            requestHttpRef.current = i
            onUpdatePageInfo(i, pageId || "")
        })
        const onUpdatePageInfo = useDebounceFn(
            (value: string, pId: string) => {
                if (!pId) return
                const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pId)
                if (!currentItem) return
                if (currentItem.pageParamsInfo.webFuzzerPageInfo) {
                    if (value === currentItem.pageParamsInfo.webFuzzerPageInfo.request) return
                    const newCurrentItem: PageNodeItemProps = {
                        ...currentItem,
                        pageParamsInfo: {
                            webFuzzerPageInfo: {
                                ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                                request: value
                            }
                        }
                    }
                    updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
                }
            },
            {wait: 200, leading: true}
        ).run

        const [firstFull, setFirstFull] = useState<boolean>(false)
        const [secondFull, setSecondFull] = useState<boolean>(false)
        const ResizeBoxProps = useCreation(() => {
            let p = {
                firstRatio: "50%",
                secondRatio: "50%"
            }
            if (secondFull) {
                p.firstRatio = "0%"
            }
            if (firstFull) {
                p.secondRatio = "0%"
                p.firstRatio = "100%"
            }
            return p
        }, [firstFull, secondFull])

        const firstNodeExtra = () => (
            <>
                <YakitButton
                    size='small'
                    type='primary'
                    onClick={() => {
                        hotPatchTrigger()
                    }}
                >
                    热加载
                </YakitButton>
                <div className={styles["resize-card-icon"]} onClick={() => setFirstFull(!firstFull)}>
                    {firstFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                </div>
            </>
        )

        const secondNodeTitle = () => (
            <>
                <span style={{marginRight: 8, fontSize: 12, fontWeight: 500, color: "#31343f"}}>Responses</span>
                <SecondNodeTitle
                    cachedTotal={cachedTotal}
                    onlyOneResponse={onlyOneResponse}
                    rsp={httpResponse}
                    successFuzzerLength={(successFuzzer || []).length}
                    failedFuzzerLength={(failedFuzzer || []).length}
                    showSuccess={showSuccess}
                    setShowSuccess={(v) => {
                        setShowSuccess(v)
                        setQuery({})
                    }}
                />
            </>
        )

        const secondNodeExtra = () => (
            <>
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
                    sendPayloadsType='fuzzerSequence'
                    setShowExtra={setShowExtra}
                    showResponseInfoSecondEditor={showResponseInfoSecondEditor}
                    setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
                />
                <div className={styles["resize-card-icon"]} onClick={() => setSecondFull(!secondFull)}>
                    {secondFull ? <ArrowsRetractIcon /> : <ArrowsExpandIcon />}
                </div>
            </>
        )
        /**调试匹配器和提取器 */
        const onDebug = useMemoizedFn((response: string) => {
            setMatcherAndExtractionHttpResponse(response)
            setVisibleDrawer(true)
        })
        /**关闭匹配器或提取器 */
        const onCloseMatcherAndExtractionDrawer = useMemoizedFn(() => {
            setVisibleDrawer(false)
        })
        /**保存匹配器/提取器数据 */
        const onSaveMatcherAndExtractionDrawer = useMemoizedFn(
            (matcher: MatcherValueProps, extractor: ExtractorValueProps) => {
                if (!pageId) return
                const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
                if (!currentItem) return
                if (
                    currentItem.pageParamsInfo.webFuzzerPageInfo &&
                    currentItem.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue
                ) {
                    const newCurrentItem: PageNodeItemProps = {
                        ...currentItem,
                        pageParamsInfo: {
                            webFuzzerPageInfo: {
                                ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                                advancedConfigValue: {
                                    ...currentItem.pageParamsInfo.webFuzzerPageInfo.advancedConfigValue,
                                    filterMode: matcher.filterMode,
                                    matchers: matcher.matchersList || [],
                                    matchersCondition: matcher.matchersCondition,
                                    hitColor: matcher.hitColor || "red",
                                    extractors: extractor.extractorList || []
                                }
                            }
                        }
                    }
                    updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
                    setMatcherValue({
                        filterMode: matcher.filterMode,
                        matchersList: matcher.matchersList || [],
                        matchersCondition: matcher.matchersCondition,
                        hitColor: matcher.hitColor || "red"
                    })
                    setExtractorValue({
                        extractorList: extractor.extractorList || []
                    })
                }
            }
        )
        const hotPatchTrigger = useMemoizedFn(() => {
            let m = showYakitModal({
                title: null,
                width: "80%",
                footer: null,
                maskClosable: false,
                closable: false,
                style: {top: "10%"},
                content: (
                    <HTTPFuzzerHotPatch
                        initialHotPatchCode={hotPatchCode}
                        initialHotPatchCodeWithParamGetter={hotPatchCodeWithParamGetter}
                        onInsert={(tag) => {
                            if (webFuzzerNewEditorRef.current.reqEditor)
                                monacoEditorWrite(webFuzzerNewEditorRef.current.reqEditor, tag)
                            m.destroy()
                        }}
                        onSaveCode={(code) => {
                            setHotPatchCode(code)
                            setRemoteValue(WEB_FUZZ_HOTPATCH_CODE, code)
                        }}
                        onSaveHotPatchCodeWithParamGetterCode={(code) => {
                            setHotPatchCodeWithParamGetter(code)
                            setRemoteValue(WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE, code)
                        }}
                        onCancel={() => m.destroy()}
                    />
                )
            })
        })
        return (
            <>
                <YakitResizeBox
                    firstMinSize={380}
                    secondMinSize={480}
                    isShowDefaultLineStyle={false}
                    style={{overflow: "hidden"}}
                    lineStyle={{display: firstFull || secondFull ? "none" : ""}}
                    secondNodeStyle={{padding: firstFull ? 0 : undefined, display: firstFull ? "none" : ""}}
                    firstNodeStyle={{padding: secondFull ? 0 : undefined, display: secondFull ? "none" : ""}}
                    {...ResizeBoxProps}
                    firstNode={
                        <WebFuzzerNewEditor
                            ref={webFuzzerNewEditorRef}
                            refreshTrigger={refreshTrigger}
                            request={requestHttpRef.current}
                            setRequest={(i) => onSetRequestHttp(i)}
                            isHttps={advancedConfigValue.isHttps}
                            hotPatchCode={hotPatchCode}
                            hotPatchCodeWithParamGetter={hotPatchCodeWithParamGetter}
                            setHotPatchCode={setHotPatchCode}
                            setHotPatchCodeWithParamGetter={setHotPatchCodeWithParamGetter}
                            firstNodeExtra={firstNodeExtra}
                        />
                    }
                    secondNode={
                        <div ref={secondNodeRef} style={{height: "100%", overflow: "hidden"}}>
                            {onlyOneResponse ? (
                                <ResponseViewer
                                    ref={responseViewerRef}
                                    fuzzerResponse={httpResponse}
                                    defaultResponseSearch={defaultResponseSearch}
                                    webFuzzerValue={httpResponse.ResponseRaw}
                                    showMatcherAndExtraction={showMatcherAndExtraction}
                                    setShowMatcherAndExtraction={setShowMatcherAndExtraction}
                                    matcherValue={matcherValue}
                                    extractorValue={extractorValue}
                                    defActiveKey={""}
                                    defActiveType={type}
                                    onSaveMatcherAndExtraction={onSaveMatcherAndExtractionDrawer}
                                    showExtra={showExtra}
                                    setShowExtra={setShowExtra}
                                    showResponseInfoSecondEditor={showResponseInfoSecondEditor}
                                    setShowResponseInfoSecondEditor={setShowResponseInfoSecondEditor}
                                    secondNodeTitle={secondNodeTitle}
                                    secondNodeExtra={secondNodeExtra}
                                />
                            ) : (
                                <>
                                    <div
                                        className={classNames(styles["resize-card"], styles["resize-card-second"])}
                                        style={{display: firstFull ? "none" : ""}}
                                    >
                                        <div className={classNames(styles["resize-card-heard"])}>
                                            <div className={styles["resize-card-heard-title"]}>{secondNodeTitle()}</div>
                                            <div className={styles["resize-card-heard-extra"]}></div>
                                            {secondNodeExtra()}
                                        </div>
                                        {cachedTotal > 1 ? (
                                            <>
                                                {showSuccess && (
                                                    <HTTPFuzzerPageTable
                                                        ref={successTableRef}
                                                        isRefresh={isRefresh}
                                                        success={showSuccess}
                                                        data={successFuzzer}
                                                        query={query}
                                                        setQuery={setQuery}
                                                        extractedMap={extractedMap}
                                                        isEnd={loading}
                                                        onDebug={onDebug}
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
                                    </div>
                                </>
                            )}
                        </div>
                    }
                />
                <MatcherAndExtractionDrawer
                    visibleDrawer={visibleDrawer}
                    defActiveType={type}
                    httpResponse={matcherAndExtractionHttpResponse}
                    defActiveKey=''
                    matcherValue={matcherValue}
                    extractorValue={extractorValue}
                    onClose={onCloseMatcherAndExtractionDrawer}
                    onSave={onSaveMatcherAndExtractionDrawer}
                />
            </>
        )
    })
)
