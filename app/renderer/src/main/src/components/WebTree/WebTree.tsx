import React, {useEffect, useImperativeHandle, useState} from "react"
import YakitTree, {TreeKey, TreeNode} from "../yakitUI/YakitTree/YakitTree"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
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

type TreeNodeType = "dir" | "file" | "query" | "path"

interface WebTreeProp {
    ref?: React.Ref<any>
    treeInViewport?: boolean // 树是否在当前页面
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
 * 该网站树暂不支持复选框 select选中只支持单选
 */
export const WebTree: React.FC<WebTreeProp> = React.forwardRef((props, ref) => {
    const {
        height,
        searchPlaceholder,
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
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
        setSearchValue(val)
        getTreeData("website://" + `${val ? val : "/"}`)
    })

    useEffect(() => {
        if (selectedKeys.length) {
            if (refreshTreeFlag) {
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
    }, [treeQueryparams, refreshTreeFlag])

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
        getTreeData("website:///")
    })

    // 网站树跳转 -> 带到搜索框查询
    const onJumpWebTree = (value: string) => {
        setSearchTreeFlag(true)
        setSelectedKeys([])
        setSearchValue(value)
        getTreeData("website://" + value)
    }

    // 点击Select选中树
    const onSelectedKeys = useMemoizedFn((selectedKeys: TreeKey[], selectedNodes: TreeNode[]) => {
        setSelectedKeys(selectedKeys)
        setSelectedNodes(selectedNodes)
        resetTableAndEditorShow && resetTableAndEditorShow(true, false)
    })

    useEffect(() => {
        onSelectNodes && onSelectNodes(selectedNodes)
        const node = selectedNodes[0]
        if (node) {
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

    return (
        <YakitTree
            treeLoading={treeLoading}
            height={height}
            multiple={false}
            searchPlaceholder={searchPlaceholder}
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
    )
})
