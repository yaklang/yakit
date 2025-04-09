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
    ColorSearch,
    ColumnAllInfoItem,
    contentType,
    getClassNameData,
    HistorySearch,
    HTTPFlow,
    HTTPFlowsFieldGroupResponse,
    MultipleSelect,
    onConvertBodySizeByUnit,
    onExpandHTTPFlow,
    RangeInputNumberTable,
    SourceType,
    YakQueryHTTPFlowResponse
} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {isCellRedSingleColor} from "@/components/TableVirtualResize/utils"
import {yakitNotify} from "@/utils/notification"
import {ArrowCircleRightSvgIcon, CheckCircleIcon, ChromeFrameSvgIcon, ColorSwatchIcon} from "@/assets/newIcon"
import {formatTime, formatTimestamp} from "@/utils/timeUtil"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {openExternalWebsite} from "@/utils/openWebsite"
import {MITMConsts} from "@/pages/mitm/MITMConsts"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {CheckedSvgIcon} from "@/components/layout/icons"
import {Divider} from "antd"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {HTTPFlowTableFormConfiguration, HTTPFlowTableFormConsts} from "@/components/HTTPFlowTable/HTTPFlowTableForm"
import {WebTree} from "@/components/WebTree/WebTree"
import ReactResizeDetector from "react-resize-detector"
import {HistoryProcess} from "@/components/HTTPHistory"
import {useCampare} from "@/hook/useCompare/useCompare"
import {v4 as uuidv4} from "uuid"
import styles from "./HTTPHistoryFilter.module.scss"
import {isEqual} from "lodash"

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
}
export const HTTPHistoryFilter: React.FC<HTTPHistoryFilterProps> = React.memo((props) => {
    const {onSetSelectedHttpFlowIds, onSetIsAllHttpFlow} = props

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
}
const HTTPFlowFilterTable: React.FC<HTTPFlowTableProps> = React.memo((props) => {
    const {searchURL, includeInUrl, ProcessName, onQueryParams, onSetSelectedHttpFlowIds, onSetIsAllHttpFlow} = props
    const hTTPFlowFilterTableRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(hTTPFlowFilterTableRef)
    const size = useSize(hTTPFlowFilterTableRef)
    const [downstreamProxy, setDownstreamProxy] = useState<string>("")
    const [query, setQuery] = useState<YakQueryHTTPFlowRequest>({
        SourceType: "mitm",
        Full: false
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

    // #region mitm页面配置的下游代理
    useEffect(() => {
        if (inViewport) {
            getRemoteValue(MITMConsts.MITMDefaultDownstreamProxyHistory).then((res) => {
                if (res) {
                    try {
                        const obj = JSON.parse(res) || {}
                        setDownstreamProxy(obj.defaultValue || "")
                    } catch (error) {
                        setDownstreamProxy("")
                    }
                } else {
                    setDownstreamProxy("")
                }
            })
        }
    }, [inViewport])
    // #endregion

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

    // #region 表格勾选相关
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const onSelectAll = useMemoizedFn(() => {
        if (isAllSelect) {
            setIsAllSelect(false)
            setSelectedRowKeys([])
        } else {
            setIsAllSelect(true)
            const ids = data.map((item) => item.Id + "")
            setSelectedRowKeys(ids)
        }
    })
    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: HTTPFlow) => {
        if (c) {
            const ids = [...selectedRowKeys, rows.Id + ""]
            setSelectedRowKeys(ids)
        } else {
            setIsAllSelect(false)
            const ids = selectedRowKeys.filter((ele) => ele !== rows.Id + "")
            setSelectedRowKeys(ids)
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
                    const tags = rsp.Tags.filter((item) => item.Value)
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
    const noColumnsKey = []
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
                    if (res[0].value) {
                        const arr = res[0].value.split(",")
                        const excludeKeys = [...arr, ...noColumnsKey]
                        if (!isEqual(excludeKeys, excludeColumnsKey)) {
                            refreshTabelKey = true
                            setExcludeColumnsKey(excludeKeys)
                        }
                    }
                }
                if (res[1].status === "fulfilled") {
                    try {
                        const arr = JSON.parse(res[1].value) || []
                        // 确保顺序缓存里面的key一定在默认所有列中存在
                        const realArr = arr.filter((key: string) => defalutColumnsOrderRef.current.includes(key))
                        // 特殊处理 Payloads 在Url后面
                        if (false) {
                            if (realArr.findIndex((key: string) => key === "Payloads") === -1) {
                                const urlIndex = realArr.findIndex((key: string) => key === "Url")
                                realArr.splice(urlIndex + 1, 0, "Payloads")
                            }
                        } else {
                            // 如果列表有新增列，顺序从新再次缓存
                            setRemoteValue(RemoteHistoryGV.HistroyColumnsOrder, JSON.stringify(realArr))
                        }
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
                render: (text) => <div title={formatTimestamp(text)}>{text === 0 ? "-" : formatTime(text)}</div>
            },
            {
                title: "请求大小",
                dataKey: "RequestSizeVerbose",
                enableDrag: false,
                width: 200
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

        console.log("发送请求", params)
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
                    setIsAllSelect(false)
                    setSelectedRowKeys([])
                } else {
                    if (isAllSelect) {
                        setSelectedRowKeys(d.map((item) => item.Id + ""))
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
                onChange={onTableChange}
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
        </div>
    )
})
