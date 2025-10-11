import React, {CSSProperties, ReactElement, useContext, useEffect, useMemo, useRef, useState} from "react"
import "react-resizable/css/styles.css"
import {HistoryTableTitleShow, HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {
    useControllableValue,
    useCreation,
    useDebounceEffect,
    useInViewport,
    useMemoizedFn,
    useUpdateEffect
} from "ahooks"
import {useStore} from "@/store/mitmState"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {YakitResizeBox} from "./yakitUI/YakitResizeBox/YakitResizeBox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {v4 as uuidv4} from "uuid"
import classNames from "classnames"
import emiter from "@/utils/eventBus/eventBus"
import {WebTree} from "./WebTree/WebTree"
import {OutlineLog2Icon, OutlineTerminalIcon} from "@/assets/icon/outline"
import {MITMConsts} from "@/pages/mitm/MITMConsts"
import {YakitInput} from "./yakitUI/YakitInput/YakitInput"
import {YakitEmpty} from "./yakitUI/YakitEmpty/YakitEmpty"
import {
    BaiduNetdiskIcon,
    BashIcon,
    BurpSuiteCommunityIcon,
    BurpSuiteProfessionalIcon,
    ChromeIcon,
    ClashIconSvgIcon,
    Cse360Icon,
    CursorIcon,
    DingtalkIcon,
    DockerIcon,
    ExcelIcon,
    FeishuIcon,
    FinderIcon,
    FirefoxIcon,
    JavaIcon,
    MsedgeIcon,
    OpenvpnIcon,
    OperaIcon,
    PowerpointIcon,
    ProxifierIcon,
    QqIcon,
    Se360Icon,
    TelegramIcon,
    UToolsIcon,
    VMwareIcon,
    VscodeIcon,
    WechatIcon,
    WordIconIcon,
    ZSHIcon
} from "@/assets/commonProcessIcons"
import {YakitSpin} from "./yakitUI/YakitSpin/YakitSpin"
import {YakitButton} from "./yakitUI/YakitButton/YakitButton"
import {RefreshIcon} from "@/assets/newIcon"
import {YakitCheckbox} from "./yakitUI/YakitCheckbox/YakitCheckbox"
import ReactResizeDetector from "react-resize-detector"
import {RemoteHistoryGV} from "@/enums/history"
import styles from "./HTTPHistory.module.scss"

import MITMContext from "@/pages/mitm/Context/MITMContext"
import {RemoteGV} from "@/yakitGV"
import {cloneDeep} from "lodash"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
const {ipcRenderer} = window.require("electron")

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: boolean | (() => any) | ((isHttps: boolean, request: string) => any)
    defaultPacket?: string
    downstreamProxyStr?: string
}

type tabKeys = "web-tree" | "process"
interface TabsItem {
    key: tabKeys
    label: (t: (keys: string) => string) => ReactElement | string
    contShow: boolean
}

export interface HTTPFlowBodyByIdRequest {
    Id?: number
    IsRequest: boolean
    BufSize?: number
    RuntimeId?: string
    IsRisk?: boolean
}

// 使用 HTTPHistory 或者 编辑器 控件的来源页面
export type HTTPHistorySourcePageType =
    | "MITM"
    | "History"
    | "Plugin"
    | "History_Analysis_ruleData"
    | "HTTPHistoryFilter"
interface HTTPHistoryProp extends HistoryTableTitleShow {
    pageType: HTTPHistorySourcePageType
    params?: YakQueryHTTPFlowRequest
}
export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const {pageType} = props
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
        getRemoteValue(RemoteHistoryGV.HistoryLeftTabs).then((setting: string) => {
            if (setting) {
                try {
                    const tabs = JSON.parse(setting)
                    setTabsData((prev) => {
                        prev.forEach((i) => {
                            if (i.key === tabs.key) {
                                i.contShow = tabs.contShow
                            } else {
                                i.contShow = false
                            }
                        })
                        return [...prev]
                    })
                    setCurTabKey(tabs.key)
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
        setRemoteValue(RemoteHistoryGV.HistoryLeftTabs, JSON.stringify({contShow: contShow, key: item.key}))
        setCurTabKey(item.key)
    }
    const specifyTabToOpen = (tab: tabKeys) => {
        setTabsData((prev) => {
            prev.forEach((i) => {
                if (i.key === tab) {
                    i.contShow = true
                } else {
                    i.contShow = false
                }
            })
            return [...prev]
        })
        setRemoteValue(RemoteHistoryGV.HistoryLeftTabs, JSON.stringify({contShow: true, key: tab}))
        setCurTabKey(tab)
    }
    useEffect(() => {
        setOpenTabsFlag(tabsData.some((item) => item.contShow))
    }, [tabsData])
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
    // #endregion

    // #region 网站树、进程
    const [refreshFlag, setRefreshFlag] = useState<boolean>(false)
    const webTreeRef = useRef<any>()
    const [treeWrapHeight, setTreeWrapHeight] = useState<number>(0)
    const [searchURL, setSearchURL] = useState<string>("")
    const [includeInUrl, setIncludeInUrl] = useState<string>("")
    const [treeQueryparams, setTreeQueryparams] = useState<string>("")

    const [curProcess, setCurProcess] = useState<string[]>([])
    const [processQueryparams, setProcessQueryparams] = useState<string>("")

    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])

    // 表格参数改变
    const onQueryParams = useMemoizedFn((queryParams, execFlag) => {
        try {
            const treeQuery = JSON.parse(queryParams) || {}
            delete treeQuery.Pagination
            delete treeQuery.AfterId
            delete treeQuery.BeforeId
            delete treeQuery.SearchURL
            delete treeQuery.IncludeInUrl
            setTreeQueryparams(JSON.stringify(treeQuery))
            setRefreshFlag(!!execFlag)

            const processQuery = JSON.parse(queryParams) || {}
            delete processQuery.Pagination
            delete processQuery.AfterId
            delete processQuery.BeforeId
            delete processQuery.ProcessName
            setProcessQueryparams(JSON.stringify(processQuery))
            if (pageType === "MITM") {
                emiter.emit(
                    "onMITMLogProcessQuery",
                    JSON.stringify({queryStr: JSON.stringify(processQuery), version: mitmVersion})
                )
            }
        } catch (error) {}
    })

    // 跳转网站树指定节点
    const onJumpWebTree = useMemoizedFn((value) => {
        if (webTreeRef.current) {
            const val = JSON.parse(value)
            const host = val.host
            webTreeRef.current.onJumpWebTree(host)
            specifyTabToOpen("web-tree")
        }
    })
    useEffect(() => {
        if (pageType === "History") {
            emiter.on("onHistoryJumpWebTree", onJumpWebTree)
            return () => {
                emiter.off("onHistoryJumpWebTree", onJumpWebTree)
            }
        }
    }, [pageType])

    // 用于控制HTTPFlowRealTimeTableAndEditor
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useState<boolean>(true)
    const [secondNodeVisible, setSecondNodeVisible] = useState<boolean>(false)
    // #endregion

    return (
        <div className={styles.hTTPHistory}>
            <YakitResizeBox
                isVer={false}
                freeze={openTabsFlag}
                isRecalculateWH={openTabsFlag}
                firstNode={() => (
                    <div className={styles["hTTPHistory-left"]}>
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
                                        ref={webTreeRef}
                                        height={treeWrapHeight - 30}
                                        searchPlaceholder={t("HTTPHistory.pleaseEnterDomainToSearch")}
                                        treeExtraQueryparams={treeQueryparams}
                                        refreshTreeFlag={refreshFlag}
                                        onGetUrl={(searchURL, includeInUrl) => {
                                            setSearchURL(searchURL)
                                            setIncludeInUrl(includeInUrl)
                                        }}
                                        resetTableAndEditorShow={(table, editor) => {
                                            setOnlyShowFirstNode(table)
                                            setSecondNodeVisible(editor)
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
                                        resetTableAndEditorShow={(table, editor) => {
                                            setOnlyShowFirstNode(table)
                                            setSecondNodeVisible(editor)
                                        }}
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
                    <div className={styles["hTTPHistory-right"]}>
                        <HTTPFlowRealTimeTableAndEditor
                            searchURL={searchURL}
                            includeInUrl={includeInUrl}
                            curProcess={curProcess}
                            onQueryParams={onQueryParams}
                            setOnlyShowFirstNode={setOnlyShowFirstNode}
                            setSecondNodeVisible={setSecondNodeVisible}
                            {...props}
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
}

interface HTTPFlowRealTimeTableAndEditorProps extends HistoryTableTitleShow {
    pageType: HTTPHistorySourcePageType
    runtimeId?: string
    httpHistoryTableTitleStyle?: CSSProperties
    containerClassName?: string
    titleHeight?: number
    wrapperStyle?: CSSProperties
    showFlod?: boolean
    params?: YakQueryHTTPFlowRequest
    searchURL?: string
    includeInUrl?: string | string[]
    curProcess?: string[]
    onQueryParams?: (queryParams: string, execFlag: boolean) => void
    downstreamProxyStr?: string
    onSetTableTotal?: (t: number) => void
    onSetTableSelectNum?: (s: number) => void
    onSetHasNewData?: (f: boolean) => void
    setOnlyShowFirstNode?: (only: boolean) => void
    setSecondNodeVisible?: (show: boolean) => void
}
/**
 * 此组件用于实时流量表和编辑器
 */
export const HTTPFlowRealTimeTableAndEditor: React.FC<HTTPFlowRealTimeTableAndEditorProps> = React.memo((props) => {
    const {
        pageType,
        runtimeId,
        wrapperStyle,
        httpHistoryTableTitleStyle,
        titleHeight,
        containerClassName,
        params,
        searchURL,
        includeInUrl,
        curProcess,
        onQueryParams,
        downstreamProxyStr,
        onSetTableTotal,
        onSetTableSelectNum,
        onSetHasNewData,
        noTableTitle = false,
        showSourceType = true,
        showAdvancedSearch = true,
        showProtocolType = true,
        showHistorySearch = true,
        showColorSwatch = true,
        showBatchActions = true,
        showDelAll = true,
        showSetting = true,
        showRefresh = true,
        showFlod = true
    } = props

    const hTTPFlowRealTimeTableAndEditorRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(hTTPFlowRealTimeTableAndEditorRef)

    // History Id 用于区分每个history控件
    const [historyId, setHistoryId] = useState<string>(uuidv4())
    const [highlightSearch, setHighlightSearch] = useState("")

    // #region mitm页面Forward数据后需要刷新页面数据
    const {isRefreshHistory, setIsRefreshHistory} = useStore()
    const [refresh, setRefresh] = useState<boolean>(false)
    useUpdateEffect(() => {
        if (isRefreshHistory && ["History", "MITM"].includes(pageType)) {
            setRefresh((prev) => !prev)
            setIsRefreshHistory(false)
        }
    }, [inViewport])
    // #endregion

    // #region mitm页面配置代理，其余pageType使用该组件通过获取缓存，发送到webFuzzer带过去
    const [downstreamProxy, setDownstreamProxy] = useState<string>(downstreamProxyStr || "")
    useDebounceEffect(
        () => {
            if (inViewport) {
                setDownstreamProxy(downstreamProxyStr || "")
                getRemoteValue(MITMConsts.MITMDefaultDownstreamProxyHistory).then((res) => {
                    if (!(pageType === "MITM") && res) {
                        try {
                            const obj = JSON.parse(res) || {}
                            setDownstreamProxy(obj.defaultValue || "")
                        } catch (error) {}
                    }
                })
            }
        },
        [downstreamProxyStr, inViewport, pageType],
        {wait: 300}
    )
    // #endregion

    // #region 流量表导出数据，统一history页面刷新
    const [importRefresh, setImportRefresh] = useState<boolean>(false)
    const onRefreshImportHistoryTable = useMemoizedFn(() => {
        setImportRefresh((prev) => !prev)
    })
    useEffect(() => {
        if (pageType === "History") {
            emiter.on("onRefreshImportHistoryTable", onRefreshImportHistoryTable)
            return () => {
                emiter.off("onRefreshImportHistoryTable", onRefreshImportHistoryTable)
            }
        }
    }, [pageType])
    // #endregion

    // #region 编辑器部分是否显示
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useControllableValue<boolean>(props, {
        defaultValue: true,
        valuePropName: "onlyShowFirstNode",
        trigger: "setOnlyShowFirstNode"
    })
    const [secondNodeVisible, setSecondNodeVisible] = useControllableValue<boolean>({
        defaultValue: false,
        valuePropName: "secondNodeVisible",
        trigger: "setSecondNodeVisible"
    })
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>()
    useEffect(() => {
        setSecondNodeVisible(!onlyShowFirstNode)
    }, [onlyShowFirstNode])
    const lastRatioRef = useRef<{firstRatio: string; secondRatio: string}>({
        firstRatio: "50%",
        secondRatio: "50%"
    })
    useEffect(() => {
        getRemoteValue(RemoteGV.historyTableYakitResizeBox).then((res) => {
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
    // #endregion

    return (
        <div
            className={styles["hTTPFlowRealTimeTableAndEditor"]}
            ref={hTTPFlowRealTimeTableAndEditorRef}
            style={wrapperStyle}
        >
            <YakitResizeBox
                isVer={true}
                // 隐藏详情只需要展示第一个节点
                onClickHiddenBox={() => setOnlyShowFirstNode(true)}
                firstNode={() => (
                    <div style={{width: "100%", height: "100%"}}>
                        <HTTPFlowTable
                            containerClassName={containerClassName}
                            runTimeId={runtimeId}
                            noTableTitle={noTableTitle}
                            showSourceType={showSourceType}
                            showAdvancedSearch={showAdvancedSearch}
                            showProtocolType={showProtocolType}
                            showHistorySearch={showHistorySearch}
                            showColorSwatch={showColorSwatch}
                            showBatchActions={showBatchActions}
                            showDelAll={showDelAll}
                            showSetting={showSetting}
                            showRefresh={showRefresh}
                            params={params}
                            searchURL={searchURL}
                            includeInUrl={includeInUrl}
                            onSelected={(i) => {
                                setSelectedHTTPFlow(i)
                            }}
                            onSearch={setHighlightSearch}
                            onlyShowFirstNode={onlyShowFirstNode}
                            setOnlyShowFirstNode={setOnlyShowFirstNode}
                            refresh={refresh}
                            importRefresh={importRefresh}
                            pageType={pageType}
                            historyId={historyId}
                            onQueryParams={onQueryParams}
                            inViewport={inViewport}
                            downstreamProxyStr={downstreamProxy}
                            ProcessName={curProcess}
                            onSetTableTotal={onSetTableTotal}
                            onSetTableSelectNum={onSetTableSelectNum}
                            onSetHasNewData={onSetHasNewData}
                            httpHistoryTableTitleStyle={httpHistoryTableTitleStyle}
                            titleHeight={titleHeight}
                        />
                    </div>
                )}
                secondNode={
                    <div style={{width: "100%", height: "100%"}}>
                        {secondNodeVisible && (
                            <HTTPFlowDetailMini
                                noHeader={true}
                                search={highlightSearch}
                                id={selected?.Id || 0}
                                sendToWebFuzzer={true}
                                selectedFlow={selected}
                                refresh={refresh}
                                historyId={historyId}
                                downstreamProxyStr={downstreamProxy}
                                pageType={pageType}
                                showFlod={showFlod}
                            />
                        )}
                    </div>
                }
                firstMinSize={80}
                secondMinSize={200}
                secondNodeStyle={{
                    display: !secondNodeVisible ? "none" : "",
                    padding: !secondNodeVisible ? 0 : undefined
                }}
                lineStyle={{
                    display: !secondNodeVisible ? "none" : "", 
                    marginTop: pageType === 'MITM'? 6 : 0 // MITM列表需要和拖拽线有间距
                }}
                lineDirection='top'
                onMouseUp={({firstSizePercent, secondSizePercent}) => {
                    lastRatioRef.current = {
                        firstRatio: firstSizePercent,
                        secondRatio: secondSizePercent
                    }
                    // 缓存比例用于下次加载
                    setRemoteValue(
                        RemoteGV.historyTableYakitResizeBox,
                        JSON.stringify({
                            firstSizePercent,
                            secondSizePercent
                        })
                    )
                }}
                {...ResizeBoxProps}
            />
        </div>
    )
})

interface CommonProcessItem {
    process: string[]
    icon: ReactElement
}
const commonProcess: CommonProcessItem[] = [
    {
        process: ["chrome"],
        icon: <ChromeIcon />
    },
    {
        process: ["firefox"],
        icon: <FirefoxIcon />
    },
    {
        process: ["opera"],
        icon: <OperaIcon />
    },
    {
        process: ["msedge"],
        icon: <MsedgeIcon />
    },
    {
        process: ["360se"],
        icon: <Se360Icon />
    },
    {
        process: ["360cse"],
        icon: <Cse360Icon />
    },
    {
        process: ["wechat"],
        icon: <WechatIcon />
    },
    {
        process: ["qq"],
        icon: <QqIcon />
    },
    {
        process: ["code"],
        icon: <VscodeIcon />
    },
    {
        process: ["dingtalk"],
        icon: <DingtalkIcon />
    },
    {
        process: ["feishu"],
        icon: <FeishuIcon />
    },
    {
        process: ["BaiduNetdisk"],
        icon: <BaiduNetdiskIcon />
    },
    {
        process: ["clash"],
        icon: <ClashIconSvgIcon />
    },
    {
        process: ["BurpSuiteCommunity"],
        icon: <BurpSuiteCommunityIcon />
    },
    {
        process: ["BurpSuiteProfessional"],
        icon: <BurpSuiteProfessionalIcon />
    },
    {
        process: ["Word"],
        icon: <WordIconIcon />
    },
    {
        process: ["Excel"],
        icon: <ExcelIcon />
    },
    {
        process: ["Powerpoint"],
        icon: <PowerpointIcon />
    },
    {
        process: ["Finder"],
        icon: <FinderIcon />
    },
    {
        process: ["cursor"],
        icon: <CursorIcon />
    },
    {
        process: ["openvpn", "openvpn-gui", "openvpnserv", "openvpnserv2"],
        icon: <OpenvpnIcon />
    },
    {
        process: ["docker"],
        icon: <DockerIcon />
    },
    {
        process: ["jdk", "java"],
        icon: <JavaIcon />
    },
    {
        process: ["zsh"],
        icon: <ZSHIcon />
    },
    {
        process: ["bash"],
        icon: <BashIcon />
    },
    {
        process: ["VMware"],
        icon: <VMwareIcon />
    },
    {
        process: ["Telegram"],
        icon: <TelegramIcon />
    },
    {
        process: ["uTools"],
        icon: <UToolsIcon />
    },
    {
        process: ["Proxifier"],
        icon: <ProxifierIcon />
    }
]
export const iconProcessMap = commonProcess.reduce(
    (map, item) => {
        item.process.forEach((name) => {
            map[name.toLocaleLowerCase()] = item.icon
        })
        return map
    },
    {} as Record<string, ReactElement | undefined>
)
export interface ProcessItem {
    process: string
    icon?: ReactElement
}
interface HistoryProcessProps {
    queryparamsStr: string
    refreshProcessFlag: boolean
    curProcess: string[]
    onSetCurProcess: (curProcess: string[]) => void
    resetTableAndEditorShow?: (table: boolean, editor: boolean) => void // 重置 表格显示-编辑器不显示
}
export const HistoryProcess: React.FC<HistoryProcessProps> = React.memo((props) => {
    const {queryparamsStr, refreshProcessFlag, curProcess, onSetCurProcess, resetTableAndEditorShow} = props
    const processRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(processRef)
    const [searchProcessVal, setSearchProcessVal] = useState<string>("")
    const [processLoading, setProcessLoading] = useState<boolean>(false)
    const [processList, setProcessList] = useState<ProcessItem[]>([])
    const searchProcessValRef = useRef<string>(searchProcessVal)
    const curProcessRef = useRef<string[]>(curProcess)
    useEffect(() => {
        searchProcessValRef.current = searchProcessVal
    }, [searchProcessVal])
    useEffect(() => {
        curProcessRef.current = curProcess
    }, [curProcess])

    const renderProcessList = useMemo(() => {
        return searchProcessVal
            ? processList.filter((item) =>
                  item.process.toLocaleLowerCase().includes(searchProcessVal.toLocaleLowerCase())
              )
            : processList
    }, [searchProcessVal, processList])

    const onProcessItemClick = (processItem: ProcessItem) => {
        if (curProcess.includes(processItem.process)) {
            const newProcess = curProcess.filter((process) => process !== processItem.process)
            onSetCurProcess(newProcess)
        } else {
            onSetCurProcess([...curProcess, processItem.process])
        }
    }

    useEffect(() => {
        if (curProcessRef.current.length) {
            if (refreshProcessFlag) {
                if (searchProcessValRef.current) {
                } else {
                    resetTableAndEditorShow && resetTableAndEditorShow(true, false)
                    refreshProcess()
                }
            }
        } else {
            if (!searchProcessValRef.current) {
                refreshProcess()
            }
        }
    }, [queryparamsStr, refreshProcessFlag, inViewport])

    const refreshProcess = useMemoizedFn(() => {
        setProcessLoading(true)
        onSetCurProcess([])
        try {
            const query = JSON.parse(queryparamsStr)
            ipcRenderer
                .invoke("QueryHTTPFlowsProcessNames", query)
                .then((res) => {
                    const processArr = (res.ProcessNames || [])
                        .filter((name: string) => name)
                        .map((name: string) => {
                            const lowerName = name.toLocaleLowerCase()
                            const icon = Object.keys(iconProcessMap).find((key) => {
                                if (key.startsWith("docker") && lowerName.startsWith("docker")) {
                                    return true
                                } else if (key.startsWith("jdk") && lowerName.startsWith("jdk")) {
                                    return true
                                } else if (key.startsWith("java") && lowerName.startsWith("java")) {
                                    return true
                                } else if (key.startsWith("vmware") && lowerName.startsWith("vmware")) {
                                    return true
                                } else {
                                    return lowerName.includes(key)
                                }
                            })
                            return {process: name, icon: icon ? iconProcessMap[icon] : undefined}
                        })
                    setProcessList(processArr)
                })
                .finally(() => {
                    setProcessLoading(false)
                })
        } catch (error) {
            setProcessLoading(false)
        }
    })

    return (
        <div className={styles["history-process"]} ref={processRef}>
            <div className={styles["history-process-search-wrapper"]}>
                <YakitInput.Search
                    wrapperStyle={{width: "calc(100% - 40px)"}}
                    onSearch={(value) => setSearchProcessVal(value)}
                    allowClear
                />
                <YakitButton type='text2' icon={<RefreshIcon />} onClick={refreshProcess} />
            </div>
            <div className={styles["process-list-wrapper"]}>
                {processLoading ? (
                    <YakitSpin style={{display: "block"}}></YakitSpin>
                ) : (
                    <>
                        {renderProcessList.length ? (
                            <>
                                {renderProcessList.map((item) => (
                                    <div
                                        className={classNames(styles["process-list-item"], {
                                            [styles["process-list-item-active"]]: curProcess.includes(item.process)
                                        })}
                                        key={item.process}
                                    >
                                        <YakitCheckbox
                                            checked={curProcess.includes(item.process)}
                                            onChange={() => {
                                                onProcessItemClick(item)
                                            }}
                                        >
                                            <div className={styles["process-item-left-wrapper"]}>
                                                {item.icon ? (
                                                    <div className={styles["process-icon"]}>{item.icon}</div>
                                                ) : (
                                                    <OutlineTerminalIcon className={styles["process-icon"]} />
                                                )}
                                                <div className={styles["process-item-label"]} title={item.process}>
                                                    {item.process}
                                                </div>
                                            </div>
                                        </YakitCheckbox>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <YakitEmpty></YakitEmpty>
                        )}
                    </>
                )}
            </div>
        </div>
    )
})
