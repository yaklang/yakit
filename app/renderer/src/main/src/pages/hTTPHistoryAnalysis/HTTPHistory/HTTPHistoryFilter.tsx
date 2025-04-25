import React, {ReactElement, useEffect, useRef, useState} from "react"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useInViewport,
    useMemoizedFn,
    useSize,
    useUpdateEffect
} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {OutlineLog2Icon, OutlineRefreshIcon, OutlineSearchIcon, OutlineTerminalIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {RemoteHistoryGV} from "@/enums/history"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {
    availableColors,
    CalloutColor,
    ColorSearch,
    ColumnAllInfoItem,
    contentType,
    ExportHTTPFlowStreamRequest,
    getClassNameData,
    getHTTPFlowReqAndResToString,
    HistorySearch,
    HTTPFlow,
    HTTPFlowsFieldGroupResponse,
    ImportExportProgress,
    MultipleSelect,
    onConvertBodySizeByUnit,
    onExpandHTTPFlow,
    onRemoveCalloutColor,
    onSendToTab,
    RangeInputNumberTable,
    SourceType,
    YakQueryHTTPFlowResponse
} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {filterColorTag, isCellRedSingleColor} from "@/components/TableVirtualResize/utils"
import {yakitNotify} from "@/utils/notification"
import {ArrowCircleRightSvgIcon, CheckCircleIcon, ChromeFrameSvgIcon, ColorSwatchIcon} from "@/assets/newIcon"
import {formatTimestamp} from "@/utils/timeUtil"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {openExternalWebsite, saveABSFileToOpen} from "@/utils/openWebsite"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {CheckedSvgIcon} from "@/components/layout/icons"
import {Divider} from "antd"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {HTTPFlowTableFormConfiguration} from "@/components/HTTPFlowTable/HTTPFlowTableForm"
import {WebTree} from "@/components/WebTree/WebTree"
import ReactResizeDetector from "react-resize-detector"
import {HistoryProcess} from "@/components/HTTPHistory"
import {useCampare} from "@/hook/useCompare/useCompare"
import {v4 as uuidv4} from "uuid"
import {isEqual} from "lodash"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {convertKeyboard} from "@/components/yakitUI/YakitEditor/editorUtils"
import {YakitSystem} from "@/yakitGVDefine"
import {randomString} from "@/utils/randomUtil"
import {handleSaveFileSystemDialog} from "@/utils/fileSystemDialog"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {ExportSelect} from "@/components/DataExport/DataExport"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitEditorKeyCode} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {showResponseViaHTTPFlowID} from "@/components/ShowInBrowser"
import {setClipboardText} from "@/utils/clipboard"
import {newWebsocketFuzzerTab} from "@/pages/websocket/WebsocketFuzzer"
import {useHotkeys} from "react-hotkeys-hook"
import {
    generateCSRFPocByRequest,
    generateYakCodeByRequest,
    RequestToYakCodeTemplate
} from "@/pages/invoker/fromPacketToYakCode"
import {useHttpFlowStore} from "@/store/httpFlow"
import emiter from "@/utils/eventBus/eventBus"

import styles from "./HTTPHistoryFilter.module.scss"
const {ipcRenderer} = window.require("electron")

type tabKeys = "web-tree" | "process"
interface TabsItem {
    key: tabKeys
    label: ReactElement | string
    contShow: boolean
}

interface HTTPHistoryFilterProps {
    onSetSelectedHttpFlowIds: (ids: string[]) => void
    onSetIsAllHttpFlow: (b: boolean) => void
    onSetHTTPFlowFilter: (filterStr: string) => void
    downstreamProxy: string
    toWebFuzzer?: boolean
    runtimeId?: string[]
    sourceType?: string
}
export const HTTPHistoryFilter: React.FC<HTTPHistoryFilterProps> = React.memo((props) => {
    const {
        onSetSelectedHttpFlowIds,
        onSetIsAllHttpFlow,
        onSetHTTPFlowFilter,
        downstreamProxy,
        toWebFuzzer,
        runtimeId,
        sourceType
    } = props

    // #region 左侧tab
    const [openTabsFlag, setOpenTabsFlag] = useState<boolean>(false)
    const [curTabKey, setCurTabKey] = useState<tabKeys>("web-tree")
    const [tabsData, setTabsData] = useState<Array<TabsItem>>([
        {
            key: "web-tree",
            label: (
                <>
                    <OutlineLog2Icon /> 网站树
                </>
            ),
            contShow: true // 初始为true
        },
        {
            key: "process",
            label: (
                <>
                    <OutlineTerminalIcon />
                    进程
                </>
            ),
            contShow: false // 初始为false
        }
    ])
    useEffect(() => {
        getRemoteValue(RemoteHistoryGV.HTTPHistoryFilterLeftTabs).then((setting: string) => {
            if (setting) {
                try {
                    const tabs = JSON.parse(setting)
                    setTabsData((prev) => {
                        prev.forEach((i) => {
                            if (i.key === tabs.curTabKey) {
                                i.contShow = tabs.contShow
                            } else {
                                i.contShow = false
                            }
                        })
                        return [...prev]
                    })
                    setCurTabKey(tabs.curTabKey)
                } catch (error) {
                    setTabsData((prev) => {
                        prev.forEach((i) => {
                            if (i.key === "web-tree") {
                                i.contShow = true
                            } else {
                                i.contShow = false
                            }
                        })
                        return [...prev]
                    })
                    setCurTabKey("web-tree")
                }
            }
        })
    }, [])
    const handleTabClick = async (item: TabsItem) => {
        const contShow = !item.contShow
        setTabsData((prev) => {
            prev.forEach((i) => {
                if (i.key === item.key) {
                    i.contShow = contShow
                } else {
                    i.contShow = false
                }
            })
            return [...prev]
        })
        setRemoteValue(
            RemoteHistoryGV.HTTPHistoryFilterLeftTabs,
            JSON.stringify({contShow: contShow, curTabKey: item.key})
        )
        setCurTabKey(item.key)
    }
    useEffect(() => {
        setOpenTabsFlag(tabsData.some((item) => item.contShow))
    }, [tabsData])
    // #endregion

    // #region 网站树、进程
    const [refreshFlag, setRefreshFlag] = useState<boolean>(false)
    const [searchURL, setSearchURL] = useState<string>("")
    const [includeInUrl, setIncludeInUrl] = useState<string>("")
    const [treeQueryparams, setTreeQueryparams] = useState<string>("")
    const [treeWrapHeight, setTreeWrapHeight] = useState<number>(0)

    const [curProcess, setCurProcess] = useState<string[]>([])
    const [processQueryparams, setProcessQueryparams] = useState<string>("")

    // 表格参数改变
    const onQueryParams = useMemoizedFn((queryParams, execFlag) => {
        onSetHTTPFlowFilter(queryParams)
        try {
            const treeQuery = JSON.parse(queryParams) || {}
            delete treeQuery.Pagination
            delete treeQuery.SearchURL
            delete treeQuery.IncludeInUrl
            setTreeQueryparams(JSON.stringify(treeQuery))
            setRefreshFlag(!!execFlag)

            const processQuery = JSON.parse(queryParams) || {}
            delete processQuery.Pagination
            delete processQuery.ProcessName
            setProcessQueryparams(JSON.stringify(processQuery))
        } catch (error) {}
    })
    // #endregion

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "20%",
            secondRatio: "80%"
        }

        if (openTabsFlag) {
            p.firstRatio = "20%"
        } else {
            p.firstRatio = "24px"
        }
        return p
    }, [openTabsFlag])

    return (
        <div className={styles["HTTPHistoryFilter"]}>
            <YakitResizeBox
                isVer={false}
                freeze={openTabsFlag}
                isRecalculateWH={openTabsFlag}
                firstNode={() => (
                    <div className={styles["HTTPHistoryFilter-left"]}>
                        <div className={styles["tab-wrap"]}>
                            <div className={styles["tab"]}>
                                {tabsData.map((item) => (
                                    <div
                                        className={classNames(styles["tab-item"], {
                                            [styles["tab-item-active"]]: curTabKey === item.key,
                                            [styles["tab-item-unshowCont"]]: curTabKey === item.key && !item.contShow
                                        })}
                                        key={item.key}
                                        onClick={() => {
                                            handleTabClick(item)
                                        }}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                            <div
                                className={classNames(styles["tab-cont-item"])}
                                style={{
                                    overflowY: "hidden"
                                }}
                            >
                                <ReactResizeDetector
                                    onResize={(width, height) => {
                                        if (!width || !height) return
                                        setTreeWrapHeight(height)
                                    }}
                                    handleWidth={true}
                                    handleHeight={true}
                                    refreshMode={"debounce"}
                                    refreshRate={50}
                                />
                                <div
                                    className={styles["webTree-wrapper"]}
                                    style={{display: curTabKey === "web-tree" ? "block" : "none"}}
                                >
                                    <WebTree
                                        height={treeWrapHeight - 30}
                                        searchPlaceholder='请输入域名进行搜索，例baidu.com'
                                        treeExtraQueryparams={treeQueryparams}
                                        refreshTreeFlag={refreshFlag}
                                        onGetUrl={(searchURL, includeInUrl) => {
                                            setSearchURL(searchURL)
                                            setIncludeInUrl(includeInUrl)
                                        }}
                                    ></WebTree>
                                </div>
                                <div
                                    className={styles["process-wrapper"]}
                                    style={{display: curTabKey === "process" ? "block" : "none"}}
                                >
                                    <HistoryProcess
                                        queryparamsStr={processQueryparams}
                                        refreshProcessFlag={refreshFlag}
                                        curProcess={curProcess}
                                        onSetCurProcess={setCurProcess}
                                    ></HistoryProcess>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                lineStyle={{display: ""}}
                firstMinSize={openTabsFlag ? "325px" : "24px"}
                secondMinSize={720}
                secondNode={
                    <div className={styles["HTTPHistoryFilter-right"]}>
                        <HTTPFlowFilterTable
                            onQueryParams={onQueryParams}
                            searchURL={searchURL}
                            includeInUrl={includeInUrl}
                            ProcessName={curProcess}
                            onSetSelectedHttpFlowIds={onSetSelectedHttpFlowIds}
                            onSetIsAllHttpFlow={onSetIsAllHttpFlow}
                            downstreamProxy={downstreamProxy}
                            inMouseEnterTable={true}
                            toWebFuzzer={toWebFuzzer}
                            runtimeId={runtimeId}
                            sourceType={sourceType}
                        />
                    </div>
                }
                secondNodeStyle={{
                    padding: undefined,
                    display: ""
                }}
                {...ResizeBoxProps}
            />
        </div>
    )
})
interface HTTPFlowTableProps {
    searchURL?: string
    includeInUrl?: string
    ProcessName?: string[]
    onQueryParams?: (queryParams: string, execFlag: boolean) => void
    onSetSelectedHttpFlowIds?: (ids: string[]) => void
    onSetIsAllHttpFlow?: (b: boolean) => void
    downstreamProxy?: string
    inMouseEnterTable?: boolean
    toWebFuzzer?: boolean
    runtimeId?: string[]
    sourceType?: string
}
const HTTPFlowFilterTable: React.FC<HTTPFlowTableProps> = React.memo((props) => {
    const {
        searchURL,
        includeInUrl,
        ProcessName,
        onQueryParams,
        onSetSelectedHttpFlowIds,
        onSetIsAllHttpFlow,
        downstreamProxy = "",
        inMouseEnterTable = false,
        toWebFuzzer = false,
        runtimeId = [],
        sourceType = "mitm"
    } = props
    const {currentPageTabRouteKey} = usePageInfo(
        (s) => ({
            currentPageTabRouteKey: s.currentPageTabRouteKey
        }),
        shallow
    )
    const hTTPFlowFilterTableRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(hTTPFlowFilterTableRef)
    const size = useSize(hTTPFlowFilterTableRef)
    const [query, setQuery] = useState<YakQueryHTTPFlowRequest>({
        SourceType: sourceType,
        Full: false,
        WithPayload: toWebFuzzer,
        RuntimeIDs: runtimeId.length > 1 ? runtimeId : undefined,
        RuntimeId: runtimeId.length === 1 ? runtimeId[0] : undefined
    })
    const [color, setColor] = useState<string[]>([])
    const [isShowColor, setIsShowColor] = useState<boolean>(false)

    // 表格相关变量
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [loading, setLoading] = useState(false)
    const sorterTableRef = useRef<SortProps>()
    const [data, setData] = useState<HTTPFlow[]>([])
    const [total, setTotal] = useState<number>(0)
    const [pagination, setPagination] = useState({
        Page: 1,
        Limit: 30,
        Order: "desc",
        OrderBy: "Id"
    })

    // #region 网站树、进程
    const campareProcessName = useCampare(ProcessName)
    useDebounceEffect(
        () => {
            setQuery((prev) => {
                return {
                    ...prev,
                    SearchURL: searchURL,
                    IncludeInUrl: includeInUrl ? (Array.isArray(includeInUrl) ? includeInUrl : [includeInUrl]) : [""],
                    ProcessName: ProcessName
                }
            })
        },
        [searchURL, includeInUrl, campareProcessName],
        {wait: 500}
    )
    // #endregion

    // #region 高级筛选
    const [drawerFormVisible, setDrawerFormVisible] = useState<boolean>(false)
    const [filterMode, setFilterMode] = useState<"shield" | "show">("shield")
    const [hostName, setHostName] = useState<string[]>([])
    const [urlPath, setUrlPath] = useState<string[]>([])
    const [fileSuffix, setFileSuffix] = useState<string[]>([])
    const [searchContentType, setSearchContentType] = useState<string>("")
    const [excludeKeywords, setExcludeKeywords] = useState<string[]>([])
    useEffect(() => {
        getDefautAdvancedSearch()
    }, [])
    const getDefautAdvancedSearch = () => {
        // 筛选模式
        getRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisFilterMode).then((e) => {
            if (!!e) {
                setFilterMode(e)
            }
        })
        // HostName
        getRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisHostName).then((e) => {
            if (!!e) {
                let hostName = JSON.parse(e)
                setHostName(hostName)
            }
        })
        // URL路径
        getRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisUrlPath).then((e) => {
            if (!!e) {
                let pathArr = JSON.parse(e)
                setUrlPath(pathArr)
            }
        })
        // 文件后缀
        getRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisFileSuffix).then((e) => {
            if (!!e) {
                let fileSuffix = JSON.parse(e)
                setFileSuffix(fileSuffix)
            }
        })
        // 响应类型
        getRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisContentType).then((e) => {
            if (!!e) {
                const ContentType: string = e
                setSearchContentType(ContentType)
            }
        })
        // 关键字
        getRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisExcludeKeywords).then((e) => {
            if (!!e) {
                let excludeKeywords = JSON.parse(e)
                setExcludeKeywords(excludeKeywords)
            }
        })
    }
    useDebounceEffect(
        () => {
            setQuery((prev) => {
                // 屏蔽
                if (filterMode === "shield") {
                    return {
                        ...prev,
                        SearchContentType: "",
                        ExcludeContentType: searchContentType.length === 0 ? [] : searchContentType.split(","),
                        IncludeInUrl: [],
                        ExcludeInUrl: hostName,
                        IncludePath: [],
                        ExcludePath: urlPath,
                        IncludeSuffix: [],
                        ExcludeSuffix: fileSuffix,
                        ExcludeKeywords: excludeKeywords
                    }
                }
                // 展示
                else {
                    return {
                        ...prev,
                        SearchContentType: searchContentType,
                        ExcludeContentType: [],
                        IncludeInUrl: hostName,
                        ExcludeInUrl: [],
                        IncludePath: urlPath,
                        ExcludePath: [],
                        IncludeSuffix: fileSuffix,
                        ExcludeSuffix: []
                    }
                }
            })
        },
        [filterMode, hostName, urlPath, fileSuffix, searchContentType, excludeKeywords],
        {wait: 500}
    )
    const isFilter: boolean = useCreation(() => {
        return (
            hostName.length > 0 ||
            urlPath.length > 0 ||
            fileSuffix.length > 0 ||
            searchContentType?.length > 0 ||
            excludeKeywords.length > 0
        )
    }, [hostName, urlPath, fileSuffix, searchContentType, excludeKeywords])
    // #endregion

    // #region 表格勾选，表格行选中相关
    const [clickRow, setClickRow] = useState<HTTPFlow>()
    const onRowClick = useMemoizedFn((rowDate?: HTTPFlow) => {
        if (rowDate) {
            setClickRow(rowDate)
        } else {
            setClickRow(undefined)
        }
    })
    const onSetCurrentRow = useDebounceFn(
        (rowDate: HTTPFlow | undefined) => {
            onRowClick(rowDate ? getHTTPFlowReqAndResToString(rowDate) : undefined)
        },
        {wait: 200, leading: true}
    ).run

    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [selectedRows, setSelectedRows] = useState<HTTPFlow[]>([])
    const onSelectAll = useMemoizedFn(() => {
        if (isAllSelect) {
            setIsAllSelect(false)
            setSelectedRowKeys([])
            setSelectedRows([])
        } else {
            setIsAllSelect(true)
            const ids = data.map((item) => item.Id + "")
            setSelectedRowKeys(ids)
            setSelectedRows(data.filter((item) => ids.includes(String(item.Id))))
        }
    })
    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: HTTPFlow) => {
        if (c) {
            const ids = [...selectedRowKeys, rows.Id + ""]
            setSelectedRowKeys(ids)
            setSelectedRows(data.filter((item) => ids.includes(String(item.Id))))
        } else {
            setIsAllSelect(false)
            const ids = selectedRowKeys.filter((ele) => ele !== rows.Id + "")
            setSelectedRowKeys(ids)
            setSelectedRows(data.filter((item) => ids.includes(String(item.Id))))
        }
    })
    const compareSelectedRowKeys = useCampare(selectedRowKeys)
    useDebounceEffect(
        () => {
            onSetSelectedHttpFlowIds && onSetSelectedHttpFlowIds(selectedRowKeys)
            onSetIsAllHttpFlow && onSetIsAllHttpFlow(isAllSelect)
        },
        [isAllSelect, compareSelectedRowKeys],
        {wait: 300}
    )
    const resetSelected = () => {
        setIsAllSelect(false)
        setSelectedRowKeys([])
        setSelectedRows([])
    }
    // #endregion

    // #region 表头上的筛选相关
    /** ---- tags start ----*/
    const [tags, setTags] = useState<FiltersItemProps[]>([])
    const [tagSearchVal, setTagSearchVal] = useState<string>("")
    const [tagsFilter, setTagsFilter] = useState<string[]>([])
    const getHTTPFlowsFieldGroup = useMemoizedFn(
        (RefreshRequest: boolean, callBack?: (tags: FiltersItemProps[]) => void) => {
            ipcRenderer
                .invoke("HTTPFlowsFieldGroup", {
                    RefreshRequest
                })
                .then((rsp: HTTPFlowsFieldGroupResponse) => {
                    const tags = rsp.Tags.filter((item) => (toWebFuzzer ? item.Value === "webfuzzer" : item.Value))
                    const realTags: FiltersItemProps[] = tags.map((ele) => ({label: ele.Value, value: ele.Value}))
                    setTags(realTags)
                    callBack && callBack(realTags)
                })
                .catch((e: any) => {
                    yakitNotify("error", `query HTTP Flows Field Group failed: ${e}`)
                })
        }
    )
    /** ---- tags end ----*/

    /** ---- 响应长度 start ----*/
    const [checkBodyLength, setCheckBodyLength] = useState<boolean>(false)
    const [afterBodyLength, setAfterBodyLength] = useState<number>()
    const [beforeBodyLength, setBeforeBodyLength] = useState<number>()
    const [bodyLengthUnit, setBodyLengthUnit] = useState<"B" | "K" | "M">("B")
    const onCheckThan0 = useDebounceFn(
        useMemoizedFn((check: boolean) => {
            setCheckBodyLength(check)
            setQuery((prev) => {
                if (!afterBodyLength) {
                    return {
                        ...prev,
                        AfterBodyLength: check ? 1 : undefined
                    }
                }
                return {
                    ...prev
                }
            })
        }),
        {wait: 200}
    ).run
    /** ---- 响应长度 end ----*/

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        if (newSort.order === "none") {
            newSort.order = "desc"
        }
        if (newSort.orderBy === "DurationMs") {
            newSort.orderBy = "duration"
        }
        if (newSort.orderBy === "BodyLength") {
            newSort.orderBy = "body_length"
        }
        if (newSort.orderBy === "RequestSizeVerbose") {
            newSort.orderBy = "request_length"
        }
        sorterTableRef.current = newSort

        setQuery((prev) => {
            const newQuery = {
                ...prev,
                ...filter,
                Tags: [...tagsFilter],
                bodyLength: !!(afterBodyLength || beforeBodyLength) // 主要是用来响应长度icon显示颜色
            }

            if (filter["ContentType"]) {
                newQuery.SearchContentType = filter["ContentType"].join(",")
            }

            if (filter["UpdatedAt"]) {
                const time = filter["UpdatedAt"]
                newQuery.AfterUpdatedAt = time[0]
                newQuery.BeforeUpdatedAt = time[1]
            } else {
                newQuery.AfterUpdatedAt = undefined
                newQuery.BeforeUpdatedAt = undefined
            }

            return newQuery
        })
    })
    // #endregion

    // #region 表格自定义相关
    // 需要完全排除列字段，表格不可能出现的列
    const noColumnsKey = toWebFuzzer ? [] : ["Payloads"]
    // 排除展示的列
    const [excludeColumnsKey, setExcludeColumnsKey] = useState<string[]>(noColumnsKey)
    // 默认所有列展示顺序
    const defalutColumnsOrderRef = useRef<string[]>([
        "Method",
        "StatusCode",
        "Url",
        "Payloads",
        "FromPlugin",
        "Tags",
        "IPAddress",
        "BodyLength",
        "HtmlTitle",
        "GetParamsTotal",
        "ContentType",
        "DurationMs",
        "UpdatedAt",
        "RequestSizeVerbose"
    ])
    // 所有列展示顺序
    const [columnsOrder, setColumnsOrder] = useState<string[]>([])
    useEffect(() => {
        if (inViewport) {
            Promise.allSettled([
                getRemoteValue(RemoteHistoryGV.HistroyExcludeColumnsKey),
                getRemoteValue(RemoteHistoryGV.HistroyColumnsOrder)
            ]).then((res) => {
                let refreshTabelKey = false
                if (res[0].status === "fulfilled") {
                    const arr = res[0].value.split(",")
                    const excludeKeys = [...arr, ...noColumnsKey].filter((key) => key)
                    if (!isEqual(excludeKeys, excludeColumnsKey)) {
                        refreshTabelKey = true
                        setExcludeColumnsKey(excludeKeys)
                    }
                }
                if (res[1].status === "fulfilled") {
                    try {
                        const arr = JSON.parse(res[1].value) || []
                        // 确保顺序缓存里面的key一定在默认所有列中存在
                        const realArr = arr.filter((key: string) => defalutColumnsOrderRef.current.includes(key))
                        // toWebFuzzer 跳转过来 需要 特殊处理 Payloads 在Url后面
                        if (toWebFuzzer && realArr.findIndex((key: string) => key === "Payloads") === -1) {
                            const urlIndex = realArr.findIndex((key: string) => key === "Url")
                            realArr.splice(urlIndex + 1, 0, "Payloads")
                        }
                        // 如果列表有新增列，顺序从新再次缓存
                        setRemoteValue(
                            RemoteHistoryGV.HistroyColumnsOrder,
                            JSON.stringify(realArr.filter((key) => key !== "Payloads"))
                        )
                        if (!isEqual(realArr, columnsOrder)) {
                            refreshTabelKey = true
                            setColumnsOrder(realArr)
                        }
                    } catch (error) {}
                }

                if (refreshTabelKey) {
                    setTableKeyNumber(uuidv4())
                }
            })
        }
    }, [inViewport])
    // 表格可配置列
    const configColumnRef = useRef<ColumnAllInfoItem[]>([])
    // 表格的key值
    const [tableKeyNumber, setTableKeyNumber] = useState<string>(uuidv4())
    // 序号是否固定
    const [idFixed, setIdFixed] = useState<boolean>(true)

    const columns: ColumnsTypeProps[] = useCreation<ColumnsTypeProps[]>(() => {
        const columnArr: ColumnsTypeProps[] = [
            {
                title: "序号",
                dataKey: "Id",
                fixed: idFixed ? "left" : undefined,
                ellipsis: false,
                width: 96,
                enableDrag: false,
                sorterProps: {
                    sorter: true
                }
            },
            {
                title: "方法",
                dataKey: "Method",
                width: 80,
                filterProps: {
                    filterKey: "Methods",
                    filtersType: "select",
                    filterMultiple: true,
                    filters: [
                        {
                            label: "GET",
                            value: "GET"
                        },
                        {
                            label: "POST",
                            value: "POST"
                        },
                        {
                            label: "HEAD",
                            value: "HEAD"
                        },
                        {
                            label: "PUT",
                            value: "PUT"
                        },
                        {
                            label: "DELETE",
                            value: "DELETE"
                        }
                    ]
                }
            },
            {
                title: "状态码",
                dataKey: "StatusCode",
                width: 100,
                filterProps: {
                    filterKey: "StatusCode",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />,
                    filterInputProps: {
                        placeholder: "支持输入200,200-204格式，多个用逗号分隔",
                        wrapperStyle: {width: 270},
                        onRegular: (value) => {
                            // 只允许输入数字、逗号和连字符，去掉所有其他字符
                            return value.replace(/[^0-9,-]/g, "")
                        }
                    }
                },
                render: (text, rowData) => {
                    return (
                        <div
                            className={classNames({
                                [styles["status-code"]]: !isCellRedSingleColor(rowData.cellClassName)
                            })}
                        >
                            {text}
                        </div>
                    )
                }
            },
            {
                title: "URL",
                dataKey: "Url",
                width: 400,
                filterProps: {
                    filterKey: "SearchURL",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "Payloads",
                dataKey: "Payloads",
                width: 300,
                filterProps: {
                    filterKey: "PayloadKeyword",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                },
                render: (v) => {
                    return v ? v.join(",") : "-"
                }
            },
            {
                title: "相关插件",
                dataKey: "FromPlugin",
                width: 200,
                filterProps: {
                    filterKey: "FromPlugin",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
                }
            },
            {
                title: "Tags",
                dataKey: "Tags",
                width: 150,
                render: (text) => {
                    return text
                        ? `${text}`
                              .split("|")
                              .filter((i) => !i.startsWith("YAKIT_COLOR_"))
                              .join(", ")
                        : ""
                },
                filterProps: {
                    filterKey: "Tags",
                    filterMultiple: true,
                    filterIcon: (
                        <OutlineSearchIcon
                            className={styles["filter-icon"]}
                            onClick={() => getHTTPFlowsFieldGroup(true)}
                        />
                    ),
                    filterRender: (closePopover: () => void) => {
                        return (
                            <MultipleSelect
                                filterProps={{
                                    filterSearch: true,
                                    filterSearchInputProps: {
                                        prefix: <OutlineSearchIcon className='search-icon' />,
                                        allowClear: true
                                    }
                                }}
                                originalList={tags}
                                searchVal={tagSearchVal}
                                onChangeSearchVal={setTagSearchVal}
                                value={tagsFilter}
                                onSelect={(v) => {
                                    if (Array.isArray(v)) {
                                        setTagsFilter(v)
                                    }
                                }}
                                onClose={() => {
                                    closePopover()
                                }}
                                onQuery={() => {
                                    setTagsFilter([])
                                    setQuery((prev) => {
                                        return {
                                            ...prev,
                                            Tags: []
                                        }
                                    })
                                }}
                                selectContainerStyle={{
                                    maxHeight: "40vh"
                                }}
                            ></MultipleSelect>
                        )
                    }
                }
            },
            {
                title: "IP",
                dataKey: "IPAddress",
                width: 200
            },
            {
                title: "响应长度",
                dataKey: "BodyLength",
                width: 200,
                minWidth: 140,
                sorterProps: {
                    sorter: true
                },
                beforeIconExtra: (
                    <div className={classNames(styles["body-length-checkbox"])}>
                        <YakitCheckbox checked={checkBodyLength} onChange={(e) => onCheckThan0(e.target.checked)} />
                        <span className={styles["tip"]}>大于0</span>
                    </div>
                ),
                filterProps: {
                    filterKey: "bodyLength",
                    filterRender: () => (
                        <RangeInputNumberTable
                            minNumber={afterBodyLength}
                            setMinNumber={setAfterBodyLength}
                            maxNumber={beforeBodyLength}
                            setMaxNumber={setBeforeBodyLength}
                            onReset={() => {
                                setQuery((prev) => {
                                    return {
                                        ...prev,
                                        AfterBodyLength: checkBodyLength ? 1 : undefined,
                                        BeforeBodyLength: undefined
                                    }
                                })
                                setBeforeBodyLength(undefined)
                                setAfterBodyLength(undefined)
                                setBodyLengthUnit("B")
                            }}
                            onSure={() => {
                                setQuery((prev) => {
                                    return {
                                        ...prev,
                                        AfterBodyLength:
                                            checkBodyLength && !afterBodyLength
                                                ? 1
                                                : afterBodyLength
                                                ? onConvertBodySizeByUnit(afterBodyLength, bodyLengthUnit)
                                                : undefined,
                                        BeforeBodyLength: beforeBodyLength
                                            ? onConvertBodySizeByUnit(beforeBodyLength, bodyLengthUnit)
                                            : undefined
                                    }
                                })
                            }}
                            extra={
                                <YakitSelect
                                    value={bodyLengthUnit}
                                    onSelect={setBodyLengthUnit}
                                    wrapperClassName={styles["unit-select"]}
                                    size='small'
                                >
                                    <YakitSelect value='B'>B</YakitSelect>
                                    <YakitSelect value='K'>K</YakitSelect>
                                    <YakitSelect value='M'>M</YakitSelect>
                                </YakitSelect>
                            }
                        />
                    )
                },
                render: (_, rowData) => {
                    return (
                        <>
                            {/* 1M 以上的话，是红色*/}
                            {rowData.BodyLength !== -1 && (
                                <div
                                    className={classNames({
                                        [styles["body-length-text-red"]]:
                                            rowData.BodyLength > 1000000 && !isCellRedSingleColor(rowData.cellClassName)
                                    })}
                                >
                                    {rowData.BodySizeVerbose ? rowData.BodySizeVerbose : rowData.BodyLength}
                                </div>
                            )}
                        </>
                    )
                }
            },
            {
                title: "Title",
                dataKey: "HtmlTitle",
                width: 200
            },
            {
                title: "参数",
                dataKey: "GetParamsTotal",
                width: 100,
                filterProps: {
                    filterKey: "HaveParamsTotal",
                    filtersType: "select",
                    filtersSelectAll: {
                        isAll: true
                    },
                    filters: [
                        {
                            label: "有",
                            value: "true"
                        },
                        {
                            label: "无",
                            value: "false"
                        }
                    ]
                },
                render: (_, rowData) => (
                    <div className={styles["check-circle"]}>
                        {(rowData.GetParamsTotal > 0 || rowData.PostParamsTotal > 0) && (
                            <CheckCircleIcon
                                className={classNames({
                                    [styles["check-circle-icon"]]: !isCellRedSingleColor(rowData.cellClassName)
                                })}
                            />
                        )}
                    </div>
                )
            },
            {
                title: "响应类型",
                dataKey: "ContentType",
                width: 150,
                render: (text) => {
                    let contentTypeFixed =
                        text
                            .split(";")
                            .map((el: any) => el.trim())
                            .filter((i: any) => !i.startsWith("charset"))
                            .join(",") || "-"
                    if (contentTypeFixed.includes("/")) {
                        const contentTypeFixedNew = contentTypeFixed.split("/").pop()
                        if (!!contentTypeFixedNew) {
                            contentTypeFixed = contentTypeFixedNew
                        }
                    }
                    return <div>{contentTypeFixed === "null" ? "" : contentTypeFixed}</div>
                },
                filterProps: {
                    filtersType: "select",
                    filterMultiple: true,
                    filterSearchInputProps: {
                        size: "small"
                    },
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />,
                    filters: contentType
                }
            },
            {
                title: "延迟(ms)",
                dataKey: "DurationMs",
                width: 200,
                sorterProps: {
                    sorter: true
                },
                render: (text, rowData) => {
                    let timeMs: number = parseInt(text)
                    return (
                        <div
                            className={classNames({
                                [styles["duration-ms"]]: !isCellRedSingleColor(rowData.cellClassName)
                            })}
                        >
                            {timeMs}
                        </div>
                    )
                }
            },
            {
                title: "请求时间",
                dataKey: "UpdatedAt",
                filterProps: {
                    filterKey: "UpdatedAt",
                    filtersType: "dateTime"
                },
                width: 200,
                render: (text) => <div title={formatTimestamp(text)}>{text === 0 ? "-" : formatTimestamp(text)}</div>
            },
            {
                title: "请求大小",
                dataKey: "RequestSizeVerbose",
                enableDrag: false,
                width: 200,
                sorterProps: {
                    sorter: true
                }
            },
            {
                title: "操作",
                dataKey: "action",
                width: 80,
                fixed: "right",
                render: (_, rowData) => {
                    if (!rowData.Hash) return <></>
                    return (
                        <div className={styles["action-btn-group"]}>
                            <ChromeFrameSvgIcon
                                className={classNames(styles["icon-hover"], {
                                    [styles["icon-style"]]: !isCellRedSingleColor(rowData.cellClassName)
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    ipcRenderer
                                        .invoke("GetHTTPFlowById", {Id: rowData?.Id})
                                        .then((i: HTTPFlow) => {
                                            i.Url && openExternalWebsite(i.Url)
                                        })
                                        .catch((e: any) => {
                                            yakitNotify("error", `Query HTTPFlow failed: ${e}`)
                                        })
                                }}
                            />
                            <div className={styles["divider-style"]}></div>

                            <ArrowCircleRightSvgIcon
                                className={classNames(styles["icon-hover"], {
                                    [styles["icon-style"]]: !isCellRedSingleColor(rowData.cellClassName)
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    let m = showYakitDrawer({
                                        width: "80%",
                                        content: onExpandHTTPFlow(rowData, () => m.destroy(), downstreamProxy),
                                        bodyStyle: {paddingTop: 5}
                                    })
                                }}
                            />
                        </div>
                    )
                }
            }
        ]
        let finalColumns: ColumnsTypeProps[] = []
        // 排序
        if (columnsOrder.length) {
            // 提取 Id 和 action
            const idColumn = columnArr.find((col) => col.dataKey === "Id")
            const actionColumn = columnArr.find((col) => col.dataKey === "action")
            // 过滤掉 Id 和 action以及不可能出现的列
            const middleColumns = columnArr.filter((item) => !["Id", "action", ...noColumnsKey].includes(item.dataKey))

            // 先按 columnsOrder 排序
            const sortedColumns = middleColumns
                .filter((col) => columnsOrder.includes(col.dataKey))
                .sort((a, b) => columnsOrder.indexOf(a.dataKey) - columnsOrder.indexOf(b.dataKey))

            // 先加上Id
            if (idColumn) finalColumns.push(idColumn)
            sortedColumns.forEach((col) => {
                // 加入当前 columnsOrder 里的字段
                finalColumns.push(col)
            })
            // 最后加上action
            if (actionColumn) finalColumns.push(actionColumn)
        } else {
            finalColumns = columnArr.slice()
        }

        const arr = finalColumns
            .filter((item) => !["Id", "action", ...noColumnsKey].includes(item.dataKey))
            .map((item) => ({
                dataKey: item.dataKey,
                title: item.title,
                isShow: !excludeColumnsKey.includes(item.dataKey)
            }))
        configColumnRef.current = arr

        const realColumns = finalColumns.filter((ele) => !excludeColumnsKey.includes(ele.dataKey))
        setIdFixed(realColumns.length !== 2)
        return realColumns
    }, [
        idFixed,
        columnsOrder,
        JSON.stringify(noColumnsKey),
        excludeColumnsKey,
        tags,
        tagsFilter,
        tagSearchVal,
        query,
        checkBodyLength,
        afterBodyLength,
        beforeBodyLength,
        bodyLengthUnit,
        contentType,
        downstreamProxy
    ])
    // #endregion

    // #region 表格右键操作
    const {compareState, setCompareLeft, setCompareRight} = useHttpFlowStore()
    const menuData = useCreation(() => {
        return [
            {
                key: "发送到 Web Fuzzer",
                label: "发送到 Web Fuzzer",
                number: 10,
                default: true,
                children: [
                    {
                        key: "sendAndJumpToWebFuzzer",
                        label: "发送并跳转",
                        keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.KEY_R]
                    },
                    {
                        key: "sendToWebFuzzer",
                        label: "仅发送",
                        keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.Shift, YakitEditorKeyCode.KEY_R]
                    }
                ],
                onClickBatch: () => {}
            },
            {
                key: "发送到 WS Fuzzer",
                label: "发送到 WS Fuzzer",
                number: 10,
                default: false,
                webSocket: true,
                children: [
                    {
                        key: "sendAndJumpToWS",
                        label: "发送并跳转",
                        keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.KEY_R]
                    },
                    {
                        key: "sendToWS",
                        label: "仅发送",
                        keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.Shift, YakitEditorKeyCode.KEY_R]
                    }
                ],
                onClickBatch: () => {}
            },
            {
                key: "复制 URL",
                label: "复制 URL",
                number: 30,
                default: true,
                webSocket: true,
                onClickSingle: (v) => setClipboardText(v.Url),
                onClickBatch: (v, number) => {
                    if (v.length === 0) {
                        yakitNotify("warning", "请选择数据")
                        return
                    }
                    if (v.length < number) {
                        setClipboardText(v.map((ele) => `${ele.Url}`).join("\r\n"))
                        resetSelected()
                    } else {
                        yakitNotify("warning", `最多同时只能复制${number}条数据`)
                    }
                }
            },
            {
                key: "下载 Response Body",
                label: "下载 Response Body",
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    ipcRenderer.invoke("GetResponseBodyByHTTPFlowID", {Id: v.Id}).then((bytes: {Raw: Uint8Array}) => {
                        saveABSFileToOpen(`response-body.txt`, bytes.Raw)
                    })
                }
            },
            {
                key: "浏览器中打开URL",
                label: "浏览器中打开URL",
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    v.Url && openExternalWebsite(v.Url)
                }
            },
            {
                key: "浏览器中查看响应",
                label: "浏览器中查看响应",
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    showResponseViaHTTPFlowID(v)
                }
            },
            {
                key: "复制为 CSRF Poc",
                label: "复制为 CSRF Poc",
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    const flow = v as HTTPFlow
                    if (!flow) return
                    generateCSRFPocByRequest(flow.Request, flow.IsHTTPS, (e) => {
                        setClipboardText(e)
                    })
                }
            },
            {
                key: "复制为 Yak PoC 模版",
                label: "复制为 Yak PoC 模版",
                default: true,
                webSocket: false,
                children: [
                    {
                        key: "数据包 PoC 模版",
                        label: "数据包 PoC 模版"
                    },
                    {
                        key: "批量检测 PoC 模版",
                        label: "批量检测 PoC 模版"
                    }
                ]
            },
            {
                key: "标注颜色",
                label: "标注颜色",
                default: true,
                webSocket: false,
                number: 20,
                children: availableColors.map((i) => {
                    return {
                        key: i.title,
                        label: i.render
                    }
                }),
                onClickBatch: () => {}
            },
            {
                key: "移除颜色",
                label: "移除颜色",
                default: true,
                webSocket: false,
                number: 20,
                onClickSingle: (v) => onRemoveCalloutColor(v, data, setData),
                onClickBatch: (list, n) => onRemoveCalloutColorBatch(list, n)
            },
            {
                key: "发送到对比器",
                label: "发送到对比器",
                default: true,
                webSocket: false,
                children: [
                    {
                        key: "发送到对比器左侧",
                        label: "发送到对比器左侧",
                        disabled: [false, true, false][compareState]
                    },
                    {
                        key: "发送到对比器右侧",
                        label: "发送到对比器右侧",
                        disabled: [false, false, true][compareState]
                    }
                ]
            },
            {
                key: "导出数据",
                label: "导出数据",
                default: true,
                webSocket: false,
                children: [
                    {
                        key: "导出为Excel",
                        label: "导出为Excel"
                    },
                    {
                        key: "导出为HAR",
                        label: "导出为HAR"
                    }
                ],
                onClickBatch: () => {}
            }
        ]
    }, [data, compareState])

    /** 菜单自定义快捷键渲染处理事件 */
    const systemRef = useRef<YakitSystem>("Darwin")
    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((systemType: YakitSystem) => {
            systemRef.current = systemType
        })
    }, [])
    const contextMenuKeybindingHandle = useMemoizedFn((data) => {
        const menus: any = []
        for (let item of data) {
            /** 处理带快捷键的菜单项 */
            const info = {...item}
            if (info.children && info.children.length > 0) {
                info.children = contextMenuKeybindingHandle(info.children)
            } else {
                if (info.keybindings && info.keybindings.length > 0) {
                    const keysContent = convertKeyboard(systemRef.current, info.keybindings)
                    info.label = keysContent ? (
                        <div className={styles["editor-context-menu-keybind-wrapper"]}>
                            <div className={styles["content-style"]}>{info.label}</div>
                            <div className={classNames(styles["keybind-style"], "keys-style")}>{keysContent}</div>
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
    const getBatchContextMenu = useMemoizedFn(() => {
        return menuData
            .filter((f) => f.onClickBatch)
            .map((m) => {
                return {
                    key: m.key,
                    label: m.label,
                    children: m.children || []
                }
            })
    })
    const getRowContextMenu = useMemoizedFn((rowData: HTTPFlow) => {
        return contextMenuKeybindingHandle(menuData)
            .filter((item) => (rowData.IsWebsocket ? item.webSocket : item.default))
            .map((ele) => {
                return {
                    label: ele.label,
                    key: ele.key,
                    children: ele.children || []
                }
            })
    })
    const onRowContextMenu = useMemoizedFn((rowData: HTTPFlow, _, event: React.MouseEvent) => {
        if (rowData) {
            setClickRow(rowData)
        }

        let rowContextmenu: any[] = []

        // 批量操作
        if (selectedRowKeys.length > 0) {
            rowContextmenu = getBatchContextMenu()
        } else {
            rowContextmenu = getRowContextMenu(rowData)
        }

        showByRightContext(
            {
                width: 180,
                data: rowContextmenu,
                onClick: ({key, keyPath}) => {
                    // 批量操作菜单点击
                    if (selectedRowKeys.length > 0) {
                        onMultipleClick(key, keyPath)
                        return
                    }

                    if (keyPath.includes("标注颜色")) {
                        const colorItem = availableColors.find((e) => e.title === key)
                        if (!colorItem) return
                        CalloutColor(rowData, colorItem, data, setData)
                        return
                    }

                    switch (key) {
                        case "sendAndJumpToWebFuzzer":
                            onSendToTab(rowData, true, downstreamProxy)
                            break
                        case "sendToWebFuzzer":
                            onSendToTab(rowData, false, downstreamProxy)
                            break
                        case "sendAndJumpToWS":
                            newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request)
                            break
                        case "sendToWS":
                            newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request, false)
                            break
                        case "数据包 PoC 模版":
                            onPocMould(rowData)
                            break
                        case "批量检测 PoC 模版":
                            onBatchPocMould(rowData)
                            break
                        case "发送到对比器左侧":
                            setCompareLeft({
                                content: new Buffer(rowData.Request).toString("utf8"),
                                language: "http"
                            })
                            break
                        case "发送到对比器右侧":
                            setCompareRight({
                                content: new Buffer(rowData.Request).toString("utf8"),
                                language: "http"
                            })
                            break
                        case "导出为Excel":
                            onExcelExport([rowData.Id])
                            break
                        case "导出为HAR":
                            onHarExport([rowData.Id])
                            break
                        default:
                            const currentItem = menuData.find((f) => f.key === key)
                            if (!currentItem) return
                            if (currentItem.onClickSingle) currentItem.onClickSingle(rowData)
                            break
                    }
                }
            },
            event.clientX,
            event.clientY
        )
    })

    const onMultipleClick = useMemoizedFn((key: string, keyPath: string[]) => {
        if (keyPath.includes("标注颜色")) {
            const currentItemColor = menuData.find((f) => f.onClickBatch && f.key === "标注颜色")
            const colorItem = availableColors.find((e) => e.title === key)
            if (!currentItemColor || !colorItem) return
            CalloutColorBatch(selectedRows, currentItemColor?.number || 0, colorItem)
            return
        }

        switch (key) {
            case "sendAndJumpToWebFuzzer":
                const currentItemJumpToFuzzer = menuData.find((f) => f.onClickBatch && f.key === "发送到 Web Fuzzer")
                if (!currentItemJumpToFuzzer) return
                onBatch(
                    (el) => onSendToTab(el, true, downstreamProxy),
                    currentItemJumpToFuzzer?.number || 0,
                    selectedRowKeys.length === total
                )
                break
            case "sendToWebFuzzer":
                const currentItemToFuzzer = menuData.find((f) => f.onClickBatch && f.key === "发送到 Web Fuzzer")
                if (!currentItemToFuzzer) return
                onBatch(
                    (el) => onSendToTab(el, false, downstreamProxy),
                    currentItemToFuzzer?.number || 0,
                    selectedRowKeys.length === total
                )
                break
            case "sendAndJumpToWS":
                const currentItemJumpToWS = menuData.find((f) => f.onClickBatch && f.key === "发送到WS Fuzzer")
                if (!currentItemJumpToWS) return
                onBatch(
                    (el) => newWebsocketFuzzerTab(el.IsHTTPS, el.Request),
                    currentItemJumpToWS?.number || 0,
                    selectedRowKeys.length === total
                )

                break
            case "sendToWS":
                const currentItemToWS = menuData.find((f) => f.onClickBatch && f.key === "发送到WS Fuzzer")
                if (!currentItemToWS) return
                onBatch(
                    (el) => newWebsocketFuzzerTab(el.IsHTTPS, el.Request, false),
                    currentItemToWS?.number || 0,
                    selectedRowKeys.length === total
                )
                break
            case "导出为Excel":
                onExcelExport(selectedRowKeys.map((id) => Number(id)))
                break
            case "导出为HAR":
                onHarExport(isAllSelect ? [] : selectedRowKeys.map((id) => Number(id)))
                break
            default:
                const currentItem = menuData.find((f) => f.onClickBatch && f.key === key)
                if (!currentItem) return
                if (currentItem.onClickBatch) currentItem.onClickBatch(selectedRows, currentItem.number)
                break
        }
    })
    const onBatch = useMemoizedFn((f: Function, number: number, all?: boolean) => {
        const length = selectedRowKeys.length
        if (length <= 0) {
            yakitNotify("warning", `请选择数据`)
            return
        }
        if (isAllSelect && !all) {
            yakitNotify("warning", "该批量操作不支持全选")
            return
        }
        if (number < length) {
            yakitNotify("warning", `最多同时只能发送${number}条数据`)
            return
        }
        for (let i = 0; i < length; i++) {
            const element = selectedRows[i]
            f(element)
            if (i === length - 1) {
                resetSelected()
            }
        }
    })

    // 右键菜单 发送到 Web Fuzzer、发送到 WS Fuzzer、快捷键发送
    useHotkeys(
        "ctrl+r",
        (e) => {
            if (clickRow) {
                clickRow.IsWebsocket
                    ? newWebsocketFuzzerTab(clickRow.IsHTTPS, clickRow.Request)
                    : onSendToTab(clickRow, true, downstreamProxy)
            }
        },
        {
            enabled: inViewport
        },
        [hTTPFlowFilterTableRef, clickRow, downstreamProxy]
    )

    useHotkeys(
        "ctrl+shift+r",
        (e) => {
            e.stopPropagation()
            if (clickRow) {
                clickRow.IsWebsocket
                    ? newWebsocketFuzzerTab(clickRow.IsHTTPS, clickRow.Request, false)
                    : onSendToTab(clickRow, false, downstreamProxy)
            }
        },
        {
            enabled: inViewport
        },
        [hTTPFlowFilterTableRef, clickRow, downstreamProxy]
    )

    // 数据包 PoC 模版
    const onPocMould = useMemoizedFn((v: HTTPFlow) => {
        const flow = v
        if (!flow) return
        generateYakCodeByRequest(
            flow.IsHTTPS,
            flow.Request,
            (code) => {
                setClipboardText(code)
            },
            RequestToYakCodeTemplate.Ordinary
        )
    })
    // 批量检测 PoC 模版
    const onBatchPocMould = useMemoizedFn((v: HTTPFlow) => {
        const flow = v as HTTPFlow
        if (!flow) return
        generateYakCodeByRequest(
            flow.IsHTTPS,
            flow.Request,
            (code) => {
                setClipboardText(code)
            },
            RequestToYakCodeTemplate.Batch
        )
    })

    // 标注颜色批量
    const CalloutColorBatch = useMemoizedFn((flowList: HTTPFlow[], number: number, i: any) => {
        if (flowList.length === 0) {
            yakitNotify("warning", "请选择数据")
            return
        }
        if (flowList.length > number) {
            yakitNotify("warning", `最多同时只能操作${number}条数据`)
            return
        }
        const newList = flowList.map((flow) => {
            const existedTags = flow.Tags
                ? flow.Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_"))
                : []
            existedTags.push(`YAKIT_COLOR_${i.color.toUpperCase()}`)
            return {Id: flow.Id, Hash: flow.Hash, Tags: existedTags}
        })
        ipcRenderer
            .invoke("SetTagForHTTPFlow", {
                CheckTags: newList
            })
            .then(() => {
                let newData: HTTPFlow[] = []
                const l = data.length
                for (let index = 0; index < l; index++) {
                    const item = data[index]
                    const find = newList.find((ele) => ele.Hash === item.Hash)
                    if (!!find) {
                        item.Tags = (find.Tags || []).join("|")
                        item.cellClassName = filterColorTag(item.Tags) || undefined
                    }
                    newData.push(item)
                }
                setData(newData)
                resetSelected()
            })
            .catch((error) => {
                yakitNotify("error", "批量标注颜色失败：" + error)
            })
    })

    // 移除颜色 批量
    const onRemoveCalloutColorBatch = useMemoizedFn((flowList: HTTPFlow[], number: number) => {
        if (flowList.length === 0) {
            yakitNotify("warning", "请选择数据")
            return
        }
        if (flowList.length > number) {
            yakitNotify("warning", `最多同时只能操作${number}条数据`)
            return
        }
        const newList = flowList.map((flow) => {
            const existedTags = flow.Tags
                ? flow.Tags.split("|").filter((i) => !!i && !i.startsWith("YAKIT_COLOR_"))
                : []
            return {Id: flow.Id, Hash: flow.Hash, Tags: existedTags}
        })
        ipcRenderer
            .invoke("SetTagForHTTPFlow", {
                CheckTags: newList
            })
            .then(() => {
                let newData: HTTPFlow[] = []
                const l = data.length
                for (let index = 0; index < l; index++) {
                    const item = data[index]
                    const find = newList.find((ele) => ele.Hash === item.Hash)
                    if (!!find) {
                        item.Tags = (find.Tags || []).join("|")
                        item.cellClassName = ""
                    }
                    newData.push(item)
                }
                setData(newData)
                resetSelected()
            })
    })

    // 导出为EXCEL
    const [exportTitle, setExportTitle] = useState<string[]>([])
    const onExcelExport = (list: number[]) => {
        const titleValue = configColumnRef.current.map((item) => item.title)
        const exportValue = [...titleValue, "请求包", "响应包"]
        const m = showYakitModal({
            title: "导出字段",
            content: (
                <ExportSelect
                    exportValue={exportValue}
                    initCheckValue={
                        toWebFuzzer ? exportValue.filter((i) => !["参数", "请求包", "响应包"].includes(i)) : exportValue
                    }
                    setExportTitle={(v: string[]) => setExportTitle(["序号", ...v])}
                    exportKey={toWebFuzzer ? "WEBFUZZER-HISTORY-EXPORT-KEY" : "MITM-HTTP-HISTORY-EXPORT-KEY"}
                    fileName={!toWebFuzzer ? "History" : "WebFuzzer"}
                    getData={(pagination) => getExcelData(pagination, list)}
                    onClose={() => m.destroy()}
                />
            ),
            onCancel: () => {
                m.destroy()
            },
            width: 650,
            footer: null,
            maskClosable: false
        })
    }
    const formatJson = (filterVal, jsonData) => {
        return jsonData.map((v, index) =>
            filterVal.map((j) => {
                if (["Request", "Response"].includes(j)) {
                    return new Buffer(v[j]).toString("utf8")
                }
                if (j === "UpdatedAt") {
                    return formatTimestamp(v[j])
                }
                return v[j]
            })
        )
    }
    const getPageSize = useCreation(() => {
        if (total > 5000) {
            return 500
        } else if (total < 1000) {
            return 100
        } else {
            return Math.round(total / 1000) * 100
        }
    }, [total])
    const getExcelData = useMemoizedFn((pagination, list: number[]) => {
        return new Promise((resolve) => {
            const params: any = {
                ...query,
                OffsetId: undefined,
                Pagination: {...pagination}
            }

            let exportParams: any = {}
            // 这里的key值 不一定和表格的key对应的上
            const arrList = [
                {
                    title: "序号",
                    key: "id"
                },
                {
                    title: "方法",
                    key: "method"
                },
                {
                    title: "状态码",
                    key: "status_code"
                },
                {
                    title: "URL",
                    key: "url"
                },
                {
                    title: "Payloads",
                    key: "payloads"
                },
                {
                    title: "相关插件",
                    key: "from_plugin"
                },
                {
                    title: "Tags",
                    key: "tags"
                },
                {
                    title: "IP",
                    key: "iP_address"
                },
                {
                    title: "响应长度",
                    key: "body_length"
                },
                {
                    title: "Title",
                    key: "response"
                },
                {
                    title: "参数",
                    key: "get_params_total"
                },
                {
                    title: "响应类型",
                    key: "content_type"
                },
                {
                    title: "请求时间",
                    key: "updated_at"
                },
                {
                    title: "请求大小",
                    key: "request"
                },
                {
                    title: "请求包",
                    key: "request"
                },
                {
                    title: "响应包",
                    key: "response"
                }
            ]
            const FieldName = arrList.filter((item) => exportTitle.includes(item.title)).map((item) => item.key)

            const Ids: number[] = list.map((id) => Number(id))
            // 最大请求条数
            let pageSize = getPageSize
            // 需要多少次请求
            let count = Math.ceil((isAllSelect ? total : Ids.length) / pageSize)
            const resultArray: number[] = []
            for (let i = 1; i <= count; i++) {
                resultArray.push(i)
            }
            const promiseList = resultArray.map((item) => {
                params.Pagination.Limit = pageSize
                params.Pagination.Page = item
                exportParams = {ExportWhere: params, FieldName}
                if (!isAllSelect) {
                    exportParams.Ids = Ids
                }
                return new Promise((resolve, reject) => {
                    ipcRenderer
                        .invoke("ExportHTTPFlows", exportParams)
                        .then((rsp: YakQueryHTTPFlowResponse) => {
                            resolve(rsp)
                        })
                        .catch((e) => {
                            reject(e)
                        })
                        .finally(() => {})
                })
            })
            Promise.allSettled(promiseList).then((results) => {
                let rsp: YakQueryHTTPFlowResponse = {
                    Data: [],
                    Pagination: {...pagination, Page: 1, OrderBy: "id", Order: ""},
                    Total: total
                }
                let message: string = ""
                results.forEach((item) => {
                    if (item.status === "fulfilled") {
                        const value = item.value as YakQueryHTTPFlowResponse
                        rsp.Data = [...rsp.Data, ...value.Data]
                    } else {
                        message = item.reason?.message
                    }
                })
                if (message.length > 0) {
                    yakitNotify("warning", `部分导出内容缺失:${message}`)
                }
                initExcelData(resolve, rsp.Data, rsp)
            })
        })
    })
    const initExcelData = (resolve, newExportData: HTTPFlow[], rsp) => {
        let exportData: any = []
        const header: string[] = []
        const filterVal: string[] = []
        exportTitle.map((item) => {
            if (item === "请求包") {
                header.push(item)
                filterVal.push("Request")
            } else if (item === "响应包") {
                header.push(item)
                filterVal.push("Response")
            } else if (item === "序号") {
                header.push(item)
                filterVal.push("Id")
            } else {
                const itemData = configColumnRef.current.filter((itemIn) => itemIn.title === item)[0]
                header.push(item)
                filterVal.push(itemData.dataKey)
            }
        })
        exportData = formatJson(filterVal, newExportData)
        resolve({
            header,
            exportData,
            response: rsp
        })
    }

    // 导出为HAR
    const [exportToken, setExportToken] = useState<string>("")
    const [percentVisible, setPercentVisible] = useState<boolean>(false)
    const percentContainerRef = useRef<string>(currentPageTabRouteKey)
    const onHarExport = (ids: number[]) => {
        handleSaveFileSystemDialog({
            title: "保存文件",
            defaultPath: !toWebFuzzer ? "History" : "WebFuzzer",
            filters: [
                {name: "HAR Files", extensions: ["har"]} // 只允许保存 .har 文件
            ]
        }).then((file) => {
            if (!file.canceled) {
                const filePath = file?.filePath?.toString()
                if (filePath) {
                    const exportParams: ExportHTTPFlowStreamRequest = {
                        Filter: {
                            ...query,
                            IncludeId: ids
                        },
                        ExportType: "har",
                        TargetPath: filePath
                    }

                    const token = randomString(40)
                    setExportToken(token)
                    ipcRenderer
                        .invoke("ExportHTTPFlowStream", exportParams, token)
                        .then(() => {
                            percentContainerRef.current = currentPageTabRouteKey
                            setPercentVisible(true)
                        })
                        .catch((error) => {
                            yakitNotify("error", `[ExportHTTPFlowStream] error: ${error}`)
                        })
                }
            }
        })
    }
    // #endregion

    const queyChangeUpdateData = useDebounceFn(
        () => {
            update(1)
        },
        {wait: 500}
    ).run

    useUpdateEffect(() => {
        queyChangeUpdateData()
    }, [query])

    const update = useMemoizedFn((page: number) => {
        const isInit = page === 1
        if (isInit) {
            setLoading(true)
        }

        const params = {
            ...query,
            Pagination: {
                ...pagination,
                Page: page,
                Order: sorterTableRef.current?.order || "desc",
                OrderBy: sorterTableRef.current?.orderBy || "Id"
            }
        }
        // 以下删除的是前端需要的字段
        delete params["UpdatedAt"]
        delete params["UpdatedAt-time"]
        delete params["ContentType"]

        const copyParams = {...params}
        copyParams.Color = copyParams.Color ? copyParams.Color : []
        copyParams.StatusCode = copyParams.StatusCode ? copyParams.StatusCode : ""
        onQueryParams && onQueryParams(JSON.stringify(copyParams), false)
        ipcRenderer
            .invoke("QueryHTTPFlows", params)
            .then((res: YakQueryHTTPFlowResponse) => {
                const resData = res?.Data || []
                const dataHasClassName: HTTPFlow[] = getClassNameData(resData)
                const d = isInit ? dataHasClassName : data.concat(dataHasClassName)
                setData(d)
                setTotal(res.Total)

                const page = {...res.Pagination}
                delete page["AfterId"]
                delete page["BeforeId"]
                setPagination(page)

                if (isInit) {
                    setIsRefresh((prev) => !prev)
                    resetSelected()
                    setClickRow(undefined)
                } else {
                    if (isAllSelect) {
                        setSelectedRowKeys(d.map((item) => item.Id + ""))
                        setSelectedRows(d)
                    }
                }
            })
            .catch((e) => {
                yakitNotify("error", `查询 http flow 失败: ${e}`)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const onDeleteToUpdateHTTPHistoryFilter = useMemoizedFn(() => {
        update(1)
    })
    useEffect(() => {
        emiter.on("onDeleteToUpdateHTTPHistoryFilter", onDeleteToUpdateHTTPHistoryFilter)
        return () => {
            emiter.off("onDeleteToUpdateHTTPHistoryFilter", onDeleteToUpdateHTTPHistoryFilter)
        }
    }, [])

    return (
        <div className={styles["HTTPFlowFilterTable"]} ref={hTTPFlowFilterTableRef}>
            <TableVirtualResize<HTTPFlow>
                key={tableKeyNumber}
                query={query}
                loading={loading}
                isRefresh={isRefresh}
                isShowTitle={true}
                renderTitle={
                    <div className={styles["http-history-table-title"]}>
                        <div
                            className={classNames(
                                styles["http-history-table-title-space-between"],
                                styles["http-history-table-row"]
                            )}
                        >
                            <div className={classNames(styles["http-history-table-left"])}>
                                {SourceType.map((tag) => (
                                    <YakitCheckableTag
                                        key={tag.value}
                                        checked={!!query.SourceType?.split(",").includes(tag.value)}
                                        onChange={(checked) => {
                                            setQuery((prev) => {
                                                if (checked) {
                                                    const selectTypeList = [
                                                        ...(query.SourceType?.split(",") || []),
                                                        tag.value
                                                    ]
                                                    return {
                                                        ...prev,
                                                        SourceType: selectTypeList.join(",")
                                                    }
                                                } else {
                                                    const selectTypeList = (query.SourceType?.split(",") || []).filter(
                                                        (ele) => ele !== tag.value
                                                    )
                                                    return {
                                                        ...prev,
                                                        SourceType: selectTypeList.join(",")
                                                    }
                                                }
                                            })
                                        }}
                                    >
                                        {tag.text}
                                    </YakitCheckableTag>
                                ))}
                                <TableTotalAndSelectNumber
                                    total={total}
                                    selectNum={isAllSelect ? total : selectedRowKeys.length}
                                />
                            </div>
                            <div className={styles["http-history-table-right"]}>
                                <YakitButton
                                    type='text'
                                    onClick={() => {
                                        setDrawerFormVisible(true)
                                    }}
                                    style={{padding: 0}}
                                >
                                    高级筛选
                                </YakitButton>
                                {isFilter && (
                                    <YakitTag color={"success"} style={{margin: 0}}>
                                        已配置
                                        <CheckedSvgIcon />
                                    </YakitTag>
                                )}
                                <Divider type='vertical' style={{margin: 0, top: 1}} />
                                <div className={classNames(styles["http-history-table-right-item"])}>
                                    {size?.width && size?.width > 800 && (
                                        <div className={styles["http-history-table-right-label"]}>协议类型</div>
                                    )}
                                    <YakitSelect
                                        size='small'
                                        value={query?.IsWebsocket || ""}
                                        wrapperStyle={{width: 150}}
                                        onSelect={(val) => {
                                            setQuery((prev) => {
                                                return {
                                                    ...prev,
                                                    IsWebsocket: val
                                                }
                                            })
                                        }}
                                    >
                                        <YakitSelect.Option value=''>全部</YakitSelect.Option>
                                        <YakitSelect.Option value='http/https'>http/https</YakitSelect.Option>
                                        <YakitSelect.Option value='websocket'>websocket</YakitSelect.Option>
                                    </YakitSelect>
                                </div>
                                <HistorySearch
                                    showPopoverSearch={size?.width ? size?.width <= 1200 : true}
                                    handleSearch={useMemoizedFn((searchValue, searchType) => {
                                        setQuery((prev) => {
                                            return {
                                                ...prev,
                                                Keyword: searchValue,
                                                KeywordType: searchType
                                            }
                                        })
                                    })}
                                />
                                <div className={styles["http-history-table-color-swatch"]}>
                                    <YakitPopover
                                        overlayClassName={styles["http-history-table-color-popover"]}
                                        content={
                                            <ColorSearch
                                                color={color}
                                                setColor={setColor}
                                                onReset={() => setColor([])}
                                                onSure={useMemoizedFn(() => {
                                                    if (isShowColor) {
                                                        setIsShowColor(false)
                                                    }
                                                    setQuery((prev) => {
                                                        return {
                                                            ...prev,
                                                            Color: color
                                                        }
                                                    })
                                                })}
                                                setIsShowColor={setIsShowColor}
                                            />
                                        }
                                        trigger='click'
                                        placement='bottomLeft'
                                        visible={isShowColor}
                                        onVisibleChange={(visible) => {
                                            if (!visible) setIsShowColor(false)
                                        }}
                                    >
                                        <YakitButton
                                            type='outline2'
                                            isHover={isShowColor || !!color.length}
                                            style={{padding: 4}}
                                            onClick={() => setIsShowColor(true)}
                                        >
                                            <ColorSwatchIcon />
                                        </YakitButton>
                                    </YakitPopover>
                                </div>
                                <YakitButton
                                    type='text2'
                                    icon={<OutlineRefreshIcon />}
                                    onClick={() => {
                                        update(1)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                }
                renderKey='Id'
                data={data}
                pagination={{
                    total: total,
                    limit: pagination.Limit,
                    page: pagination.Page,
                    onChange: (page) => update(page)
                }}
                rowSelection={{
                    isAll: isAllSelect,
                    type: "checkbox",
                    selectedRowKeys,
                    onSelectAll: onSelectAll,
                    onChangeCheckboxSingle: onSelectChange
                }}
                columns={columns}
                enableDrag
                useUpAndDown
                inMouseEnterTable={inMouseEnterTable}
                onChange={onTableChange}
                onRowContextMenu={onRowContextMenu}
                onSetCurrentRow={onSetCurrentRow}
            />
            {/* 高级筛选抽屉 */}
            {drawerFormVisible && (
                <HTTPFlowTableFormConfiguration
                    pageType='HTTPHistoryFilter'
                    responseType={contentType}
                    visible={drawerFormVisible}
                    setVisible={setDrawerFormVisible}
                    onSave={(filters) => {
                        const {filterMode, hostName, urlPath, fileSuffix, searchContentType, excludeKeywords} = filters
                        setFilterMode(filterMode)
                        setHostName(hostName)
                        setUrlPath(urlPath)
                        setFileSuffix(fileSuffix)
                        setSearchContentType(searchContentType)
                        setExcludeKeywords(excludeKeywords)
                        setDrawerFormVisible(false)
                    }}
                    filterMode={filterMode}
                    hostName={hostName}
                    urlPath={urlPath}
                    fileSuffix={fileSuffix}
                    searchContentType={searchContentType}
                    excludeKeywords={excludeKeywords}
                />
            )}
            {/* 导出HAR数据 */}
            {percentVisible && (
                <ImportExportProgress
                    getContainer={
                        document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
                    }
                    visible={percentVisible}
                    title='导出HAR流量数据'
                    token={exportToken}
                    apiKey='ExportHTTPFlowStream'
                    onClose={(finish) => {
                        setPercentVisible(false)
                        if (finish) {
                            yakitNotify("success", "导出成功")
                        }
                    }}
                />
            )}
        </div>
    )
})
