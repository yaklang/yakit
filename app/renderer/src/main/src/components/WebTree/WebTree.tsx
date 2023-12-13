import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import YakitTree, {TreeKey} from "../yakitUI/YakitTree/YakitTree"
import type {DataNode} from "antd/es/tree"
import {useGetState, useInViewport, useMemoizedFn} from "ahooks"
import {
    OutlineDocumentIcon,
    OutlineFolderremoveIcon,
    OutlineLink2Icon,
    OutlineVariableIcon
} from "@/assets/icon/outline"
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif"
import {yakitFailed} from "@/utils/notification"
import {YakURLResource} from "@/pages/yakURLTree/data"
import {SolidFolderaddIcon} from "@/assets/icon/solid"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {RefreshIcon} from "@/assets/newIcon"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import styles from "./WebTree.module.scss"

type TreeNodeType = "dir" | "file" | "query" | "path"
export interface TreeNode extends DataNode {
    data?: YakURLResource // 树节点其他额外数据
}

interface WebTreeProp {
    ref?: React.Ref<any>
    schema?: string | "website" | "file" | "behinder" // 默认website
    filePath?: string // 文件路径
    fileQuery?: string // 文件查询参数
    height: number // 树高度 用于虚拟滚动
    searchPlaceholder?: string // 搜索框提示文案
    treeQueryparams: string // 树查询参数是一个json字符串
    refreshTreeFlag?: boolean // 选中树节点后 表格参数改变导致树查询参数改变 是否需要刷新树 默认->不刷新
    onSelectNodes?: (selectedNodes: TreeNode[]) => void // 选中节点得nodes
    onSelectKeys?: (selectedKeys: TreeKey[]) => void // 选中节点得keys
    onGetUrl?: (searchURL: string, includeInUrl: string) => void // 获取选中后节点得url信息 用于表格查询
    resetTableAndEditorShow?: (table: boolean, editor: boolean) => void // 重置 表格显示-编辑器不显示
}

/**
 * 该树暂不支持复选框 select选中只支持单选
 * 文件树暂时不支持搜索文件功能
 */
export const WebTree: React.FC<WebTreeProp> = React.forwardRef((props, ref) => {
    const {
        height,
        schema = "website",
        filePath = "",
        fileQuery = "",
        searchPlaceholder = "请输入关键词搜索",
        treeQueryparams,
        refreshTreeFlag = false,
        onSelectNodes,
        onSelectKeys,
        onGetUrl,
        resetTableAndEditorShow
    } = props
    const [treeLoading, setTreeLoading] = useState<boolean>(true)
    const [webTreeData, setWebTreeData] = useState<TreeNode[]>([])
    const [searchWebTreeData, setSearchWebTreeData] = useState<TreeNode[]>([]) // 搜索框有值时得网站树
    const [searchTreeFlag, setSearchTreeFlag, getSearchTreeFlag] = useGetState<boolean>(false) // 判断是否是搜索树
    const [searchValue, setSearchValue] = useState<string>("")
    const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>([]) // 展开树节点key集合
    const [selectedKeys, setSelectedKeys] = useState<TreeKey[]>([]) // select树节点key集合
    const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]) // select树节点数据集合
    const webTreeRef = useRef<any>()
    const [inViewport] = useInViewport(webTreeRef)

    useImperativeHandle(ref, () => ({
        onJumpWebTree
    }))

    const renderTreeNodeIcon = (treeNodeType: TreeNodeType) => {
        const iconsEle = {
            ["file"]: <OutlineDocumentIcon className='yakitTreeNode-icon' />,
            ["query"]: <OutlineVariableIcon className='yakitTreeNode-icon' />,
            ["path"]: <OutlineLink2Icon className='yakitTreeNode-icon' />
        }
        return iconsEle[treeNodeType] || <></>
    }

    const handleFilterParams = () => {
        return treeQueryparams
    }

    const getTreeData = (yakurl: string) => {
        // 由于这里会有闭包 30毫秒后再掉接口
        setTreeLoading(true)
        setTimeout(() => {
            let search = ""
            if (getSearchTreeFlag()) {
                setSearchWebTreeData([])
                search = `&search=${1}`
            } else {
                setWebTreeData([])
            }
            const extraInfo = {
                website: `?params=${handleFilterParams()}` + search
            }
            loadFromYakURLRaw(yakurl + `${extraInfo[schema] || ""}`, (res) => {
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
            const idObj = {
                website: item.VerboseName,
                behinder: item.Path
            }

            return {
                title: item.VerboseName,
                key: idObj[schema],
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

            const url = {
                ...data.Url
            }
            if (schema === "website") {
                url.Query = [{Key: "params", Value: handleFilterParams()}]
                if (key.startsWith("https://")) {
                    url.Query.push({Key: "schema", Value: "https"})
                } else if (key.startsWith("http://")) {
                    url.Query.push({Key: "schema", Value: "http"})
                }
            }

            requestYakURLList(
                {url},
                (rsp) => {
                    const newNodes: TreeNode[] = rsp.Resources.map((i, index) => {
                        const idObj = {
                            website: key + "/" + i.ResourceName,
                            behinder: i.Path
                        }
                        return {
                            title: i.VerboseName,
                            key: idObj[schema],
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
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
        setSearchValue(val)
        getTreeData(schema + "://" + `${val ? val : "/"}`)
    })

    useEffect(() => {
        if (selectedKeys.length) {
            if (refreshTreeFlag) {
                if (searchTreeFlag) {
                    setSelectedKeys([])
                    setSelectedNodes([])
                    setExpandedKeys([])
                    getTreeData(schema + "://" + searchValue)
                } else {
                    refreshTree()
                }
            }
        } else {
            if (searchTreeFlag) {
                setExpandedKeys([])
                setSelectedNodes([])
                getTreeData(schema + "://" + searchValue)
            } else {
                refreshTree()
            }
        }
    }, [treeQueryparams, refreshTreeFlag, inViewport])

    // 刷新网站树
    const refreshTree = useMemoizedFn(() => {
        // 当表格查询参数带搜索条件时
        if (selectedNodes.length) {
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
        setSearchValue("")
        setSearchTreeFlag(false)
        setExpandedKeys([])
        setSelectedKeys([])
        setSelectedNodes([])
        const yakUrl = {
            website: schema + ":///",
            behinder: schema + ":///" + filePath + "?" + fileQuery
        }
        getTreeData(yakUrl[schema])
    })

    // 网站树跳转 -> 带到搜索框查询
    const onJumpWebTree = (value: string) => {
        setSearchTreeFlag(true)
        setSelectedKeys([])
        setSearchValue(value)
        getTreeData(schema + "://" + value)
    }

    // 点击Select选中树
    const onSelectedKeys = useMemoizedFn(
        (
            selectedKeys: TreeKey[],
            info: {
                selectedNodes: TreeNode[]
            }
        ) => {
            setSelectedKeys(selectedKeys)
            setSelectedNodes(info.selectedNodes)
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
    )

    useEffect(() => {
        onSelectNodes && onSelectNodes(selectedNodes)
        const node = selectedNodes[0]
        if (node) {
            console.log("node", node)
            const urlItem = node.data?.Extra.find((item) => item.Key === "url")
            if (urlItem && urlItem.Value) {
                try {
                    const url = new URL(urlItem.Value)
                    // 获取 URL 的查询字符串（不包括 '?'）
                    const query = url.search.substring(1)
                    onGetUrl && onGetUrl(url.origin + url.pathname, query ? `${query}` : "")
                } catch (_) {
                    onGetUrl && onGetUrl("", "")
                }
            } else {
                onGetUrl && onGetUrl("", "")
            }
        } else {
            onGetUrl && onGetUrl("", "")
        }
    }, [selectedNodes])

    useEffect(() => {
        onSelectKeys && onSelectKeys(selectedKeys)
    }, [selectedKeys])

    /**
     * 计算树头部高度
     */
    const treeTopWrapRef = useRef<any>()
    const [treeTopWrapHeight, setTreeTopWrapHeight] = useState<number>(0)
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        entries.forEach((entry) => {
            const target = entry.target
            setTreeTopWrapHeight(target.getBoundingClientRect().height)
        })
    })
    useEffect(() => {
        if (treeTopWrapRef.current) {
            resizeObserver.observe(treeTopWrapRef.current)
        }
    }, [treeTopWrapRef.current])

    // 搜索框
    const onSearchChange = useMemoizedFn((e: {target: {value: string}}) => {
        const value = e.target.value
        setSearchValue(value)
    })

    return (
        <div className={styles.webTree} ref={webTreeRef}>
            {/* 文件树 不要搜索框和刷新按钮 */}
            {schema === "website" && (
                <div className={styles["tree-top-wrap"]} ref={treeTopWrapRef}>
                    <YakitInput.Search
                        style={{marginBottom: 15, width: "calc(100% - 40px)"}}
                        placeholder={searchPlaceholder}
                        allowClear
                        onChange={onSearchChange}
                        onSearch={onSearchTree}
                        value={searchValue}
                    />
                    <YakitButton type='text2' icon={<RefreshIcon />} onClick={refreshTree} style={{marginBottom: 15}} />
                </div>
            )}
            <div className={styles["tree-wrap"]}>
                {treeLoading ? (
                    <YakitSpin />
                ) : (
                    <YakitTree
                        height={height !== undefined ? height - treeTopWrapHeight : undefined}
                        multiple={false}
                        treeData={searchTreeFlag ? searchWebTreeData : webTreeData}
                        loadData={onLoadWebTreeData}
                        expandedKeys={expandedKeys}
                        onExpand={(expandedKeys: TreeKey[]) => setExpandedKeys(expandedKeys)}
                        selectedKeys={selectedKeys}
                        onSelect={onSelectedKeys}
                    ></YakitTree>
                )}
            </div>
        </div>
    )
})
