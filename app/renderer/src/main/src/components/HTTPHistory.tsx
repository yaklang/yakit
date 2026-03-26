import React, {CSSProperties, ReactElement, ReactNode, useContext, useEffect, useMemo, useRef, useState} from "react"
import "react-resizable/css/styles.css"
import {HistoryTableTitleShow, HTTPFlow, HTTPFlowsFieldGroupResponse, HTTPFlowTable} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {
    useControllableValue,
    useCreation,
    useDebounceEffect,
    useInViewport,
    useMemoizedFn,
    useSafeState,
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
import {OutlineBotIcon, OutlineLog2Icon, OutlineFilterIcon, OutlineSearchIcon } from "@/assets/icon/outline"
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
import {YakitSideTab} from "./yakitSideTab/YakitSideTab"
import {YakitTabsProps} from "./yakitSideTab/YakitSideTabType"
import {JSONParseLog} from "@/utils/tool"
import AIAgentContext, {AIAgentContextDispatcher, AIAgentContextStore} from "@/pages/ai-agent/useContext/AIAgentContext"
import ChatIPCContent, {
    AIChatIPCSendParams,
    AISendConfigHotpatchParams,
    AISendSyncMessageParams,
    ChatIPCContextDispatcher,
    ChatIPCContextStore,
    defaultDispatcherOfChatIPC
} from "@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {AIAgentSettingDefault} from "@/pages/ai-agent/defaultConstant"
import {histroyAiStore} from "@/pages/ai-agent/store/ChatDataStore"
import {AIChatInfo} from "@/pages/ai-agent/type/aiChat"
import {
    AIReActChatRefProps,
    AIHandleStartParams,
    AIHandleStartExtraProps,
    AIHandleStartResProps,
    AISendParams,
    AISendResProps
} from "@/pages/ai-re-act/aiReActChat/AIReActChatType"
import {AIInputEvent} from "@/pages/ai-re-act/hooks/grpcApi"
import {ChatIPCSendType} from "@/pages/ai-re-act/hooks/type"
import useChatIPC from "@/pages/ai-re-act/hooks/useChatIPC"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"

import {HistroryAIReActChat} from "./HistroryAIReActChat"
import YakitCollapse from "./yakitUI/YakitCollapse/YakitCollapse"
import {YakitPopover} from "./yakitUI/YakitPopover/YakitPopover"
import { yakitNotify } from "@/utils/notification"
import { FiltersItemProps } from "./TableVirtualResize/TableVirtualResizeType"

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: boolean | (() => any) | ((isHttps: boolean, request: string) => any)
    defaultPacket?: string
    downstreamProxyStr?: string
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
export const HistoryTab: YakitTabsProps[] = [
    {
        icon: <OutlineLog2Icon />,
        label: "HTTPHistory.websiteTree",
        value: "web-tree"
    },
    {
        icon: <OutlineFilterIcon />,
        label: "RangeInputNumberTableWrapper.filter",
        value: "process"
    },
    {
        icon: <OutlineBotIcon />,
        label: "HTTPHistory.AI",
        value: "ai"
    }
]
export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const {pageType} = props
    const {t, i18n} = useI18nNamespaces(["history"])
    // #region 左侧tab
    const [activeKey, setActiveKey] = useState<string>("web-tree")
    const [openTabsFlag, setOpenTabsFlag] = useState<boolean>(true)
    useEffect(() => {
        getRemoteValue(RemoteHistoryGV.HistoryLeftTabs).then((setting: string) => {
            if (setting) {
                try {
                    const tabs = JSONParseLog(setting, {page: "HTTPHistory", fun: "RemoteHistoryGV.HistoryLeftTabs"})
                    setOpenTabsFlag(tabs.contShow)
                    onActiveKey(tabs.key)
                } catch (error) {}
            }
        })
    }, [])

    const onActiveKey = useMemoizedFn((key) => {
        if (key === "ai") {
            setShowFreeChat(true)
        }
        setActiveKey(key)
    })

    useDebounceEffect(
        () => {
            setRemoteValue(RemoteHistoryGV.HistoryLeftTabs, JSON.stringify({contShow: openTabsFlag, key: activeKey}))
        },
        [openTabsFlag, activeKey],
        {wait: 300}
    )

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
    const [includeInUrl, setIncludeInUrl] = useState<string[]>([])
    const [treeQueryparams, setTreeQueryparams] = useState<string>("")

    const [curProcess, setCurProcess] = useState<string[]>([])
    const [processQueryparams, setProcessQueryparams] = useState<string>("")
    const [curTags, setCurTags] = useState<string[]>([])

    const mitmContent = useContext(MITMContext)

    const mitmVersion = useCreation(() => {
        return mitmContent.mitmStore.version
    }, [mitmContent.mitmStore.version])

    // 表格参数改变
    const onQueryParams = useMemoizedFn((queryParams, execFlag) => {
        try {
            const treeQuery = JSONParseLog(queryParams, {page: "HTTPHistory", fun: "onQueryParams-treeQuery"}) || {}
            delete treeQuery.IncludeInUrl
            setTreeQueryparams(JSON.stringify(treeQuery))
            setRefreshFlag(!!execFlag)

            const processQuery =
                JSONParseLog(queryParams, {page: "HTTPHistory", fun: "onQueryParams-processQuery"}) || {}
            delete processQuery.ProcessName
            delete processQuery.Tags
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
            const val = JSONParseLog(value, {page: "HTTPHistory", fun: "onJumpWebTree"})
            const host = val.host
            webTreeRef.current.onJumpWebTree(host)
            setOpenTabsFlag(true)
            onActiveKey("web-tree")
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

    // TODO  AI 召回逻辑
    // #region 问题相关逻辑
    const aiReActChatRef = useRef<AIReActChatRefProps>(null)
    const [showFreeChat, setShowFreeChat] = useSafeState(false)
    const refRef = useRef<HTMLDivElement>(null)

    const [inViewport = true] = useInViewport(refRef)

    const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(cloneDeep(AIAgentSettingDefault))

    // 历史对话
    const [chats, setChats, getChats] = useGetSetState<AIChatInfo[]>([])
    // 当前展示对话
    const [activeChat, setActiveChat] = useSafeState<AIChatInfo>()

    const [chatIPCData, events] = useChatIPC({
        cacheDataStore: histroyAiStore
    })

    const {execute} = chatIPCData

    /** 当前对话唯一ID */
    const activeID = useCreation(() => {
        return activeChat?.SessionID
    }, [activeChat])

    const handleSendCasual = useMemoizedFn((params: AIChatIPCSendParams) => {
        const targetParams = {...params, FocusModeLoop: "http_flow_analyze"}
        handleSendInteractiveMessage(targetParams, "casual")
    })

    const onStartRequest = useMemoizedFn((data: AIHandleStartParams) => {
        const newChat: AIHandleStartExtraProps = {
            chatId: activeChat?.SessionID
        }

        return new Promise<AIHandleStartResProps>((resolve) => {
            const params = {...data.params, FocusModeLoop: "http_flow_analyze"}
            resolve({
                params,
                extraParams: newChat
                // onChatFromHistory
            })
        })
    })
    const onChatFromHistory = useMemoizedFn((session: string) => {
        events.onDelChats([session])
    })

    const onStop = useMemoizedFn(() => {
        if (execute && activeID) {
            events.onClose(activeID)
        }
    })

    /**发送 IsInteractiveMessage 消息 */
    const handleSendInteractiveMessage = useMemoizedFn((params: AIChatIPCSendParams, type: ChatIPCSendType) => {
        const {value, id, optionValue} = params
        if (!activeID) return
        if (!id) return

        const info: AIInputEvent = {
            IsInteractiveMessage: true,
            InteractiveId: id,
            InteractiveJSONInput: value
        }
        events.onSend({token: activeID, type, params: info, optionValue})
    })

    const handleSend = useMemoizedFn((params: AIChatIPCSendParams) => {
        const targetParams = {...params, FocusModeLoop: "http_flow_analyze"}
        handleSendInteractiveMessage(targetParams, "")
    })

    const onSendRequest = useMemoizedFn((data: AISendParams) => {
        const params = {...data.params, FocusModeLoop: "http_flow_analyze"}

        return new Promise<AISendResProps>((resolve) => {
            resolve({
                params
            })
        })
    })

    /**发送 IsSyncMessage 消息 */
    const handleSendSyncMessage = useMemoizedFn((data: AISendSyncMessageParams) => {
        if (!activeID) return
        const {syncType, SyncJsonInput} = data
        const params = {...data.params, FocusModeLoop: "http_flow_analyze"}
        const info: AIInputEvent = {
            IsSyncMessage: true,
            SyncType: syncType,
            SyncJsonInput,
            Params: params
        }
        events.onSend({token: activeID, type: "", params: info})
    })

    /**发送 IsConfigHotpatch 消息 */
    const handleSendConfigHotpatch = useMemoizedFn((data: AISendConfigHotpatchParams) => {
        if (!activeID) return
        const {hotpatchType} = data

        const params = {...data.params, FocusModeLoop: "http_flow_analyze"}
        const info: AIInputEvent = {
            IsConfigHotpatch: true,
            HotpatchType: hotpatchType,
            Params: params
        }
        events.onSend({token: activeID, type: "", params: info})
    })

    const store: ChatIPCContextStore = useCreation(() => {
        return {
            chatIPCData,
            planReviewTreeKeywordsMap: new Map(),
            reviewExpand: false
        }
    }, [chatIPCData])

    const dispatcher: ChatIPCContextDispatcher = useCreation(() => {
        return {
            ...defaultDispatcherOfChatIPC,
            chatIPCEvents: events,
            handleSendCasual,
            handleStop: onStop,
            handleSend,
            handleSendSyncMessage,
            handleSendConfigHotpatch
        }
    }, [events])

    const stores: AIAgentContextStore = useMemo(() => {
        return {
            setting: setting,
            chats: chats,
            activeChat: activeChat
        }
    }, [setting, chats, activeChat])

    const dispatchers: AIAgentContextDispatcher = useMemo(() => {
        return {
            getSetting: getSetting,
            setSetting: setSetting,
            setChats: setChats,
            getChats: getChats,
            setActiveChat: setActiveChat,
            getChatData: histroyAiStore.get
        }
    }, [])

    return (
        <AIAgentContext.Provider value={{store: stores, dispatcher: dispatchers}}>
            <ChatIPCContent.Provider value={{store, dispatcher}}>
                <div className={styles.hTTPHistory}>
                    <YakitResizeBox
                        isVer={false}
                        freeze={openTabsFlag}
                        isRecalculateWH={openTabsFlag}
                        firstNode={() => (
                            <div className={styles["hTTPHistory-left"]}>
                                <YakitSideTab
                                    key={i18n.language}
                                    t={t}
                                    yakitTabs={HistoryTab}
                                    activeKey={activeKey}
                                    onActiveKey={onActiveKey}
                                    show={openTabsFlag}
                                    setShow={setOpenTabsFlag}
                                />
                                <div className={styles["tab-content"]}>
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
                                        style={{display: activeKey === "web-tree" ? "block" : "none"}}
                                    >
                                        <WebTree
                                            ref={webTreeRef}
                                            height={treeWrapHeight - 30}
                                            searchPlaceholder={t("HTTPHistory.pleaseEnterDomainToSearch")}
                                            treeExtraQueryparams={treeQueryparams}
                                            refreshTreeFlag={refreshFlag}
                                            multiple
                                            onSelectNodesKeys={(selectKeys) =>
                                                setIncludeInUrl(selectKeys.map((i) => i + ""))
                                            }
                                        ></WebTree>
                                    </div>
                                    <div
                                        className={styles["process-wrapper"]}
                                        style={{display: activeKey === "process" ? "block" : "none"}}
                                    >
                                        <HistoryProcess
                                            queryparamsStr={processQueryparams}
                                            refreshProcessFlag={refreshFlag}
                                            curProcess={curProcess}
                                            curTags={curTags}
                                            onSetCurTags={setCurTags}
                                            onSetCurProcess={setCurProcess}
                                            resetTableAndEditorShow={(table, editor) => {
                                                setOnlyShowFirstNode(table)
                                                setSecondNodeVisible(editor)
                                            }}
                                        ></HistoryProcess>
                                    </div>
                                    {activeKey === "ai" && (
                                        <HistroryAIReActChat
                                            refRef={refRef}
                                            showFreeChat={showFreeChat}
                                            setShowFreeChat={setShowFreeChat}
                                            aiReActChatRef={aiReActChatRef}
                                            onStartRequest={onStartRequest}
                                            onSendRequest={onSendRequest}
                                            activeID={activeID}
                                            onStop={onStop}
                                            events={events}
                                            onChatFromHistory={onChatFromHistory}
                                            setActiveChat={setActiveChat}
                                            setOpenTabsFlag={setOpenTabsFlag}
                                            inViewport={inViewport}
                                            setSetting={setSetting}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        lineStyle={{display: ""}}
                        firstMinSize={openTabsFlag ? "325px" : "24px"}
                        secondMinSize={720}
                        secondNode={
                            <div className={styles["hTTPHistory-right"]}>
                                <HTTPFlowRealTimeTableAndEditor
                                    includeInUrl={includeInUrl}
                                    curProcess={curProcess}
                                    curTags={curTags}
                                    onQueryParams={onQueryParams}
                                    setOnlyShowFirstNode={setOnlyShowFirstNode}
                                    setSecondNodeVisible={setSecondNodeVisible}
                                    showHistoryAnalysisBtn
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
            </ChatIPCContent.Provider>
        </AIAgentContext.Provider>
    )
}

interface HTTPFlowRealTimeTableAndEditorProps extends HistoryTableTitleShow {
    pageType: HTTPHistorySourcePageType
    runtimeId?: string
    filterTagDom?: ReactNode
    httpHistoryTableTitleStyle?: CSSProperties
    containerClassName?: string
    titleHeight?: number
    wrapperStyle?: CSSProperties
    showFlod?: boolean
    params?: YakQueryHTTPFlowRequest
    includeInUrl?: string[]
    curProcess?: string[]
    curTags?: string[]
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
        includeInUrl,
        filterTagDom,
        curProcess,
        curTags,
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
        showFlod = true,
        showHistoryAnalysisBtn = false
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
                    const {firstSizePercent, secondSizePercent} = JSONParseLog(res, {
                        page: "HTTPHistory",
                        fun: "RemoteGV.historyTableYakitResizeBox"
                    })
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
                            includeInUrl={includeInUrl}
                            onSelected={(i) => {
                                setSelectedHTTPFlow(i)
                            }}
                            filterTagDom={filterTagDom}
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
                            TagsFilter={curTags}
                            onSetTableTotal={onSetTableTotal}
                            onSetTableSelectNum={onSetTableSelectNum}
                            onSetHasNewData={onSetHasNewData}
                            httpHistoryTableTitleStyle={httpHistoryTableTitleStyle}
                            titleHeight={titleHeight}
                            showHistoryAnalysisBtn={showHistoryAnalysisBtn}
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
                    marginTop: pageType === "MITM" ? 6 : 0 // MITM列表需要和拖拽线有间距
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
type HistoryProcessPanelKey = "process" | "tag"
interface HistoryProcessProps {
    queryparamsStr: string
    refreshProcessFlag: boolean
    curProcess: string[]
    onSetCurProcess: (curProcess: string[]) => void
    curTags?: string[]
    onSetCurTags?: (curTags: string[]) => void
    resetTableAndEditorShow?: (table: boolean, editor: boolean) => void // 重置 表格显示-编辑器不显示
}
export const HistoryProcess: React.FC<HistoryProcessProps> = React.memo((props) => {
    const {
        queryparamsStr,
        refreshProcessFlag,
        curProcess,
        curTags = [],
        onSetCurProcess,
        onSetCurTags,
        resetTableAndEditorShow
    } = props
    const processRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(processRef)
    const [searchProcessVal, setSearchProcessVal] = useState<string>("")
    const [processLoading, setProcessLoading] = useState<boolean>(false)
    const [processList, setProcessList] = useState<ProcessItem[]>([])
    const searchProcessValRef = useRef<string>(searchProcessVal)
    const curProcessRef = useRef<string[]>(curProcess)
    const [searchTagVal, setSearchTagVal] = useState<string>("")
    const [tagList, setTagList] = useState<FiltersItemProps[]>([])
    const [tagListLoading, setTagListLoading] = useState<boolean>(false)
    const [activeKey, setActiveKey] = useState<string[]>(["process", "tag"])
    const {t} = useI18nNamespaces(["history", "yakitUi"])
    const [searchValues, setSearchValues] = useState<{process: string; tag: string}>({process: "", tag: ""})

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
            const query = JSONParseLog(queryparamsStr, {page: "HTTPHistory", fun: "refreshProcess"})
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

    const refreshTags = useMemoizedFn(async () => {
        setTagListLoading(true)
        ipcRenderer
            .invoke("HTTPFlowsFieldGroup", {
                RefreshRequest: true,
                IsAll: true
            })
            .then((rsp: HTTPFlowsFieldGroupResponse) => {
                const tags = (rsp.Tags || []).filter((item) => item.Value)
                const realTags: FiltersItemProps[] = tags.map(({ Value }) => ({
                    label: Value,
                    value: Value,
                }))
                setTagList(realTags)
            })
            .catch((error) => {
                yakitNotify("error", `query HTTP Flows Field Group failed: ${error}`)
            })
            .finally(() => {
                setTagListLoading(false)
            })    
    })

    useEffect(() => {
        if (!inViewport) return
        refreshTags()
    }, [inViewport])

    const refreshAllFilters = useMemoizedFn((clearSelected?: boolean) => {
        if (clearSelected) {
            onSetCurProcess([])
            onSetCurTags?.([])
        }
        refreshProcess()
        refreshTags()
    })

    const renderTagList = useMemo(() => {
        return searchTagVal
            ? tagList.filter((item) => item.label.toLocaleLowerCase().includes(searchTagVal.toLocaleLowerCase()))
            : tagList
    }, [searchTagVal, tagList])


    const onTagItemClick = useMemoizedFn((tag: FiltersItemProps) => {
        const nextTags = curTags.includes(tag.value)
            ? curTags.filter((item) => item !== tag.value)
            : [...curTags, tag.value]
        onSetCurTags?.(nextTags)
    })

    const onSearch = useMemoizedFn((key: HistoryProcessPanelKey) => {
        if (key === "process") {
            setSearchProcessVal(searchValues.process)
        } else {
            setSearchTagVal(searchValues.tag)
        }
    })

    const renderSearchInput = useMemoizedFn((key: HistoryProcessPanelKey) => {
        const hasActiveSearch = key === "process" ? !!searchProcessVal.trim() : !!searchTagVal.trim()
        return (
            <div onClick={(e) => e.stopPropagation()}>
                <YakitPopover
                    overlayClassName={styles["history-process-popover"]}
                    trigger='click'
                    content={
                        <div onKeyPress={(e) => e.stopPropagation()}>
                            <YakitInput
                                placeholder={t("YakitInput.searchKeyWordPlaceholder")}
                                value={searchValues[key]}
                                onChange={(e) => setSearchValues((pre) => ({...pre, [key]: e.target.value}))}
                                onPressEnter={() => {
                                    onSearch(key)
                                }}
                                allowClear
                            />
                        </div>
                    }
                    onVisibleChange={(visible) => !visible && onSearch(key)}
                >
                    <YakitButton icon={<OutlineSearchIcon />} type={hasActiveSearch ? "text" : "text2"}/>
                </YakitPopover>
            </div>               
        )
    })

    const renderPanel = useMemoizedFn((panelItem: {header: string; key: HistoryProcessPanelKey}) => {
        const {header, key} = panelItem
        const loading = key === "tag" ? tagListLoading : processLoading
        const list = key === "tag" ? renderTagList : renderProcessList
        return (
            <YakitPanel
                header={header}
                key={key}
                extra={renderSearchInput(key)}
            >
                {loading ? <YakitSpin style={{ display: 'block'}} /> : list.length ?
                    list.map((item) => {
                        if (key === "tag") {
                            const checked = curTags.includes(item.value)
                            return (
                                <label
                                    className={classNames(styles["list-item"], {
                                        [styles["list-item-active"]]: checked
                                    })}
                                    key={item.value}
                                >
                                    <YakitCheckbox checked={checked} onChange={() => onTagItemClick(item)}>
                                        <span className={styles["list-item-left"]}>
                                            <span className={styles["item-title"]} title={item.label}>
                                                {item.label}
                                            </span>
                                        </span>
                                    </YakitCheckbox>
                                </label>
                            )
                        }

                        const checked = curProcess.includes(item.process)
                        return (
                            <label
                                className={classNames(styles["list-item"], {
                                    [styles["list-item-active"]]: checked
                                })}
                                key={item.process}
                            >
                                <YakitCheckbox checked={checked} onChange={() => onProcessItemClick(item)}>
                                    <span className={styles["list-item-left"]}>
                                        {item.icon ? <span className={styles["item-icon"]}>{item.icon}</span> : null}
                                        <span className={styles["item-title"]} title={item.process}>
                                            {item.process}
                                        </span>
                                    </span>
                                </YakitCheckbox>
                            </label>
                        )
                    }) : <YakitEmpty />}
            </YakitPanel>
        )
    })

    const panelList = useMemo(() => [
        {
            header: t("HTTPHistory.process"),
            key: "process" as HistoryProcessPanelKey
        },
        {
            header: "Tag",
            key: "tag" as HistoryProcessPanelKey
        }
    ], [t])

    return (
        <div className={styles["history-process"]} ref={processRef}>
            <div className={styles["history-process-header"]}>
                <span>{t("YakitTable.filter")}</span> 
                <YakitButton type='text2' icon={<RefreshIcon />} onClick={() => refreshAllFilters(true)} />
            </div>
            <div className={styles["history-process-body"]}>
                <YakitCollapse activeKey={activeKey} onChange={(key) => setActiveKey(key as string[])}>
                    {panelList.map((item) => renderPanel(item))}
                </YakitCollapse>
            </div>
        </div>
    )
})
