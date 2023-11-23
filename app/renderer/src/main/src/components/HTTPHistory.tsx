import React, {useEffect, useMemo, useRef, useState} from "react"
import "react-resizable/css/styles.css"
import {HTTPFlow, HTTPFlowTable} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {useStore} from "@/store/mitmState"
import {YakQueryHTTPFlowRequest} from "@/utils/yakQueryHTTPFlow"
import {YakitResizeBox} from "./yakitUI/YakitResizeBox/YakitResizeBox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {v4 as uuidv4} from "uuid"
import styles from "./HTTPHistory.module.scss"
import classNames from "classnames"
import YakitTree, {TreeKey, TreeNode} from "./yakitUI/YakitTree/YakitTree"
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif"
import {yakitFailed} from "@/utils/notification"
import {YakURLResource} from "@/pages/yakURLTree/data"
import {RemoteGV} from "@/yakitGV"
import emiter from "@/utils/eventBus/eventBus"
import {
    OutlineDocumentIcon,
    OutlineFolderremoveIcon,
    OutlineLink2Icon,
    OutlineVariableIcon
} from "@/assets/icon/outline"
import {SolidFolderaddIcon} from "@/assets/icon/solid"

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
type TreeNodeType = "dir" | "file" | "query" | "path"

interface HTTPHistoryTabsItem {
    key: tabKeys
    label: string
    contShow: boolean
}

// 使用 HTTPHistory 控件的来源页面
export type HTTPHistorySourcePageType = "MITM" | "History"

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
    useEffect(() => {
        getRemoteValue(RemoteGV.HistoryLeftTabs).then((setting: string) => {
            if (setting) {
                const tabs = JSON.parse(setting)
                setHTTPHistoryTabs(tabs)
                const findItem = tabs.find((item: HTTPHistoryTabsItem) => item.contShow)
                if (findItem) {
                    setCurTabKey(findItem.key)
                }
            }
        })
    }, [])
    const handleTabClick = (item: HTTPHistoryTabsItem) => {
        const copyHTTPHistoryTabs = structuredClone(hTTPHistoryTabs)
        copyHTTPHistoryTabs.forEach((i) => {
            if (i.key === item.key) {
                i.contShow = !item.contShow
            } else {
                i.contShow = false
            }
        })
        setRemoteValue(RemoteGV.HistoryLeftTabs, JSON.stringify(copyHTTPHistoryTabs))
        setHTTPHistoryTabs(copyHTTPHistoryTabs)
        setCurTabKey(item.key)
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
    const [webTreeData, setWebTreeData] = useState<TreeNode[]>([])
    const [searchWebTreeData, setSearchWebTreeData] = useState<TreeNode[]>([]) // 搜索框有值时得网站树
    const [searchValue, setSearchValue] = useState<string>("")
    const [treeLoading, setTreeLoading] = useState<boolean>(false)
    const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>([]) // 展开树节点key集合
    const [selectedKeys, setSelectedKeys] = useState<TreeKey[]>([]) // select树节点key集合
    const [hoveredKeys, setHoveredKeys] = useState<TreeKey>("") // 定位树节点key
    const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]) // select树节点数据集合
    const [selectedNodeParamsKey, setSelectedNodeParamsKey] = useState<string[]>([""])

    const renderTreeNodeIcon = (treeNodeType: TreeNodeType) => {
        const iconsEle = {
            ["file"]: <OutlineDocumentIcon className='yakitTreeNode-icon' />,
            ["query"]: <OutlineVariableIcon className='yakitTreeNode-icon' />,
            ["path"]: <OutlineLink2Icon className='yakitTreeNode-icon' />
        }
        return iconsEle[treeNodeType] || <></>
    }

    useEffect(() => {
        getWebTreeData("website://" + searchValue)
    }, [searchValue]) // 网站树

    const getWebTreeData = async (yakurl: string) => {
        setTreeLoading(true)
        loadFromYakURLRaw(yakurl, (res) => {
            setTreeLoading(false)
            setSelectedKeys([])
            if (!hoveredKeys) {
                setExpandedKeys([])
            }
            if (searchValue) {
                setWebTreeData([])
                setSearchWebTreeData(assembleFirstTreeNode(res.Resources))
            } else {
                setSearchWebTreeData([])
                // 请求第一层数据
                setWebTreeData(assembleFirstTreeNode(res.Resources))
            }
        }).catch((error) => {
            setTreeLoading(false)
            yakitFailed(`加载失败: ${error}`)
        })
    }

    // 树节点第一层组装树
    const assembleFirstTreeNode = (arr) => {
        return arr.map((item: YakURLResource) => {
            const id = searchValue ? item.ResourceName : item.VerboseName
            return {
                title: item.VerboseName,
                key: id,
                isLeaf: !item.HaveChildrenNodes,
                data: item,
                icon: ({expanded}) => {
                    if (item.ResourceType === "dir") {
                        return expanded ? (
                            <OutlineFolderremoveIcon className='yakitTreeNode-icon' />
                        ) : (
                            <SolidFolderaddIcon className='yakitTreeNode-icon' />
                        )
                    }
                    return renderTreeNodeIcon(item.ResourceType as TreeNodeType)
                }
            }
        })
    }

    const refreshChildrenByParent = useMemoizedFn((origin: TreeNode[], parentKey: string, nodes: TreeNode[]) => {
        const arr = origin.map((node) => {
            if (node.key === parentKey) {
                return {
                    ...node,
                    children: nodes
                }
            }
            if (node.children) {
                return {
                    ...node,
                    children: refreshChildrenByParent(node.children, parentKey, nodes)
                }
            }
            return node
        })
        return arr
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
                    const newNodes: TreeNode[] = rsp.Resources.map((i) => {
                        const id = key + "/" + i.ResourceName
                        return {
                            title: i.VerboseName,
                            key: id,
                            isLeaf: !i.HaveChildrenNodes,
                            data: i,
                            icon: ({expanded}) => {
                                if (i.ResourceType === "dir") {
                                    return expanded ? (
                                        <OutlineFolderremoveIcon className='yakitTreeNode-icon' />
                                    ) : (
                                        <SolidFolderaddIcon className='yakitTreeNode-icon' />
                                    )
                                }
                                return renderTreeNodeIcon(i.ResourceType as TreeNodeType)
                            }
                        }
                    })
                    if (searchWebTreeData.length) {
                        setSearchWebTreeData((origin) => refreshChildrenByParent(origin, key, newNodes))
                    } else {
                        setWebTreeData((origin) => refreshChildrenByParent(origin, key, newNodes))
                    }
                    resolve()
                },
                reject
            )
        })
    }

    useEffect(() => {
        // 假设 selectedNodes 的第一个节点是您想要设置的节点
        const node = selectedNodes[0]
        if (node) {
            setSelectedNodeParamsKey([node.data!.ResourceName])
        } else {
            setSelectedNodeParamsKey([])
        }
    }, [selectedNodes]) // 只有当 selectedNodes 改变时才运行

    // 跳转网站树指定节点
    const onJumpWebTree = useMemoizedFn((value) => {
        if (inViewport && curTabKey === "web-tree") {
            const val = JSON.parse(value) // HTTPFlowDetailRequestAndResponse组件发送传过来的数据
            const path = val.path // 需要展开得节点数组
            const jumpTreeKey = path[path.length - 1] // 定位节点得key
            setHoveredKeys(jumpTreeKey)
            setExpandedKeys(path) // 展开树
            // 当是搜索树跳转过来时
            if (searchWebTreeData.length) {
                setSearchValue("")
            }
        }
    })
    useEffect(() => {
        emiter.on("onJumpWebTree", onJumpWebTree)
        return () => {
            emiter.off("onJumpWebTree", onJumpWebTree)
        }
    }, [])

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
            <YakitResizeBox
                isShowDefaultLineStyle={pageType === "history"}
                freeze={pageType === "history" && openTabsFlag}
                firstMinSize={pageType === "history" ? (openTabsFlag ? "325px" : "24px") : 0}
                firstRatio={pageType === "history" ? (openTabsFlag ? "20%" : "24px") : "0px"}
                firstNode={() => {
                    if (pageType === "history") {
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
                                        searchPlaceholder='请输入域名或URL进行搜索'
                                        treeLoading={treeLoading}
                                        treeData={searchWebTreeData.length ? searchWebTreeData : webTreeData}
                                        loadData={onLoadWebTreeData}
                                        searchValue={searchValue}
                                        onSearch={(value) => {
                                            setHoveredKeys("")
                                            setSearchValue(value)
                                        }}
                                        refreshTree={() => {
                                            setSearchValue("")
                                            setExpandedKeys([])
                                            setSelectedKeys([])
                                            setHoveredKeys("")
                                        }}
                                        expandedKeys={expandedKeys}
                                        onExpandedKeys={(expandedKeys: TreeKey[]) => setExpandedKeys(expandedKeys)}
                                        selectedKeys={selectedKeys}
                                        onSelectedKeys={(selectedKeys: TreeKey[], selectedNodes: TreeNode[]) => {
                                            console.log("selectedNodes", selectedNodes)
                                            setSelectedKeys(selectedKeys)
                                            setSelectedNodes(selectedNodes)
                                            setOnlyShowFirstNode(true)
                                            setSecondNodeVisible(false)
                                        }}
                                    ></YakitTree>
                                </div>
                            </div>
                        )
                    }
                    return <></>
                }}
                secondMinSize={pageType === "history" ? "720px" : "100%"}
                secondRatio={pageType === "history" ? "80%" : "100%"}
                secondNode={() => (
                    <YakitResizeBox
                        firstNode={() => (
                            <div
                                style={{
                                    paddingTop: pageType === "history" ? 8 : 0,
                                    paddingLeft: pageType === "history" ? 12 : 0,
                                    height: "100%"
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
                                    searchURL={selectedNodes
                                        .map((node: TreeNode) => {
                                            const urlItem = node.data?.Extra.find((item) => item.Key === "url")
                                            return urlItem ? urlItem.Value : ""
                                        })
                                        .filter((url) => url !== "")
                                        .join(",")}
                                    IncludeInUrl={selectedNodeParamsKey}
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
                )}
            ></YakitResizeBox>
        </div>
    )
}
