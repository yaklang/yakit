import React, {useEffect, useMemo, useRef, useState} from "react"
import "react-resizable/css/styles.css"
import {HTTPFlow, HTTPFlowTable, YakQueryHTTPFlowResponse} from "./HTTPFlowTable/HTTPFlowTable"
import {HTTPFlowDetailMini} from "./HTTPFlowDetail"
import {useDebounceFn, useGetState, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
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

// 使用 HTTPHistory 控件的来源页面
export type HTTPHistorySourcePageType = "MITM" | "History"

export interface HTTPHistoryProp extends HTTPPacketFuzzable {
    websocket?: boolean
    pageType?: HTTPHistorySourcePageType
}

type tabKeys = "web-tree"
type TreeNodeType = "dir" | "file" | "query" | "path"

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
    const treeWrapRef = useRef<any>()
    const [treeWrapHeight, setTreeWrapHeight] = useState<number>(0)
    const [treeLoading, setTreeLoading] = useState<boolean>(true)
    const [webTreeData, setWebTreeData] = useState<TreeNode[]>([])
    const [searchWebTreeData, setSearchWebTreeData] = useState<TreeNode[]>([]) // 搜索框有值时得网站树
    const [searchTreeFlag, setSearchTreeFlag, getSearchTreeFlag] = useGetState<boolean>(false) // 判断是否是搜索树
    const [searchValue, setSearchValue] = useState<string>("")
    const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>([]) // 展开树节点key集合
    const [selectedKeys, setSelectedKeys] = useState<TreeKey[]>([]) // select树节点key集合
    const [hoveredKeys, setHoveredKeys, getHoveredKeys] = useGetState<TreeKey>("") // 定位树节点key
    const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]) // select树节点数据集合
    const [selectedNodeParamsKey, setSelectedNodeParamsKey] = useState<string>("") // 这里只能是字符串（解决不必要渲染问题） 传到HttpFlowTable里面去变数组
    const queryParamsRef = useRef<string>("")

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

    const renderTreeNodeIcon = (treeNodeType: TreeNodeType) => {
        const iconsEle = {
            ["file"]: <OutlineDocumentIcon className='yakitTreeNode-icon' />,
            ["query"]: <OutlineVariableIcon className='yakitTreeNode-icon' />,
            ["path"]: <OutlineLink2Icon className='yakitTreeNode-icon' />
        }
        return iconsEle[treeNodeType] || <></>
    }

    const handleFilterParams = () => {
        console.log("queryParamsRef", queryParamsRef.current)
        return queryParamsRef.current
    }

    const getWebTreeData = (yakurl: string) => {
        const filter = `?params=${handleFilterParams()}`
        setTreeLoading(true)
        getSearchTreeFlag() ? setSearchWebTreeData([]) : setWebTreeData([])
        loadFromYakURLRaw(yakurl + filter, (res) => {
            console.log("exec tree")
            setTreeLoading(false)
            // 判断是否是搜索树
            if (getSearchTreeFlag()) {
                setSearchWebTreeData(assembleFirstTreeNode(res.Resources))
            } else {
                setWebTreeData(assembleFirstTreeNode(res.Resources))
            }
        }).catch((error) => {
            setTreeLoading(false)
            yakitFailed(`加载失败: ${error}`)
        })
    }

    // 树节点第一层组装树
    const assembleFirstTreeNode = (arr) => {
        return arr.map((item: YakURLResource, index: number) => {
            const id = getSearchTreeFlag() ? item.ResourceName : item.VerboseName
            return {
                title: (
                    <span style={{backgroundColor: getHoveredKeys() === id ? "var(--yakit-primary-2)" : undefined}}>
                        {item.VerboseName}
                    </span>
                ),
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

    // 树子节点异步加载组装树
    const onLoadWebTreeData = ({key, children, data}: any) => {
        return new Promise<void>((resolve, reject) => {
            if (data === undefined) {
                reject("node.data is empty")
                return
            }
            const obj = {
                ...data.Url,
                Query: [{Key: "params", Value: handleFilterParams()}]
            }

            requestYakURLList(
                obj,
                (rsp) => {
                    const newNodes: TreeNode[] = rsp.Resources.map((i, index) => {
                        const id = key + "/" + i.ResourceName
                        return {
                            title: (
                                <span
                                    style={{
                                        backgroundColor: getHoveredKeys() === id ? "var(--yakit-primary-2)" : undefined
                                    }}
                                >
                                    {i.VerboseName}
                                </span>
                            ),
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
                    // 判断是否是搜索树
                    if (getSearchTreeFlag()) {
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

    // 搜索树
    const onSearchTree = useMemoizedFn((value: string) => {
        const flag = value === "/" ? false : !!value
        setSearchTreeFlag(flag)
        setHoveredKeys("")
        setExpandedKeys([])
        setSelectedKeys([])
        if (value === "") {
            setSelectedNodes([])
            setOnlyShowFirstNode(true)
            setSecondNodeVisible(false)
        }
        setSearchValue(value)
        getWebTreeData("website://" + `${value ? value : "/"}`)
    })

    const onQueryParams = useMemoizedFn((queryParams, execFlag) => {
        queryParamsRef.current = queryParams

        // 表格点击重置查询条件时 且选中了树节点时
        if (execFlag && selectedNodeParamsKey) {
            refreshTree()
            return
        }

        // 非搜索树&选中树节点 切换表格筛选条件无需刷新树
        if (!searchTreeFlag && !selectedNodeParamsKey) {
            refreshTree()
            return
        }

        // 搜索树时 切换表格筛选条件无需刷新树
        if (searchTreeFlag && !selectedNodeParamsKey) {
            setHoveredKeys("")
            setExpandedKeys([])
            getWebTreeData("website://" + searchValue)
            return
        }
    })

    // 刷新网站树
    const refreshTree = useMemoizedFn(() => {
        setOnlyShowFirstNode(true)
        setSecondNodeVisible(false)
        setSearchValue("")
        setSearchTreeFlag(false)
        setHoveredKeys("")
        setExpandedKeys([])
        setSelectedKeys([])
        setSelectedNodes([])
        getWebTreeData("website:///")
    })

    // 跳转网站树指定节点
    const onJumpWebTree = useMemoizedFn((value) => {
        if (inViewport && curTabKey === "web-tree") {
            const val = JSON.parse(value) // HTTPFlowDetailRequestAndResponse组件发送传过来的数据
            const path = val.path // 需要展开得节点数组
            const host = val.host // TODO 可能得换，后端需要把模糊搜索改掉
            const jumpTreeKey = path[path.length - 1] // 定位节点得key
            setExpandedKeys(path)
            setHoveredKeys(jumpTreeKey)
            setSearchValue(host)
            setSearchTreeFlag(true)
            setSelectedKeys([])
            getWebTreeData("website://" + host)
        }
    })
    useEffect(() => {
        emiter.on("onJumpWebTree", onJumpWebTree)
        return () => {
            emiter.off("onJumpWebTree", onJumpWebTree)
        }
    }, [])

    // 点击Select选中树
    const onSelectedKeys = useMemoizedFn((selectedKeys: TreeKey[], selectedNodes: TreeNode[]) => {
        console.log("selectedNodes", selectedNodes)
        setSelectedKeys(selectedKeys)
        setSelectedNodes(selectedNodes)
        setOnlyShowFirstNode(true)
        setSecondNodeVisible(false)
    })

    useEffect(() => {
        // 假设 selectedNodes 的第一个节点是您想要设置的节点
        const node = selectedNodes[0]
        if (node) {
            const urlItem = node.data?.Extra.find((item) => item.Key === "url")
            if (urlItem && urlItem.Value) {
                try {
                    const url = new URL(urlItem.Value)
                    const selectedParam = url.pathname ? url.pathname : node.data?.Path || ""
                    setSelectedNodeParamsKey(selectedParam)
                } catch (_) {
                    setSelectedNodeParamsKey("")
                    return
                }
            } else {
                setSelectedNodeParamsKey("")
            }
        } else {
            setSelectedNodeParamsKey("")
        }
    }, [selectedNodes]) // 只有当 selectedNodes 改变时才运行

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
                paddingRight: pageType === "History" ? 16 : 0
            }}
        >
            <YakitResizeBox
                isShowDefaultLineStyle={pageType === "History"}
                freeze={pageType === "History" && openTabsFlag}
                firstMinSize={pageType === "History" ? (openTabsFlag ? "325px" : "24px") : 0}
                firstRatio={pageType === "History" ? (openTabsFlag ? "20%" : "24px") : "0px"}
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
                                                handleTabClick(item)
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
                                    <YakitTree
                                        treeLoading={treeLoading}
                                        height={treeWrapHeight - 30}
                                        multiple={false}
                                        searchPlaceholder='请输入域名或URL进行搜索'
                                        treeData={searchTreeFlag ? searchWebTreeData : webTreeData}
                                        loadData={onLoadWebTreeData}
                                        searchValue={searchValue}
                                        onSearch={onSearchTree}
                                        refreshTree={refreshTree}
                                        expandedKeys={expandedKeys}
                                        onExpandedKeys={(expandedKeys: TreeKey[]) => setExpandedKeys(expandedKeys)}
                                        selectedKeys={selectedKeys}
                                        onSelectedKeys={onSelectedKeys}
                                    ></YakitTree>
                                </div>
                            </div>
                        )
                    }
                    return <></>
                }}
                secondMinSize={pageType === "History" ? "720px" : "100%"}
                secondRatio={pageType === "History" ? "80%" : "100%"}
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
                                    searchTreeFlag={searchTreeFlag}
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
