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
import {
    OutlineChevrondownIcon,
    OutlineCogIcon,
    OutlineLog2Icon,
    OutlineRefreshIcon,
    OutlineReplyIcon,
    OutlineSearchIcon,
    OutlineSelectorIcon,
    OutlineTerminalIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import {RemoteHistoryGV} from "@/enums/history"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {
    AdvancedSet,
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
    RangeInputNumberTableWrapper,
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
import {minWinSendToChildWin, openExternalWebsite, openPacketNewWindow, saveABSFileToOpen} from "@/utils/openWebsite"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
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
import {randomString} from "@/utils/randomUtil"
import {handleSaveFileSystemDialog} from "@/utils/fileSystemDialog"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {ExportSelect} from "@/components/DataExport/DataExport"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {showResponseViaHTTPFlowID} from "@/components/ShowInBrowser"
import {setClipboardText} from "@/utils/clipboard"
import {newWebsocketFuzzerTab} from "@/pages/websocket/WebsocketFuzzer"
import {
    generateCSRFPocByRequest,
    generateYakCodeByRequest,
    RequestToYakCodeTemplate
} from "@/pages/invoker/fromPacketToYakCode"
import {useHttpFlowStore} from "@/store/httpFlow"
import emiter from "@/utils/eventBus/eventBus"
import {HTTPFlowDetailProp} from "@/components/HTTPFlowDetail"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"
import {convertKeyboardToUIKey} from "@/utils/globalShortcutKey/utils"
import {
    getGlobalShortcutKeyEvents,
    GlobalShortcutKey,
    ShortcutKeyFocusType
} from "@/utils/globalShortcutKey/events/global"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

import styles from "./HTTPHistoryFilter.module.scss"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {YakitRoute} from "@/enums/yakitRoute"
const {ipcRenderer} = window.require("electron")

type tabKeys = "web-tree" | "process"
interface TabsItem {
    key: tabKeys
    label: (t: (keys: string) => string) => ReactElement | string
    contShow: boolean
}

interface HTTPHistoryFilterProps {
    onSetClickedHttpFlow: (flow?: HTTPFlow) => void
    onSetFirstHttpFlow: (flow?: HTTPFlow) => void
    onSetSelectedHttpFlowIds: (ids: string[]) => void
    onSetHTTPFlowFilter: (filterStr: string) => void
    refreshHttpTable?: boolean
    isResetSelect?: boolean
    onSetIsResetSelect?: React.Dispatch<React.SetStateAction<boolean>>
    downstreamProxy: string
    toWebFuzzer?: boolean
    runtimeId?: string[]
    sourceType?: string
    webFuzzerPageId?: string
    /** 来自httpFuzzerPage */
    closable?: boolean
}
export const HTTPHistoryFilter: React.FC<HTTPHistoryFilterProps> = React.memo((props) => {
    const {
        onSetClickedHttpFlow,
        onSetFirstHttpFlow,
        onSetSelectedHttpFlowIds,
        onSetHTTPFlowFilter,
        refreshHttpTable,
        isResetSelect,
        onSetIsResetSelect,
        downstreamProxy,
        toWebFuzzer,
        runtimeId,
        sourceType,
        webFuzzerPageId,
        closable
    } = props
    const {t, i18n} = useI18nNamespaces(["history"])
    // #region 左侧tab
    const [openTabsFlag, setOpenTabsFlag] = useState<boolean>(false)
    const [curTabKey, setCurTabKey] = useState<tabKeys>("web-tree")
    const [tabsData, setTabsData] = useState<Array<TabsItem>>([
        {
            key: "web-tree",
            label: (t) => (
                <>
                    <span className={styles["tab-item-text"]}>{t("HTTPHistory.websiteTree")}</span> <OutlineLog2Icon />
                </>
            ),
            contShow: true // 初始为true
        },
        {
            key: "process",
            label: (t) => (
                <>
                    <span className={styles["tab-item-text"]}>{t("HTTPHistory.process")}</span>
                    <OutlineTerminalIcon />
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
                            if (toWebFuzzer) {
                                i.contShow = false
                            } else {
                                if (i.key === tabs.curTabKey) {
                                    i.contShow = tabs.contShow
                                } else {
                                    i.contShow = false
                                }
                            }
                        })
                        return [...prev]
                    })
                    setCurTabKey(tabs.curTabKey)
                    setRemoteValue(
                        RemoteHistoryGV.HTTPHistoryFilterLeftTabs,
                        JSON.stringify({contShow: toWebFuzzer ? false : tabs.contShow, curTabKey: tabs.curTabKey})
                    )
                } catch (error) {
                    setTabsData((prev) => {
                        prev.forEach((i) => {
                            if (toWebFuzzer) {
                                i.contShow = false
                            } else {
                                if (i.key === "web-tree") {
                                    i.contShow = true
                                } else {
                                    i.contShow = false
                                }
                            }
                        })
                        return [...prev]
                    })
                    setCurTabKey("web-tree")
                    setRemoteValue(
                        RemoteHistoryGV.HTTPHistoryFilterLeftTabs,
                        JSON.stringify({contShow: toWebFuzzer ? false : true, curTabKey: "web-tree"})
                    )
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
                firstNode={
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
                                        {item.label(t)}
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
                                        searchPlaceholder={t("HTTPHistory.pleaseEnterDomainToSearch")}
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
                }
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
                            onSetClickedHttpFlow={onSetClickedHttpFlow}
                            onSetFirstHttpFlow={onSetFirstHttpFlow}
                            refresh={refreshHttpTable}
                            isResetSelect={isResetSelect}
                            onSetIsResetSelect={onSetIsResetSelect}
                            downstreamProxy={downstreamProxy}
                            inMouseEnterTable={true}
                            toWebFuzzer={toWebFuzzer}
                            runtimeId={runtimeId}
                            sourceType={sourceType}
                            webFuzzerPageId={webFuzzerPageId}
                            closable={closable}
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

export const defalutColumnsOrder = [
    "Method",
    "StatusCode",
    "Url",
    "Host",
    "Path",
    "Payloads", // 此字段特殊不参与表格列自定义
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
]
interface HTTPFlowTableProps {
    searchURL?: string
    includeInUrl?: string
    ProcessName?: string[]
    onQueryParams?: (queryParams: string, execFlag: boolean) => void
    onSetSelectedHttpFlowIds?: (ids: string[]) => void
    onSetClickedHttpFlow?: (flow?: HTTPFlow) => void
    onSetFirstHttpFlow?: (flow?: HTTPFlow) => void
    refresh?: boolean
    isResetSelect?: boolean
    onSetIsResetSelect?: React.Dispatch<React.SetStateAction<boolean>>
    downstreamProxy?: string
    inMouseEnterTable?: boolean
    toWebFuzzer?: boolean
    runtimeId?: string[]
    sourceType?: string
    webFuzzerPageId?: string
    closable?: boolean
}
const HTTPFlowFilterTable: React.FC<HTTPFlowTableProps> = React.memo((props) => {
    const {
        searchURL,
        includeInUrl,
        ProcessName,
        onQueryParams,
        onSetSelectedHttpFlowIds,
        onSetClickedHttpFlow,
        onSetFirstHttpFlow,
        refresh,
        isResetSelect = true,
        onSetIsResetSelect,
        downstreamProxy = "",
        inMouseEnterTable = false,
        toWebFuzzer = false,
        runtimeId = [],
        sourceType = "mitm",
        webFuzzerPageId,
        closable = true
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "history", "yakitRoute"])
    const {currentPageTabRouteKey, queryPagesDataById} = usePageInfo(
        (s) => ({
            currentPageTabRouteKey: s.currentPageTabRouteKey,
            queryPagesDataById: s.queryPagesDataById
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
    const [isReset, setIsReset] = useState<boolean>(false)
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
    const [statusCode, setStatusCode] = useState<string>("")
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
        // 状态码
        getRemoteValue(RemoteHistoryGV.HTTPFlowTableAnalysisStatusCode).then((e) => {
            if (!!e) {
                const statusCode: string = e
                setStatusCode(statusCode)
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
                        ExcludeKeywords: excludeKeywords,
                        ExcludeStatusCode: statusCode
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
                        ExcludeSuffix: [],
                        ExcludeKeywords: [],
                        ExcludeStatusCode: ""
                    }
                }
            })
        },
        [filterMode, hostName, urlPath, fileSuffix, searchContentType, excludeKeywords, statusCode],
        {wait: 500}
    )
    const isFilter: boolean = useCreation(() => {
        return (
            hostName.length > 0 ||
            urlPath.length > 0 ||
            fileSuffix.length > 0 ||
            searchContentType?.length > 0 ||
            excludeKeywords.length > 0 ||
            statusCode?.length > 0
        )
    }, [hostName, urlPath, fileSuffix, searchContentType, excludeKeywords, statusCode])
    // #endregion

    // #region 表格勾选，表格行选中相关
    const [clickRow, setClickRow] = useState<HTTPFlow>()
    const onRowClick = useMemoizedFn((rowDate?: HTTPFlow) => {
        if (rowDate) {
            minWinSendToChildWin({
                type: "openPacketNewWindow",
                data: getPacketNewWindow(rowDate)
            })
        }
        setClickRow(rowDate)
        onSetClickedHttpFlow && onSetClickedHttpFlow(rowDate)
    })
    const onSetCurrentRow = useDebounceFn(
        (rowDate: HTTPFlow | undefined) => {
            onRowClick(rowDate ? getHTTPFlowReqAndResToString(rowDate) : undefined)
        },
        {wait: 200, leading: true}
    ).run

    const getPacketNewWindow = useMemoizedFn((r) => {
        return {
            showParentPacketCom: {
                components: "HTTPFlowDetailMini",
                props: {
                    noHeader: true,
                    id: r?.Id || 0,
                    sendToWebFuzzer: true,
                    selectedFlow: getHTTPFlowReqAndResToString(r),
                    downstreamProxyStr: downstreamProxy,
                    showEditTag: false,
                    showJumpTree: false
                } as HTTPFlowDetailProp
            }
        }
    })
    const onHTTPFlowFilterTableRowDoubleClick = useMemoizedFn((r) => {
        openPacketNewWindow(getPacketNewWindow(r))
    })

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
            onSetSelectedHttpFlowIds && onSetSelectedHttpFlowIds(isAllSelect ? [] : selectedRowKeys)
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
    const [bodyLengthSort, setBodyLengthSort, getBodyLengthSort] = useGetSetState<"asc" | "desc" | false>(false)
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
    const onBodyLengthSort = useMemoizedFn((sort) => {
        const newSort = bodyLengthSort === sort ? false : sort
        if (newSort) {
            setIsReset((prev) => !prev)
        }
        setBodyLengthSort(newSort)
        sorterTableRef.current = {
            orderBy: newSort ? "body_length" : "Id",
            order: newSort || "desc"
        }
        queyChangeUpdateData()
    })
    /** ---- 响应长度 end ----*/

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        if (!getBodyLengthSort() || newSort.orderBy !== "") {
            if (newSort.order === "none") {
                newSort.order = "desc"
            }
            if (newSort.orderBy === "DurationMs") {
                newSort.orderBy = "duration"
            }
            if (newSort.orderBy === "RequestSizeVerbose") {
                newSort.orderBy = "request_length"
            }
            sorterTableRef.current = newSort
            setBodyLengthSort(false)
        }
        setQuery((prev) => {
            const newQuery = {
                ...prev,
                ...filter,
                Tags: [...tagsFilter],
                bodyLength: !!(afterBodyLength || beforeBodyLength || getBodyLengthSort() || checkBodyLength) // 主要是用来响应长度icon显示颜色
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

    // #region 表格自定义相关（excludeCustomColumnsKey这个变量暂时勿动，没有做其他列兼容）
    // 需要完全排除列字段，表格不可能出现的列
    const noColumnsKey = toWebFuzzer ? [] : ["Payloads"]
    // 不需要参与自定义的列（也就是不需要存进缓存）
    const excludeCustomColumnsKey: string[] = ["Payloads"]
    const specialCustoms = useMemoizedFn((key) => {
        return excludeCustomColumnsKey.includes(key) || noColumnsKey.includes(key)
    })
    // 排除展示的列（包含noColumnsKey）
    const [excludeColumnsKey, setExcludeColumnsKey] = useState<string[]>(noColumnsKey)
    // 默认所有列展示顺序
    const defalutColumnsOrderRef = useRef<string[]>(defalutColumnsOrder.filter((key) => !noColumnsKey.includes(key)))
    // 所有列展示顺序（不包含excludeCustomColumnsKey）
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
                    // 确保顺序缓存里面的key一定在默认所有列中存在
                    const realArr = excludeKeys.filter((key: string) => defalutColumnsOrderRef.current.includes(key))
                    if (!isEqual(realArr, excludeColumnsKey)) {
                        refreshTabelKey = true
                        setExcludeColumnsKey(realArr)
                    }
                    setRemoteValue(
                        RemoteHistoryGV.HistroyExcludeColumnsKey,
                        realArr.filter((key) => !specialCustoms(key)) + ""
                    )
                }
                if (res[1].status === "fulfilled") {
                    try {
                        const arr = JSON.parse(res[1].value) || []
                        // 确保顺序缓存里面的key一定在默认所有列中存在
                        const arr2 = arr.filter((key: string) => defalutColumnsOrderRef.current.includes(key))
                        // 按照 defalutColumnsOrderRef.current 顺序补充新增列
                        defalutColumnsOrderRef.current.forEach((key: string, idx: number) => {
                            if (!arr2.includes(key)) {
                                let insertIdx = arr2.findIndex((k) => defalutColumnsOrderRef.current.indexOf(k) > idx)
                                if (insertIdx === -1) {
                                    arr2.push(key)
                                } else {
                                    arr2.splice(insertIdx, 0, key)
                                }
                            }
                        })
                        // 特殊处理 Payloads 在Path后面
                        if (toWebFuzzer) {
                            if (arr2.findIndex((key: string) => key === "Payloads") === -1) {
                                const pathIndex = arr2.findIndex((key: string) => key === "Path")
                                arr2.splice(pathIndex + 1, 0, "Payloads")
                            }
                        }
                        const realArr = arr2.filter((key) => !specialCustoms(key))
                        setRemoteValue(RemoteHistoryGV.HistroyColumnsOrder, JSON.stringify(realArr))
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
        // ⚠️ 注意：此处新增或删除列请务必同步 history页面，还有处理 defalutColumnsOrder 变量，这个变量是存的全部的列默认顺序key
        const columnArr: ColumnsTypeProps[] = [
            {
                title: t("YakitTable.order"),
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
                title: t("HTTPFlowTable.method"),
                dataKey: "Method",
                width: 100,
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
                        },
                        {
                            label: "PATCH",
                            value: "PATCH"
                        }
                    ]
                }
            },
            {
                title: t("HTTPFlowTable.statusCode"),
                dataKey: "StatusCode",
                width: 120,
                filterProps: {
                    filterKey: "StatusCode",
                    filtersType: "input",
                    filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />,
                    filterInputProps: {
                        placeholder: t("YakitInput.supportInputFormat"),
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
                title: "Host",
                dataKey: "Host",
                width: 200
            },
            {
                title: "Path",
                dataKey: "Path",
                width: 400
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
                title: t("HTTPFlowTable.fromPlugin"),
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
                title: t("HTTPFlowTable.bodyLength"),
                dataKey: "BodyLength",
                width: 130,
                filterProps: {
                    filterKey: "bodyLength",
                    filterIcon: <OutlineSelectorIcon className={styles["filter-icon"]} />,
                    filterRender: (closePopover: () => void) => (
                        <RangeInputNumberTableWrapper
                            showSort={true}
                            bodyLengthSort={getBodyLengthSort()}
                            onBodyLengthSort={onBodyLengthSort}
                            checkBodyLength={checkBodyLength}
                            onCheckThan0={onCheckThan0}
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
                                setTimeout(() => {
                                    closePopover()
                                }, 50)
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
                                setTimeout(() => {
                                    closePopover()
                                }, 50)
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
                title: t("HTTPFlowTable.params"),
                dataKey: "GetParamsTotal",
                width: 130,
                filterProps: {
                    filterKey: "HaveParamsTotal",
                    filtersType: "select",
                    filtersSelectAll: {
                        isAll: true
                    },
                    filters: [
                        {
                            label: t("HTTPFlowTable.have"),
                            value: "true"
                        },
                        {
                            label: t("HTTPFlowTable.none"),
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
                title: t("HTTPFlowTable.contentType"),
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
                title: t("HTTPFlowTable.durationMs"),
                dataKey: "DurationMs",
                width: 120,
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
                title: t("HTTPFlowTable.updatedAt"),
                dataKey: "UpdatedAt",
                filterProps: {
                    filterKey: "UpdatedAt",
                    filtersType: "dateTime"
                },
                width: 200,
                render: (text) => <div title={formatTimestamp(text)}>{text === 0 ? "-" : formatTimestamp(text)}</div>
            },
            {
                title: t("HTTPFlowTable.requestSizeVerbose"),
                dataKey: "RequestSizeVerbose",
                enableDrag: false,
                width: 120,
                sorterProps: {
                    sorter: true
                }
            },
            {
                title: t("YakitTable.action"),
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
                                        content: onExpandHTTPFlow(rowData, () => m.destroy(), downstreamProxy, t),
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

            // 特殊处理一下 Payloads 位置
            const realColumnsOrder = columnsOrder.slice()
            if (toWebFuzzer) {
                const pathIndex = columnsOrder.findIndex((key: string) => key === "Path")
                realColumnsOrder.splice(pathIndex + 1, 0, "Payloads")
            }

            // 先按 columnsOrder 排序
            const sortedColumns = middleColumns.sort(
                (a, b) => realColumnsOrder.indexOf(a.dataKey) - realColumnsOrder.indexOf(b.dataKey)
            )

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
        toWebFuzzer,
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
        downstreamProxy,
        i18n.language
    ])
    // #endregion

    // #region 表格列 设置
    const [advancedSetVisible, setAdvancedSetVisible] = useState<boolean>(false)
    const isAdvancedSet = useCreation(() => {
        const realDefalutColumnsOrder = defalutColumnsOrderRef.current.filter((key) => !specialCustoms(key))
        const orderFlag1 =
            columnsOrder.length === 0 ? false : JSON.stringify(realDefalutColumnsOrder) !== JSON.stringify(columnsOrder)
        const orderFlag2 = !!excludeColumnsKey.filter((key) => !specialCustoms(key)).length
        return orderFlag1 || orderFlag2
    }, [excludeColumnsKey, noColumnsKey, columnsOrder])
    // #endregion

    // #region 表格右键操作
    const {compareState, setCompareLeft, setCompareRight} = useHttpFlowStore()
    const menuData = useCreation(() => {
        return [
            {
                key: "发送到 Web Fuzzer",
                label: t("HTTPFlowTable.RowContextMenu.sendToWebFuzzer"),
                number: 10,
                default: true,
                children: [
                    {
                        key: "sendAndJumpToWebFuzzer",
                        label: t("HTTPFlowTable.RowContextMenu.sendAndRedirect"),
                        keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendAndJumpToWebFuzzer].keys
                    },
                    {
                        key: "sendToWebFuzzer",
                        label: t("HTTPFlowTable.RowContextMenu.sendOnly"),
                        keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendToWebFuzzer].keys
                    }
                ],
                onClickBatch: () => {}
            },
            {
                key: "发送到 WS Fuzzer",
                label: t("HTTPFlowTable.RowContextMenu.sendToWSFuzzer"),
                number: 10,
                default: false,
                webSocket: true,
                children: [
                    {
                        key: "sendAndJumpToWS",
                        label: t("HTTPFlowTable.RowContextMenu.sendAndRedirect"),
                        keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendAndJumpToWebFuzzer].keys
                    },
                    {
                        key: "sendToWS",
                        label: t("HTTPFlowTable.RowContextMenu.sendOnly"),
                        keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendToWebFuzzer].keys
                    }
                ],
                onClickBatch: () => {}
            },
            {
                key: "复制 URL",
                label: t("HTTPFlowTable.RowContextMenu.copyURL"),
                number: 30,
                default: true,
                webSocket: true,
                onClickSingle: (v) => setClipboardText(v.Url),
                onClickBatch: (v, number) => {
                    if (v.length === 0) {
                        yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
                        return
                    }
                    if (v.length < number) {
                        setClipboardText(v.map((ele) => `${ele.Url}`).join("\r\n"))
                        resetSelected()
                    } else {
                        yakitNotify("warning", t("HTTPFlowTable.copyLimit", {number}))
                    }
                }
            },
            {
                key: "下载 Response Body",
                label: t("HTTPFlowTable.RowContextMenu.downloadResponseBody"),
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
                label: t("HTTPFlowTable.RowContextMenu.openURLInBrowser"),
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    v.Url && openExternalWebsite(v.Url)
                }
            },
            {
                key: "浏览器中查看响应",
                label: t("HTTPFlowTable.RowContextMenu.viewResponseInBrowser"),
                default: true,
                webSocket: false,
                onClickSingle: (v) => {
                    showResponseViaHTTPFlowID(v)
                }
            },
            {
                key: "复制为 CSRF Poc",
                label: t("HTTPFlowTable.RowContextMenu.copyAsCSRFPoc"),
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
                label: t("HTTPFlowTable.RowContextMenu.copyAsYakPoCTemplate"),
                default: true,
                webSocket: false,
                children: [
                    {
                        key: "数据包 PoC 模版",
                        label: t("HTTPFlowTable.RowContextMenu.packetPoCTemplate")
                    },
                    {
                        key: "批量检测 PoC 模版",
                        label: t("HTTPFlowTable.RowContextMenu.batchTestPoCTemplate")
                    }
                ]
            },
            {
                key: "标注颜色",
                label: t("HTTPFlowTable.RowContextMenu.tagColor"),
                default: true,
                webSocket: false,
                number: 20,
                children: availableColors.map((i) => {
                    return {
                        key: i.title,
                        label: i.render(t)
                    }
                }),
                onClickBatch: () => {}
            },
            {
                key: "移除颜色",
                label: t("HTTPFlowTable.RowContextMenu.removeColor"),
                default: true,
                webSocket: false,
                number: 20,
                onClickSingle: (v) => onRemoveCalloutColor(v, data, setData),
                onClickBatch: (list, n) => onRemoveCalloutColorBatch(list, n)
            },
            {
                key: "发送到对比器",
                label: t("HTTPFlowTable.RowContextMenu.sendToComparer"),
                default: true,
                webSocket: false,
                children: [
                    {
                        key: "发送到对比器左侧",
                        label: t("HTTPFlowTable.RowContextMenu.sendToComparerLeft"),
                        // disabled: [false, true, false][compareState]
                    },
                    {
                        key: "发送到对比器右侧",
                        label: t("HTTPFlowTable.RowContextMenu.sendToComparerRight"),
                        // disabled: [false, false, true][compareState]
                    }
                ]
            },
            {
                key: "导出数据",
                label: t("HTTPFlowTable.RowContextMenu.exportData"),
                default: true,
                webSocket: false,
                children: [
                    {
                        key: "导出为Excel",
                        label: t("HTTPFlowTable.RowContextMenu.exportToExcel")
                    },
                    {
                        key: "导出为HAR",
                        label: t("HTTPFlowTable.RowContextMenu.exportToHAR")
                    }
                ],
                onClickBatch: () => {}
            },
            {
                key: "新窗口打开",
                label: t("HTTPFlowTable.RowContextMenu.openInNewWindow"),
                default: true,
                webSocket: true,
                onClickSingle: (v) => {
                    onHTTPFlowFilterTableRowDoubleClick(v)
                }
            }
        ]
    }, [data, compareState, i18n.language])

    const contextMenuKeybindingHandle = useMemoizedFn((data) => {
        const menus: any = []
        for (let item of data) {
            /** 处理带快捷键的菜单项 */
            const info = {...item}
            if (info.children && info.children.length > 0) {
                info.children = contextMenuKeybindingHandle(info.children)
            } else {
                if (info.keybindings && info.keybindings.length > 0) {
                    const keysContent = convertKeyboardToUIKey(info.keybindings)
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
            onSetCurrentRow(rowData)
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
            yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
            return
        }
        if (isAllSelect && !all) {
            yakitNotify("warning", t("HTTPFlowTable.batchOperationNoSelectAll"))
            return
        }
        if (number < length) {
            yakitNotify("warning", t("HTTPFlowTable.maxSendData", {number}))
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

    useShortcutKeyTrigger("sendAndJump*common", (focus) => {
        let item = (focus || []).find((item) => item.startsWith(ShortcutKeyFocusType.Monaco))
        if (inViewport && !item) {
            if (clickRow) {
                clickRow.IsWebsocket
                    ? newWebsocketFuzzerTab(clickRow.IsHTTPS, clickRow.Request)
                    : onSendToTab(clickRow, true, downstreamProxy)
            }
        }
    })

    useShortcutKeyTrigger("send*common", (focus) => {
        let item = (focus || []).find((item) => item.startsWith(ShortcutKeyFocusType.Monaco))
        if (inViewport && !item) {
            if (clickRow) {
                clickRow.IsWebsocket
                    ? newWebsocketFuzzerTab(clickRow.IsHTTPS, clickRow.Request, false)
                    : onSendToTab(clickRow, false, downstreamProxy)
            }
        }
    })

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
            yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
            return
        }
        if (flowList.length > number) {
            yakitNotify("warning", t("HTTPFlowTable.maxOperateData", {number}))
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
                yakitNotify("error", error + "")
            })
    })

    // 移除颜色 批量
    const onRemoveCalloutColorBatch = useMemoizedFn((flowList: HTTPFlow[], number: number) => {
        if (flowList.length === 0) {
            yakitNotify("warning", t("HTTPFlowTable.pleaseSelectData"))
            return
        }
        if (flowList.length > number) {
            yakitNotify("warning", t("HTTPFlowTable.maxOperateData", {number}))
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
    const [exportDataKey, setExportDataKey] = useState<string[]>([])
    const onExcelExport = (list: number[]) => {
        percentContainerRef.current = currentPageTabRouteKey
        const titleValue = configColumnRef.current.map((item) => ({title: item.title, key: item.dataKey}))
        const exportValue = [
            ...titleValue,
            {title: t("HTTPFlowTable.requestPacket"), key: "request"},
            {title: t("HTTPFlowTable.responsePacket"), key: "response"}
        ]
        const m = showYakitModal({
            title: t("HTTPFlowTable.exportFields"),
            content: (
                <ExportSelect
                    exportValue={exportValue}
                    initCheckValue={
                        toWebFuzzer
                            ? exportValue.filter((i) => !["GetParamsTotal", "request", "response"].includes(i.key))
                            : exportValue
                    }
                    setExportTitle={(v: string[]) => {
                        setExportDataKey(["Id", ...v])
                    }}
                    exportKey={toWebFuzzer ? "WEBFUZZER-HISTORY-EXPORT-KEYS" : "MITM-HTTP-HISTORY-EXPORT-KEYS"}
                    fileName={!toWebFuzzer ? "History" : "WebFuzzer"}
                    getData={(pagination) => getExcelData(pagination, list)}
                    onClose={() => m.destroy()}
                    getContainer={
                        document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
                    }
                />
            ),
            onCancel: () => {
                m.destroy()
            },
            width: 650,
            footer: null,
            maskClosable: false,
            getContainer: document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
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
            // 这里的key值为数据库的key
            const arrList = [
                {
                    title: t("YakitTable.order"),
                    key: "id",
                    dataKey: "Id"
                },
                {
                    title: t("HTTPFlowTable.method"),
                    key: "method",
                    dataKey: "Method"
                },
                {
                    title: t("HTTPFlowTable.statusCode"),
                    key: "status_code",
                    dataKey: "StatusCode"
                },
                {
                    title: "URL",
                    key: "url",
                    dataKey: "Url"
                },
                {
                    title: "Host",
                    key: "host",
                    dataKey: "Host"
                },
                {
                    title: "Path",
                    key: "path",
                    dataKey: "Path"
                },
                {
                    title: "Payloads",
                    key: "payloads",
                    dataKey: "Payloads"
                },
                {
                    title: t("HTTPFlowTable.fromPlugin"),
                    key: "from_plugin",
                    dataKey: "FromPlugin"
                },
                {
                    title: "Tags",
                    key: "tags",
                    dataKey: "Tags"
                },
                {
                    title: "IP",
                    key: "iP_address",
                    dataKey: "IPAddress"
                },
                {
                    title: t("HTTPFlowTable.bodyLength"),
                    key: "body_length",
                    dataKey: "BodyLength"
                },
                {
                    title: "Title",
                    key: "response",
                    dataKey: "HtmlTitle"
                },
                {
                    title: t("HTTPFlowTable.params"),
                    key: "get_params_total",
                    dataKey: "GetParamsTotal"
                },
                {
                    title: t("HTTPFlowTable.contentType"),
                    key: "content_type",
                    dataKey: "ContentType"
                },
                {
                    title: t("HTTPFlowTable.durationMs"),
                    key: "duration",
                    dataKey: "DurationMs"
                },
                {
                    title: t("HTTPFlowTable.updatedAt"),
                    key: "updated_at",
                    dataKey: "UpdatedAt"
                },
                {
                    title: t("HTTPFlowTable.requestSizeVerbose"),
                    key: "request",
                    dataKey: "RequestSizeVerbose"
                },
                {
                    title: t("HTTPFlowTable.requestPacket"),
                    key: "request",
                    dataKey: "request"
                },
                {
                    title: t("HTTPFlowTable.responsePacket"),
                    key: "response",
                    dataKey: "response"
                }
            ]
            const FieldName = arrList.filter((item) => exportDataKey.includes(item.dataKey)).map((item) => item.key)

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
                    yakitNotify("warning", `${t("HTTPFlowTable.partialExportMissing")}${message}`)
                }
                initExcelData(resolve, rsp.Data, rsp, arrList)
            })
        })
    })
    const initExcelData = (resolve, newExportData: HTTPFlow[], rsp, arrList) => {
        let exportData: any = []
        const header: string[] = []
        const filterVal: string[] = []
        exportDataKey.map((item) => {
            const title = arrList.filter((i) => i.dataKey === item)[0]?.title || item
            header.push(title)
            if (item === "request") {
                filterVal.push("Request")
            } else if (item === "response") {
                filterVal.push("Response")
            } else if (item === "Id") {
                filterVal.push("Id")
            } else {
                const itemData = configColumnRef.current.filter((itemIn) => itemIn.dataKey === item)[0]
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
            title: t("HTTPFlowTable.saveFile"),
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
    }, [query, refresh])

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
        onQueryParams && onQueryParams(JSON.stringify(copyParams), copyParams.SearchURL ? false : true)
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
                    if (isResetSelect) {
                        resetSelected()
                    } else {
                        onSetIsResetSelect && onSetIsResetSelect(true)
                    }
                } else {
                    if (isAllSelect) {
                        setSelectedRowKeys(d.map((item) => item.Id + ""))
                        setSelectedRows(d)
                    }
                }
            })
            .catch((e) => {
                yakitNotify("error", `query HTTP Flow failed: ${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
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

    useDebounceEffect(
        () => {
            if (onSetFirstHttpFlow) {
                if (data.length) {
                    onSetFirstHttpFlow(getHTTPFlowReqAndResToString(data[0]))
                } else {
                    onSetFirstHttpFlow(undefined)
                }
            }
        },
        [data],
        {wait: 300}
    )

    return (
        <div className={styles["HTTPFlowFilterTable"]} ref={hTTPFlowFilterTableRef}>
            <TableVirtualResize<HTTPFlow>
                key={tableKeyNumber}
                query={query}
                loading={loading}
                isRefresh={isRefresh}
                isReset={isReset}
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
                                        {tag.text(t)}
                                    </YakitCheckableTag>
                                ))}
                                <TableTotalAndSelectNumber
                                    total={total}
                                    selectNum={isAllSelect ? total : selectedRowKeys.length}
                                />
                            </div>
                            <div className={styles["http-history-table-right"]}>
                                {webFuzzerPageId && toWebFuzzer && closable &&(
                                    <YakitButton
                                        icon={<OutlineReplyIcon />}
                                        size='small'
                                        onClick={() => {
                                            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
                                                YakitRoute.HTTPFuzzer,
                                                webFuzzerPageId
                                            )
                                            if (currentItem) {
                                                emiter.emit(
                                                    "switchSubMenuItem",
                                                    JSON.stringify({pageId: webFuzzerPageId, forceRefresh: true})
                                                )
                                                emiter.emit(
                                                    "switchMenuItem",
                                                    JSON.stringify({route: YakitRoute.HTTPFuzzer})
                                                )
                                            } else {
                                                yakitNotify("info", "目标页面已不存在")
                                            }
                                        }}
                                    >
                                        返回
                                    </YakitButton>
                                )}
                                <YakitButton
                                    type='text'
                                    onClick={() => {
                                        setDrawerFormVisible(true)
                                    }}
                                    style={{padding: 0}}
                                >
                                    {t("HTTPFlowTable.advancedFilter")}
                                </YakitButton>
                                {isFilter && (
                                    <YakitTag color={"success"} style={{margin: 0}}>
                                        {t("HTTPFlowTable.configured")}
                                        <CheckedSvgIcon />
                                    </YakitTag>
                                )}
                                <Divider type='vertical' style={{margin: 0, top: 1}} />
                                <div className={classNames(styles["http-history-table-right-item"])}>
                                    {size?.width && size?.width > 800 && (
                                        <div className={styles["http-history-table-right-label"]}>
                                            {t("HTTPFlowTable.protocolType")}
                                        </div>
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
                                        <YakitSelect.Option value=''>{t("HTTPFlowTable.all")}</YakitSelect.Option>
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
                                <YakitPopover
                                    overlayClassName={styles["http-history-table-drop-down-popover"]}
                                    content={
                                        <YakitMenu
                                            width={150}
                                            selectedKeys={[]}
                                            data={getBatchContextMenu()}
                                            onClick={({key, keyPath}) => {
                                                onMultipleClick(key, keyPath)
                                            }}
                                        />
                                    }
                                    trigger='click'
                                    placement='bottomLeft'
                                >
                                    <YakitButton
                                        type='outline2'
                                        disabled={selectedRowKeys.length === 0}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        {t("YakitButton.batchOperation")}
                                        <OutlineChevrondownIcon />
                                    </YakitButton>
                                </YakitPopover>
                                <YakitButton
                                    icon={<OutlineCogIcon />}
                                    type={isAdvancedSet ? "text" : "text2"}
                                    onClick={() => {
                                        setAdvancedSetVisible(true)
                                    }}
                                    style={{padding: isAdvancedSet ? 0 : undefined}}
                                >
                                    {isAdvancedSet && t("HTTPFlowTable.configured")}
                                </YakitButton>
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
                currentSelectItem={clickRow}
                onSetCurrentRow={onSetCurrentRow}
                onRowDoubleClick={onHTTPFlowFilterTableRowDoubleClick}
            />
            {/* 高级筛选抽屉 */}
            {drawerFormVisible && (
                <HTTPFlowTableFormConfiguration
                    pageType='HTTPHistoryFilter'
                    responseType={contentType}
                    visible={drawerFormVisible}
                    setVisible={setDrawerFormVisible}
                    onSave={(filters) => {
                        const {
                            filterMode,
                            hostName,
                            urlPath,
                            fileSuffix,
                            searchContentType,
                            excludeKeywords,
                            statusCode
                        } = filters
                        setFilterMode(filterMode)
                        setHostName(hostName)
                        setUrlPath(urlPath)
                        setFileSuffix(fileSuffix)
                        setSearchContentType(searchContentType)
                        setExcludeKeywords(excludeKeywords)
                        setStatusCode(statusCode)
                        setDrawerFormVisible(false)
                    }}
                    filterMode={filterMode}
                    hostName={hostName}
                    urlPath={urlPath}
                    fileSuffix={fileSuffix}
                    searchContentType={searchContentType}
                    excludeKeywords={excludeKeywords}
                    statusCode={statusCode}
                />
            )}
            {/* 导出HAR数据 */}
            {percentVisible && (
                <ImportExportProgress
                    getContainer={
                        document.getElementById(`main-operator-page-body-${percentContainerRef.current}`) || undefined
                    }
                    visible={percentVisible}
                    title={t("ImportExportProgress.exportHARData")}
                    token={exportToken}
                    apiKey='ExportHTTPFlowStream'
                    onClose={(finish) => {
                        setPercentVisible(false)
                        if (finish) {
                            yakitNotify("success", t("YakitNotification.exportSuccess"))
                        }
                    }}
                />
            )}
            {/* 设置 */}
            {advancedSetVisible && (
                <AdvancedSet
                    showBackgroundRefresh={false}
                    columnsAllStr={JSON.stringify(
                        configColumnRef.current.filter((item) => !specialCustoms(item.dataKey))
                    )}
                    onCancel={() => {
                        setAdvancedSetVisible(false)
                    }}
                    onSave={(setting) => {
                        setAdvancedSetVisible(false)
                        const {configColumnsAll} = setting
                        // 自定义列
                        const unshowKeys = configColumnsAll.filter((item) => !item.isShow).map((item) => item.dataKey)
                        const newExcludeColumnsKey = [...noColumnsKey, ...unshowKeys]
                        const newColOrder = configColumnsAll.map((i) => i.dataKey)
                        if (
                            JSON.stringify(excludeColumnsKey) !== JSON.stringify(newExcludeColumnsKey) ||
                            JSON.stringify(newColOrder) !== JSON.stringify(columnsOrder)
                        ) {
                            setRemoteValue(RemoteHistoryGV.HistroyExcludeColumnsKey, unshowKeys + "")
                            setRemoteValue(RemoteHistoryGV.HistroyColumnsOrder, JSON.stringify(newColOrder))
                            setExcludeColumnsKey(newExcludeColumnsKey)
                            setColumnsOrder(newColOrder)
                            // 表格列宽度需要重新计算
                            setTableKeyNumber(uuidv4())
                        }
                    }}
                    defalutColumnsOrder={defalutColumnsOrderRef.current}
                ></AdvancedSet>
            )}
        </div>
    )
})
