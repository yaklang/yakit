import React, {useEffect, useRef, useState} from "react"
import type {DataNode as TreeNode} from "antd/es/tree"
import "react-resizable/css/styles.css"
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {AutoCard} from "./AutoCard"
import {useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {useStore} from "@/store/mitmState"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {YakitResizeBox} from "./yakitUI/YakitResizeBox/YakitResizeBox"
import {getRemoteValue} from "@/utils/kv"
import {v4 as uuidv4} from "uuid"
import styles from "./HTTPHistory.module.scss"
import classNames from "classnames"
import YakitTree, {TreeKey} from "./yakitUI/YakitTree/YakitTree"
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif"
import {yakitFailed} from "@/utils/notification"
import {YakURLResource} from "@/pages/yakURLTree/data"

export interface HTTPPacketFuzzable {
    defaultHttps?: boolean
    sendToWebFuzzer?: boolean | (() => any) | ((isHttps: boolean, request: string) => any)
    defaultPacket?: string
}

export interface HTTPHistoryProp extends HTTPPacketFuzzable {
    websocket?: boolean
    pageType?: "MITM" | "history"
}

type tabKeys = "web-tree"
interface HTTPHistoryTabsItem {
    key: tabKeys
    label: string
    contShow: boolean
}

export const HTTPHistory: React.FC<HTTPHistoryProp> = (props) => {
    const {pageType} = props
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
            if (!result) setDefaultFold(false)
            try {
                const foldResult: boolean = JSON.parse(result)
                setDefaultFold(foldResult)
            } catch (e) {
                setDefaultFold(false)
            }
        })
    }, [])

    /**
     * 左侧tab部分
     */
    const [hTTPHistoryTabs, setHTTPHistoryTabs] = useState<Array<HTTPHistoryTabsItem>>([
        {
            key: "web-tree",
            label: "网站树",
            contShow: false // 初始为false
        }
    ])
    const [curTabKey, setCurTabKey] = useState<tabKeys>("web-tree")
    const handleTabClick = (item: HTTPHistoryTabsItem) => {
        const copyHTTPHistoryTabs = structuredClone(hTTPHistoryTabs)
        copyHTTPHistoryTabs.forEach((i) => {
            if (i.key === item.key) {
                i.contShow = !item.contShow
            } else {
                i.contShow = false
            }
        })
        setHTTPHistoryTabs(copyHTTPHistoryTabs)
        setCurTabKey(item.key)
    }
    const tabContItemShow = (key: tabKeys) => {
        return curTabKey === key && hTTPHistoryTabs.find((item) => item.key === curTabKey)?.contShow
    }

    /**
     * 网站树
     */
    const [webTreeData, setWebTreeData] = useState<TreeNode[]>([])
    const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]) // select树节点数据集合

    const [yakurl, setYakURL] = useState<string>("website:///")
    useEffect(() => {
        if (!yakurl) {
            return
        }
        getWebTreeData(yakurl)
    }, [yakurl])

    const getWebTreeData = async (yakurl: string) => {
        try {
            const res = await loadFromYakURLRaw(yakurl)
            setWebTreeData(
                res.Resources.map((item: YakURLResource, index: number) => {
                    return {
                        title: item.VerboseName,
                        key: index + "",
                        isLeaf: !item.HaveChildrenNodes,
                        data: item
                    }
                })
            )

            // 初始化若检索到树-网站树tab自动打开，反之不打开
            // 若搜索出来的树没有值，不关闭网站树tab
            const copyHTTPHistoryTabs = structuredClone(hTTPHistoryTabs)
            copyHTTPHistoryTabs.forEach((i) => {
                if (i.key === "web-tree") {
                    i.contShow = i.contShow || !!res.Resources.length
                }
            })
            setHTTPHistoryTabs(copyHTTPHistoryTabs)
        } catch (error) {
            yakitFailed(`加载失败: ${error}`)
        }
    }

    const refreshChildrenByParent = useMemoizedFn((parentKey: string, nodes: TreeNode[]) => {
        const pathsBlock: string[] = parentKey.split("-")
        const paths: string[] = pathsBlock.map((_, index) => {
            return pathsBlock.slice(undefined, index + 1).join("-")
        })

        function visitData(d: TreeNode[], depth: number) {
            if (depth + 1 > paths.length) {
                return
            }
            d.forEach((i) => {
                if (i.key !== paths[depth]) {
                    return
                }

                if (depth + 1 !== paths.length) {
                    visitData(i.children || [], depth + 1)
                    return
                }
                i.children = nodes
            })
        }

        visitData(webTreeData, 0)
        return webTreeData
    })

    const onLoadWebTreeData = ({key, children, data}: any) => {
        return new Promise<void>((resolve, reject) => {
            if (data === undefined) {
                reject("node.data is empty")
                return
            }

            requestYakURLList(
                data.Url,
                (rsp) => {
                    const newNodes: TreeNode[] = rsp.Resources.map((i, index) => {
                        return {
                            title: i.VerboseName,
                            key: `${key}-${index}`,
                            isLeaf: !i.HaveChildrenNodes,
                            data: i
                        }
                    })
                    setWebTreeData([...refreshChildrenByParent(key, newNodes)])
                    resolve()
                },
                reject
            )
        })
    }

    // 编辑器部分是否显示
    const [secondNodeVisible, setSecondNodeVisible] = useState<boolean>(false)
    useEffect(() => {
        setSecondNodeVisible(!onlyShowFirstNode && typeof defaultFold === "boolean")
    }, [onlyShowFirstNode, defaultFold])

    return (
        <div
            ref={ref}
            className={styles.hTTPHistory}
            style={{
                paddingBottom: pageType === "history" ? 13 : 0,
                paddingRight: pageType === "history" ? 16 : 0
            }}
        >
            <AutoCard bodyStyle={{margin: 0, padding: 0, overflow: "hidden"}} bordered={false}>
                <YakitResizeBox
                    firstNode={() => (
                        <div className={styles["hTTPHistory-firstNode-wrap"]}>
                            {pageType === "history" && (
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
                                                    handleTabClick(item)
                                                }}
                                            >
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                    <div
                                        className={classNames(styles["hTTPHistory-tab-cont-item"], styles["tree-wrap"])}
                                        style={{display: tabContItemShow("web-tree") ? "block" : "none"}}
                                    >
                                        <YakitTree
                                            multiple={false}
                                            treeData={webTreeData}
                                            loadData={onLoadWebTreeData}
                                            onSelectedKeys={(selectedKeys: TreeKey[], selectedNodes: TreeNode[]) => {
                                                setSelectedNodes(selectedNodes)
                                                setOnlyShowFirstNode(true)
                                                setSecondNodeVisible(false)
                                            }}
                                            onSearchValue={(value) => {
                                                setYakURL("website:///" + value)
                                            }}
                                            refreshTree={() => getWebTreeData("website:///")}
                                        ></YakitTree>
                                    </div>
                                </div>
                            )}
                            <div
                                className={styles["hTTPHistory-table"]}
                                style={{
                                    width:
                                        pageType === "history"
                                            ? `calc(100% - ${
                                                  hTTPHistoryTabs.some((item) => item.contShow) ? 344 : 24
                                              }px)`
                                            : "100%",
                                    paddingTop: pageType === "history" ? 8 : 0,
                                    paddingLeft: pageType === "history" ? 16 : 0
                                }}
                            >
                                <HTTPFlowTable
                                    noHeader={true}
                                    params={
                                        props?.websocket
                                            ? ({
                                                  OnlyWebsocket: true
                                              } as YakQueryHTTPFlowRequest)
                                            : undefined
                                    }
                                    searchURL={selectedNodes.map((item) => item.title).join(",")}
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
                                />
                            </div>
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
                                        pageType={pageType}
                                        historyId={historyId}
                                        // defaultHeight={detailHeight}
                                    />
                                </div>
                            )}
                        </>
                    )}
                />
            </AutoCard>
        </div>
    )
}
