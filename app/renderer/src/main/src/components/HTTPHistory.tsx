import React, {ReactElement, useEffect, useMemo, useRef, useState} from "react"
import "react-resizable/css/styles.css"
import {HistoryTableTitleShow, HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {useDebounceEffect, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {useStore} from "@/store/mitmState"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {YakitResizeBox} from "./yakitUI/YakitResizeBox/YakitResizeBox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {v4 as uuidv4} from "uuid"
import classNames from "classnames"
import {RemoteGV} from "@/yakitGV"
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
import styles from "./HTTPHistory.module.scss"

const {ipcRenderer} = window.require("electron")

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: boolean | (() => any) | ((isHttps: boolean, request: string) => any)
    defaultPacket?: string
    downstreamProxyStr?: string
}

type tabKeys = "web-tree" | "process"

interface HTTPHistoryTabsItem {
    key: tabKeys
    label: ReactElement | string
    contShow: boolean
}

export interface HTTPFlowBodyByIdRequest {
    Id?: number
    IsRequest: boolean
    BufSize?: number
    RuntimeId?: string
    IsRisk?: boolean
}

// 使用 HTTPHistory 控件的来源页面
export type HTTPHistorySourcePageType =
    | "MITM"
    | "History"
    | "Plugin"
    | "Webfuzzer"
    | "History_Analysis_HistoryData"
    | "History_Analysis_ruleData"
export interface HTTPHistoryProp extends HTTPPacketFuzzable, HistoryTableTitleShow {
    pageType?: HTTPHistorySourcePageType
    params?: YakQueryHTTPFlowRequest
    onSetTableTotal?: (t: number) => void
    onSetTableSelectNum?: (s: number) => void
}
export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const {
        pageType,
        downstreamProxyStr,
        params,
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
        onSetTableTotal,
        onSetTableSelectNum
    } = props
    // History Id 用于区分每个history控件
    const [historyId, setHistoryId] = useState<string>(uuidv4())
    // History页面
    const historyPage = pageType === "History"
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)

    // #region mitm页面Forward数据后需要刷新页面数据
    const {isRefreshHistory, setIsRefreshHistory} = useStore()
    const [refresh, setRefresh] = useState<boolean>(false)
    useUpdateEffect(() => {
        if (isRefreshHistory && ["History", "MITM"].includes(pageType || "")) {
            setRefresh(!refresh)
            setIsRefreshHistory(false)
        }
    }, [inViewport])
    // #endregion

    // #region 流量表导出数据，统一history页面刷新
    const [importRefresh, setImportRefresh] = useState<boolean>(false)
    const onRefreshImportHistoryTable = useMemoizedFn(() => {
        setImportRefresh(!importRefresh)
    })
    useEffect(() => {
        if (historyPage) {
            emiter.on("onRefreshImportHistoryTable", onRefreshImportHistoryTable)
            return () => {
                emiter.off("onRefreshImportHistoryTable", onRefreshImportHistoryTable)
            }
        }
    }, [historyPage])
    // #endregion

    // #region mitm页面配置代理用于发送webFuzzer带过去
    const [downstreamProxy, setDownstreamProxy] = useState<string>(downstreamProxyStr || "")
    useDebounceEffect(
        () => {
            if (inViewport) {
                getRemoteValue(MITMConsts.MITMDefaultDownstreamProxyHistory).then((res) => {
                    if (!["MITM"].includes(pageType || "") && res) {
                        try {
                            const obj = JSON.parse(res) || {}
                            setDownstreamProxy(obj.defaultValue || "")
                        } catch (error) {
                            setDownstreamProxy(downstreamProxyStr || "")
                        }
                    } else {
                        setDownstreamProxy(downstreamProxyStr || "")
                    }
                })
            }
        },
        [downstreamProxyStr, inViewport, pageType],
        {wait: 300}
    )
    // #endregion

    // #region history页面左侧tab部分
    const [hTTPHistoryTabs, setHTTPHistoryTabs] = useState<Array<HTTPHistoryTabsItem>>([
        {
            key: "web-tree",
            label: (
                <>
                    <OutlineLog2Icon /> 网站树
                </>
            ),
            contShow: false // 初始为false
        },
        {
            key: "process",
            label: (
                <>
                    <OutlineTerminalIcon />
                    进程
                </>
            ),
            contShow: false
        }
    ])
    const [curTabKey, setCurTabKey] = useState<tabKeys>("web-tree")
    useEffect(() => {
        if (historyPage) {
            getRemoteValue(RemoteGV.HistoryLeftTabs).then((setting: string) => {
                if (setting) {
                    try {
                        const {key, contShow} = JSON.parse(setting)
                        hTTPHistoryTabs.forEach((i) => {
                            if (i.key === key) {
                                i.contShow = contShow
                            } else {
                                i.contShow = false
                            }
                        })
                        setHTTPHistoryTabs([...hTTPHistoryTabs])
                        setCurTabKey(key)
                    } catch (error) {
                        hTTPHistoryTabs.forEach((i) => {
                            i.contShow = false
                        })
                        setHTTPHistoryTabs([...hTTPHistoryTabs])
                        setCurTabKey("web-tree")
                    }
                }
            })
        }
    }, [historyPage])
    const handleTabClick = (key: tabKeys, contShow: boolean) => {
        hTTPHistoryTabs.forEach((i) => {
            if (i.key === key) {
                i.contShow = !contShow
            } else {
                i.contShow = false
            }
        })
        setRemoteValue(RemoteGV.HistoryLeftTabs, JSON.stringify({key, contShow: !contShow}))
        setHTTPHistoryTabs([...hTTPHistoryTabs])
        setCurTabKey(key)
    }
    const tabContItemShow = (key: tabKeys) => {
        return curTabKey === key && hTTPHistoryTabs.find((item) => item.key === curTabKey)?.contShow
    }
    const openTabsFlag = useMemo(() => {
        return hTTPHistoryTabs.some((item) => item.contShow)
    }, [hTTPHistoryTabs])
    // #endregion

    // #region history页面网站树、进程
    const [refreshFlag, setRefreshFlag] = useState<boolean>(false)
    const webTreeRef = useRef<any>()
    const treeWrapRef = useRef<any>()
    const [treeWrapHeight, setTreeWrapHeight] = useState<number>(0)
    const [searchURL, setSearchURL] = useState<string>("")
    const [includeInUrl, setIncludeInUrl] = useState<string>("")
    const [treeQueryparams, setTreeQueryparams] = useState<string>("")

    const [curProcess, setCurProcess] = useState<string[]>([])
    const [processQueryparams, setProcessQueryparams] = useState<string>("")

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
                emiter.emit("onMITMLogProcessQuery", JSON.stringify(processQuery))
            }
        } catch (error) {}
    })

    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        entries.forEach((entry) => {
            const target = entry.target
            setTreeWrapHeight(target.getBoundingClientRect().height)
        })
    })
    useEffect(() => {
        if (treeWrapRef.current) {
            resizeObserver.observe(treeWrapRef.current)
        }
    }, [treeWrapRef.current])

    // 跳转网站树指定节点
    const onJumpWebTree = useMemoizedFn((value) => {
        if (inViewport && webTreeRef.current) {
            const val = JSON.parse(value)
            const host = val.host
            webTreeRef.current.onJumpWebTree(host)
            handleTabClick("web-tree", false)
        }
    })
    useEffect(() => {
        if (historyPage) {
            emiter.on("onHistoryJumpWebTree", onJumpWebTree)
            return () => {
                emiter.off("onHistoryJumpWebTree", onJumpWebTree)
            }
        }
    }, [historyPage])
    // #endregion

    // #region 编辑器部分是否显示
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useState<boolean>(true)
    const [secondNodeVisible, setSecondNodeVisible] = useState<boolean>(false)
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>()
    const [highlightSearch, setHighlightSearch] = useState("")
    useEffect(() => {
        setSecondNodeVisible(!onlyShowFirstNode)
    }, [onlyShowFirstNode])
    // #endregion

    return (
        <div
            ref={ref}
            className={styles.hTTPHistory}
            style={{
                paddingRight: historyPage ? 16 : 0
            }}
        >
            <YakitResizeBox
                isShowDefaultLineStyle={historyPage}
                freeze={historyPage && openTabsFlag}
                isRecalculateWH={historyPage ? openTabsFlag : true}
                firstMinSize={historyPage ? (openTabsFlag ? "325px" : "24px") : 0}
                firstRatio={historyPage ? (openTabsFlag ? "25%" : "24px") : "0px"}
                firstNode={() => {
                    if (historyPage) {
                        return (
                            <div className={styles["hTTPHistory-tab-wrap"]}>
                                <div className={styles["hTTPHistory-tab"]}>
                                    {hTTPHistoryTabs.map((item) => (
                                        <div
                                            className={classNames(styles["hTTPHistory-tab-item"], {
                                                [styles["hTTPHistory-tab-item-active"]]: curTabKey === item.key,
                                                [styles["hTTPHistory-tab-item-unshowCont"]]:
                                                    curTabKey === item.key && !item.contShow
                                            })}
                                            key={item.key}
                                            onClick={() => {
                                                handleTabClick(item.key, item.contShow)
                                            }}
                                        >
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                                <div
                                    className={classNames(styles["hTTPHistory-tab-cont-item"], styles["tree-wrap"])}
                                    style={{
                                        display: tabContItemShow("web-tree") ? "block" : "none",
                                        overflowY: "hidden"
                                    }}
                                    ref={treeWrapRef}
                                >
                                    <WebTree
                                        ref={webTreeRef}
                                        height={treeWrapHeight - 30}
                                        searchPlaceholder='请输入域名进行搜索，例baidu.com'
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
                                    className={classNames(styles["hTTPHistory-tab-cont-item"])}
                                    style={{
                                        display: tabContItemShow("process") ? "block" : "none",
                                        overflowY: "hidden"
                                    }}
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
                        )
                    }
                    return <></>
                }}
                secondMinSize={historyPage ? "720px" : "100%"}
                secondRatio={historyPage ? "75%" : "100%"}
                secondNode={() => (
                    <YakitResizeBox
                        style={{paddingBottom: historyPage ? 13 : 0}}
                        firstNode={() => (
                            <div
                                style={{
                                    paddingTop: historyPage ? 8 : 0,
                                    paddingLeft: historyPage ? 12 : 0,
                                    height: "100%"
                                }}
                            >
                                <HTTPFlowTable
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
                                />
                            </div>
                        )}
                        firstMinSize={160}
                        isVer={true}
                        freeze={!onlyShowFirstNode}
                        firstRatio={onlyShowFirstNode ? "100%" : undefined}
                        secondNodeStyle={{
                            padding: onlyShowFirstNode ? 0 : undefined,
                            display: onlyShowFirstNode ? "none" : ""
                        }}
                        secondMinSize={50}
                        secondNode={() => (
                            <>
                                {secondNodeVisible && (
                                    <div style={{width: "100%", height: "100%"}}>
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
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    />
                )}
            ></YakitResizeBox>
        </div>
    )
}

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
    resetTableAndEditorShow: (table: boolean, editor: boolean) => void // 重置 表格显示-编辑器不显示
}
const HistoryProcess: React.FC<HistoryProcessProps> = React.memo((props) => {
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
                    resetTableAndEditorShow(true, false)
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
                    allowClear={true}
                    onSearch={(value) => setSearchProcessVal(value)}
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
