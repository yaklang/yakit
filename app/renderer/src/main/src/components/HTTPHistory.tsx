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
    const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]) // select树节点数据集合
    const [selectedNodePath, setSelectedNodePath] = useState<string>("") // 这里只能是字符串（解决不必要渲染问题） 传到HttpFlowTable里面去变数组
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
        // console.log("queryParamsRef", queryParamsRef.current)
        return queryParamsRef.current
    }

    const getTreeData = (yakurl: string) => {
        // 由于这里会有闭包 30毫秒后再掉接口
        setTreeLoading(true)
        setTimeout(() => {
            let search = ""
            if (getSearchTreeFlag()) {
                setSearchWebTreeData([])
                search = `&search=${1}`
                console.log("search", search)
            } else {
                setWebTreeData([])
            }
            
            loadFromYakURLRaw(yakurl + `?params=${handleFilterParams()}` + search, (res) => {
                // 判断是否是搜索树
                if (getSearchTreeFlag()) {
                    setSearchWebTreeData(assembleFirstTreeNode(res.Resources))
                } else {
                    setWebTreeData(assembleFirstTreeNode(res.Resources))
                }
                setTimeout(() => {
                    setTreeLoading(false)
                }, 50)
            }).catch((error) => {
                setTreeLoading(false)
                yakitFailed(`加载失败: ${error}`)
            })
        }, 30)
    }

    // 树节点第一层组装树
    const assembleFirstTreeNode = (arr) => {
        return arr.map((item: YakURLResource, index: number) => {
            const id = item.VerboseName
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
            if (key.startsWith("https://")) {
                obj.Query.push({Key: "schema", Value: "https"})
            } else if (key.startsWith("http://")) {
                obj.Query.push({Key: "schema", Value: "http"})
            }

            requestYakURLList(
                obj,
                (rsp) => {
                    const newNodes: TreeNode[] = rsp.Resources.map((i, index) => {
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
        const val = value.trim()
        const flag = val === "/" ? false : !!val.trim()
        setSearchTreeFlag(flag)
        setExpandedKeys([])
        setSelectedKeys([])
        if (val === "" && selectedNodes.length) {
            setSelectedNodes([])
            setOnlyShowFirstNode(true)
            setSecondNodeVisible(false)
        }
        setSearchValue(val)
        getTreeData("website://" + `${val ? val : "/"}`)
    })

    const onQueryParams = useMemoizedFn((queryParams, execFlag) => {
        queryParamsRef.current = queryParams
        if (selectedKeys.length) {
            if (execFlag) {
                if (searchTreeFlag) {
                    setSelectedKeys([])
                    setSelectedNodes([])
                    setExpandedKeys([])
                    getTreeData("website://" + searchValue)
                } else {
                    refreshTree()
                }
            }
        } else {
            if (searchTreeFlag) {
                setExpandedKeys([])
                setSelectedNodes([])
                getTreeData("website://" + searchValue)
            } else {
                refreshTree()
            }
        }
    })

    // 刷新网站树
    const refreshTree = useMemoizedFn(() => {
        // 当表格查询参数带搜索条件时
        if (selectedNodes.length) {
            setOnlyShowFirstNode(true)
            setSecondNodeVisible(false)
        }
        setSearchValue("")
        setSearchTreeFlag(false)
        setExpandedKeys([])
        setSelectedKeys([])
        setSelectedNodes([])
        getTreeData("website:///")
    })

    // 跳转网站树指定节点
    const onJumpWebTree = useMemoizedFn((value) => {
        if (inViewport && curTabKey === "web-tree") {
            const val = JSON.parse(value) // HTTPFlowDetailRequestAndResponse组件发送传过来的数据
            const host = val.host
            setSearchTreeFlag(true)
            setSelectedKeys([])
            setSearchValue(host)
            getTreeData("website://" + host)
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
        // console.log("selectedNodes", selectedNodes)
        setSelectedKeys(selectedKeys)
        setSelectedNodes(selectedNodes)
        setOnlyShowFirstNode(true)
        setSecondNodeVisible(false)
    })

    useEffect(() => {
        // 假设 selectedNodes 的第一个节点是您想要设置的节点
        const node = selectedNodes[0]
        if (node) {
            console.log("node", node)
            const urlItem = node.data?.Extra.find((item) => item.Key === "url")
            if (urlItem && urlItem.Value) {
                try {
                    const url = new URL(urlItem.Value)
                    // 获取 URL 的查询字符串（不包括 '?'）
                    const query = url.search.substring(1)
                    // 如果存在查询参数
                    const selectedParam = query ? `${query}` : ""
                    setSelectedNodePath(selectedParam)
                } catch (_) {
                    setSelectedNodePath("")
                    return
                }
            } else {
                setSelectedNodePath("")
            }
        } else {
            setSelectedNodePath("")
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
                                        searchPlaceholder='请输入域名进行搜索，例baidu.com'
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
                                            if (urlItem && urlItem.Value) {
                                                // 解析 URL
                                                const url = new URL(urlItem.Value)
                                                // 返回不包含查询参数的完整 URL
                                                return url.origin + url.pathname
                                            } else {
                                                // 如果没有找到相应的项或者项没有 Value 属性
                                                return ""
                                            }
                                        })
                                        .filter((url) => url !== "")
                                        .join(",")}
                                    IncludeInUrl={selectedNodePath}
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
