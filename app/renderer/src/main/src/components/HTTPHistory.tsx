import React, {ReactElement, useEffect, useMemo, useRef, useState} from "react"
import "react-resizable/css/styles.css"
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {useDebounceEffect, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {useStore} from "@/store/mitmState"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {YakitResizeBox} from "./yakitUI/YakitResizeBox/YakitResizeBox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {v4 as uuidv4} from "uuid"
import styles from "./HTTPHistory.module.scss"
import classNames from "classnames"
import {RemoteGV} from "@/yakitGV"
import emiter from "@/utils/eventBus/eventBus"
import {WebTree} from "./WebTree/WebTree"
import {OutlineLog2Icon} from "@/assets/icon/outline"
import { MITMConsts } from "@/pages/mitm/MITMConsts"

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: boolean | (() => any) | ((isHttps: boolean, request: string) => any)
    defaultPacket?: string
    downstreamProxyStr?: string
}

// 使用 HTTPHistory 控件的来源页面
export type HTTPHistorySourcePageType = "MITM" | "History"

export interface HTTPHistoryProp extends HTTPPacketFuzzable {
    pageType?: HTTPHistorySourcePageType
    params?: YakQueryHTTPFlowRequest
}

type tabKeys = "web-tree"

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

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const {pageType, downstreamProxyStr, params} = props
    const ref = useRef(null)
    const [inViewport] = useInViewport(ref)
    const {isRefreshHistory, setIsRefreshHistory} = useStore()
    // 控制刷新数据
    const [refresh, setRefresh] = useState<boolean>(false)
    const [selected, setSelectedHTTPFlow] = useState<HTTPFlow>()
    const [highlightSearch, setHighlightSearch] = useState("")
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useState<boolean>(true)
    // History Id 用于区分每个history控件
    const [historyId, setHistoryId] = useState<string>(uuidv4())
    useUpdateEffect(() => {
        if (isRefreshHistory) {
            setRefresh(!refresh)
            setIsRefreshHistory(false)
        }
    }, [inViewport])

    const [defaultFold, setDefaultFold] = useState<boolean>()
    useEffect(() => {
        getRemoteValue("HISTORY_FOLD").then((result: string) => {
            if (!result) setDefaultFold(true)
            try {
                const foldResult: boolean = JSON.parse(result)
                setDefaultFold(foldResult)
            } catch (e) {
                setDefaultFold(true)
            }
        })
    }, [])

    const [downstreamProxy, setDownstreamProxy] = useState<string>(downstreamProxyStr || "")
    useDebounceEffect(
        () => {
            if (inViewport) {
                getRemoteValue(MITMConsts.MITMDefaultDownstreamProxyHistory).then((res) => {
                    if (pageType === "History" && res) {
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

    /**
     * 左侧tab部分
     */
    const [hTTPHistoryTabs, setHTTPHistoryTabs] = useState<Array<HTTPHistoryTabsItem>>([
        {
            key: "web-tree",
            label: (
                <>
                    <OutlineLog2Icon /> 网站树
                </>
            ),
            contShow: false // 初始为false
        }
    ])
    const [curTabKey, setCurTabKey] = useState<tabKeys>("web-tree")
    useEffect(() => {
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
    }, [])
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
        return hTTPHistoryTabs.every((item) => item.contShow)
    }, [hTTPHistoryTabs])

    /**
     * 网站树
     */
    const webTreeRef = useRef<any>()
    const treeWrapRef = useRef<any>()
    const [treeWrapHeight, setTreeWrapHeight] = useState<number>(0)
    const [searchURL, setSearchURL] = useState<string>("")
    const [includeInUrl, setIncludeInUrl] = useState<string>("")
    const [treeQueryparams, setTreeQueryparams] = useState<string>("")
    const [refreshTreeFlag, setRefreshTreeFlag] = useState<boolean>(false)

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
        emiter.on("onHistoryJumpWebTree", onJumpWebTree)
        return () => {
            emiter.off("onHistoryJumpWebTree", onJumpWebTree)
        }
    }, [])

    // 表格参数改变
    const onQueryParams = useMemoizedFn((queryParams, execFlag) => {
        setTreeQueryparams(queryParams)
        setRefreshTreeFlag(!!execFlag)
    })

    // 编辑器部分是否显示
    const [secondNodeVisible, setSecondNodeVisible] = useState<boolean>(false)
    useEffect(() => {
        setSecondNodeVisible(!onlyShowFirstNode)
    }, [onlyShowFirstNode])

    return (
        <div
            ref={ref}
            className={styles.hTTPHistory}
            style={{
                paddingRight: pageType === "History" ? 16 : 0
            }}
        >
            <YakitResizeBox
                isShowDefaultLineStyle={pageType === "History"}
                freeze={pageType === "History" && openTabsFlag}
                isRecalculateWH={pageType === "History" ? openTabsFlag : true}
                firstMinSize={pageType === "History" ? (openTabsFlag ? "325px" : "24px") : 0}
                firstRatio={pageType === "History" ? (openTabsFlag ? "30%" : "24px") : "0px"}
                firstNode={() => {
                    if (pageType === "History") {
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
                                        refreshTreeFlag={refreshTreeFlag}
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
                            </div>
                        )
                    }
                    return <></>
                }}
                secondMinSize={pageType === "History" ? "720px" : "100%"}
                secondRatio={pageType === "History" ? "70%" : "100%"}
                secondNode={() => (
                    <YakitResizeBox
                        style={{paddingBottom: pageType === "History" ? 13 : 0}}
                        firstNode={() => (
                            <div
                                style={{
                                    paddingTop: pageType === "History" ? 8 : 0,
                                    paddingLeft: pageType === "History" ? 12 : 0,
                                    height: "100%"
                                }}
                            >
                                <HTTPFlowTable
                                    noHeader={true}
                                    params={params}
                                    searchURL={searchURL}
                                    includeInUrl={includeInUrl}
                                    // tableHeight={200}
                                    // tableHeight={selected ? 164 : undefined}
                                    onSelected={(i) => {
                                        setSelectedHTTPFlow(i)
                                    }}
                                    paginationPosition={"topRight"}
                                    onSearch={setHighlightSearch}
                                    onlyShowFirstNode={onlyShowFirstNode}
                                    setOnlyShowFirstNode={setOnlyShowFirstNode}
                                    refresh={refresh}
                                    pageType={pageType}
                                    historyId={historyId}
                                    onQueryParams={onQueryParams}
                                    inViewport={inViewport}
                                    downstreamProxyStr={downstreamProxy}
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
                                            defaultHttps={selected?.IsHTTPS}
                                            Tags={selected?.Tags}
                                            sendToWebFuzzer={true}
                                            selectedFlow={selected}
                                            refresh={refresh}
                                            defaultFold={defaultFold}
                                            historyId={historyId}
                                            downstreamProxyStr={downstreamProxy}
                                            // defaultHeight={detailHeight}
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
