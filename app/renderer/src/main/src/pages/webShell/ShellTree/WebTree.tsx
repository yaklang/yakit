import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import YakitTree, {TreeKey} from "@/components/yakitUI/YakitTree/YakitTree"
import type {DataNode} from "antd/es/tree"
import {useGetState, useInViewport, useMemoizedFn} from "ahooks"
import {
    OutlineChevrondownIcon,
    OutlineDocumentIcon,
    OutlineFolderremoveIcon,
    OutlineLink2Icon,
    OutlineVariableIcon
} from "@/assets/icon/outline"
import {loadFromYakURLRaw, requestYakURLList} from "../yakURLTree/netif"
import {yakitFailed} from "@/utils/notification"
import {YakURL, YakURLResource} from "../yakURLTree/data"
import {SolidFolderIcon, SolidFolderaddIcon, SolidFolderopenIcon} from "@/assets/icon/solid"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {RefreshIcon} from "@/assets/newIcon"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import styles from "@/components/WebTree/WebTree.module.scss"
import path from "path"
import emiter from "@/utils/eventBus/eventBus"
type TreeNodeType = "dir" | "file" | "query" | "path"

export interface TreeNode extends DataNode {
    data?: YakURLResource // 树节点其他额外数据
}

interface WebTreeProp {
    ref?: React.Ref<any>
    schema?: string | "website" | "file" | "behinder" | "godzilla" // 默认website
    searchVal?: string // 搜索树值
    searchYakURL?: YakURL // 搜索树yakurl
    height: number // 树高度 用于虚拟滚动
    searchPlaceholder?: string // 搜索框提示文案
    treeQueryparams?: string // 树查询参数是一个json字符串
    refreshTreeWithSearchVal?: boolean // 是否带搜索条件刷新树
    refreshTreeFlag?: boolean // 选中树节点后 表格参数改变导致树查询参数改变 是否需要刷新树 默认->不刷新
    onSelectNodes?: (selectedNodes?: TreeNode[]) => void // 选中节点得nodes
    onSelectKeys?: (selectedKeys: TreeKey[]) => void // 选中节点得keys
    onGetUrl?: (searchURL: string, includeInUrl: string) => void // 获取选中后节点得url信息 用于表格查询 website树有用
    resetTableAndEditorShow?: (table: boolean, editor: boolean) => void // 重置 表格显示-编辑器不显示
    isExtendTree?: boolean
}

/**
 * 该树暂不支持复选框 select选中只支持单选
 * 文件树暂时不支持搜索文件功能
 */
export const WebTree: React.FC<WebTreeProp> = React.forwardRef((props, ref) => {
    const {
        height,
        searchVal = "",
        searchYakURL,
        refreshTreeWithSearchVal = false,
        schema = "website",
        searchPlaceholder = "请输入关键词搜索",
        treeQueryparams = "",
        refreshTreeFlag = false,
        onSelectNodes,
        onSelectKeys,
        onGetUrl,
        resetTableAndEditorShow,
        isExtendTree
    } = props
    const [treeLoading, setTreeLoading] = useState<boolean>(true)
    const [defaultWebTreeData, setDefaultWebTreeData, getDefaultWebTreeData] = useGetState<TreeNode[]>([]) // 默认网站树
    const [webTreeData, setWebTreeData] = useState<TreeNode[]>([])
    const [searchWebTreeData, setSearchWebTreeData] = useState<TreeNode[]>([]) // 搜索框有值时得网站树
    const [searchTreeFlag, setSearchTreeFlag, getSearchTreeFlag] = useGetState<boolean>(!!searchVal.length) // 判断是否是搜索树
    const [searchValue, setSearchValue] = useState<string>("")
    const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>([]) // 展开树节点key集合
    const [selectedKeys, setSelectedKeys] = useState<TreeKey[]>([]) // select树节点key集合
    const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]) // select树节点数据集合
    const webTreeRef = useRef<any>()
    const [inViewport] = useInViewport(webTreeRef)

    const renderTreeNodeIcon = (treeNodeType: TreeNodeType) => {
        const iconsEle = {
            ["file"]: <OutlineDocumentIcon className='yakitTreeNode-icon' />,
            ["query"]: <OutlineVariableIcon className='yakitTreeNode-icon' />,
            ["path"]: <OutlineLink2Icon className='yakitTreeNode-icon' />
        }
        return iconsEle[treeNodeType] || <></>
    }

    useEffect(() => {
        emiter.on("onWebShellBackTree", goBack)
        return () => {
            emiter.off("onWebShellBackTree", goBack)
        }
    }, [])

    // 根据名称寻找node
    const getNodeByFileName = useMemoizedFn((tree, name) => {
        if (tree?.title === name) return tree
        else {
            if (Array.isArray(tree.children) && tree.children.length > 0) {
                return getNodeByFileName(tree.children[0], name)
            } else {
                return null
            }
        }
    })

    // 返回上一级
    const goBack = useMemoizedFn(() => {
        const parts = searchValue.split("\\")
        const parentDirectory = parts.slice(0, -1).join("\\")
        setSearchValue(parentDirectory)
        const lastIndex = parentDirectory.lastIndexOf("\\")
        const fileName = parentDirectory.substring(lastIndex + 1)
        if (getDefaultWebTreeData().length > 0) {
            const node = getNodeByFileName(getDefaultWebTreeData()[0], fileName)
            if (node) {
                onLoadWebTreeData(node, true)
                setSelectedKeys([node.key])
            }
        }
    })

    const getTreeData = (path: string) => {
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
            if (searchYakURL) {
                const newSearchYakURL: YakURL = {
                    ...searchYakURL,
                    Query: searchYakURL.Query.map((i) => {
                        if (i.Key === "path") {
                            return {
                                Key: "path",
                                Value: path
                            }
                        }
                        return i
                    })
                }

                requestYakURLList({url: newSearchYakURL, method: "GET"}, (res) => {
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
            }
        }, 30)
    }
    const cacheExpanded = useRef<TreeKey[]>([])
    const addChildrenToBinNode = (tree, binContents) => {
        const lastIndex = searchValue.lastIndexOf("\\")
        const fileName = searchValue.substring(lastIndex + 1)
        cacheExpanded.current = []
        // 递归搜索 最后 节点的函数
        const findAndAddBinChildren = (nodes) => {
            nodes.forEach((node) => {
                if (node.title === fileName) {
                    // 假定 binContents 是一个包含子节点的数组
                    node.children = [...binContents]
                    return tree
                } else if (node.children && node.children.length) {
                    cacheExpanded.current.push(node.key)
                    findAndAddBinChildren(node.children) // 继续递归搜索子节点
                }
            })
        }
        findAndAddBinChildren(tree)
        return {tree, defaultExpandedKeys: [...expandedKeys, ...cacheExpanded.current]}
        // ||binContents;
    }

    // 树节点第一层组装树
    const assembleFirstTreeNode = (arr) => {
        let newArr = arr.map((item: YakURLResource, index: number) => {
            const idObj = {
                website: item.VerboseName,
                behinder: item.Path,
                godzilla: item.Path
            }

            return {
                title: item.VerboseName,
                key: idObj[schema],
                isLeaf: !item.HaveChildrenNodes,
                data: item,
                icon: ({expanded}) => {
                    if (item.ResourceType === "dir") {
                        return expanded ? (
                            <SolidFolderopenIcon className='yakitTreeNode-icon yakit-flolder-icon' />
                        ) : (
                            <SolidFolderIcon className='yakitTreeNode-icon yakit-flolder-icon' />
                        )
                    }
                    return renderTreeNodeIcon(item.ResourceType as TreeNodeType)
                }
            }
        })
        if (isExtendTree) {
            const {tree, defaultExpandedKeys} = addChildrenToBinNode(getDefaultWebTreeData(), newArr)
            setExpandedKeys([...expandedKeys, ...defaultExpandedKeys])
            return tree
        }

        return newArr
    }
    useEffect(() => {
        const buildTree = (parts, tree, currentPath = "") => {
            if (parts.length === 0) return
            let part = parts.shift()
            let node = tree.find((n) => n.title === part)
            currentPath += (currentPath ? "/" : "") + part // 更新路径
            const item: YakURLResource = {
                ResourceType: "dir",
                VerboseType: "dir",
                ResourceName: part,
                VerboseName: part,
                Size: 0,
                SizeVerbose: "",
                ModifiedTimestamp: 0,
                Path: currentPath,
                YakURLVerbose: "",
                Url: {
                    FromRaw: "",
                    Schema: searchYakURL?.Schema || "",
                    User: "",
                    Pass: "",
                    Location: "",
                    Path: currentPath,
                    Query: [
                        ...(searchYakURL?.Query || []).filter((item) => item.Key !== "path"),
                        {Key: "path", Value: currentPath}
                    ]
                },
                Extra: [],
                HaveChildrenNodes: true
            }
            if (!node) {
                node = {
                    title: part,
                    key: currentPath,
                    isLeaf: parts.length === 0,
                    children: [],
                    data: item,
                    icon: ({expanded}) => {
                        return expanded ? (
                            <SolidFolderopenIcon className='yakitTreeNode-icon yakit-flolder-icon' />
                        ) : (
                            <SolidFolderIcon className='yakitTreeNode-icon yakit-flolder-icon' />
                        )
                    }
                }
                tree.push(node)
            }
            buildTree(parts, node.children, currentPath)
        }

        if (!searchYakURL) return

        // 初始化根节点
        const val = searchYakURL.Query.filter((i) => i.Key === "path")[0].Value

        let tree: TreeNode[] = [];
        [val!].forEach((p) => {
            if (p.endsWith('/') || p.endsWith('\\'))  {
               p = p.slice(0, -1);
            }
            let cleanPath = path.normalize(p)
            // 清理路径中的查询字符串部分
            cleanPath = p.split("?")[0] // 获取 '?' 前的部分

            // 分割路径，处理盘符
            let parts = cleanPath.includes("/") ? cleanPath.split("/") : cleanPath.split("\\")
            // 单独处理盘符
            if (parts[0].length === 2 && parts[0][1] === ":") {
                parts[0] += "/" // 将盘符与后面的路径分隔符合并
            }
            buildTree(parts, tree)
        })
        setDefaultWebTreeData(tree)
    }, [searchYakURL])

    const refreshChildrenByParent = useMemoizedFn(
        (origin: TreeNode[], parentKey: string, nodes: TreeNode[], isClick?: boolean) => {
            const arr = origin.map((node) => {
                if (node.key === parentKey) {
                    isClick && onSelectNodes && onSelectNodes(nodes)
                    return {
                        ...node,
                        children: nodes
                    }
                }
                if (node.children) {
                    return {
                        ...node,
                        children: refreshChildrenByParent(node.children, parentKey, nodes, isClick)
                    }
                }
                return node
            })
            return arr
        }
    )

    // 树子节点异步加载组装树
    const onLoadWebTreeData = ({key, children, data}: any, isClick?: boolean) => {
        return new Promise<void>((resolve, reject) => {
            if (data === undefined) {
                reject("node.data is empty")
                return
            }

            const url = {
                ...data.Url
            }
            try {
                url.Query = url.Query.map((i) => {
                    if (i.Key === "path") {
                        return {
                            Key: "path",
                            Value: url.Path
                        }
                    }
                    return i
                })
            } catch (error) {}
            requestYakURLList(
                {url},
                (rsp) => {
                    const newNodes: TreeNode[] = rsp.Resources.map((i, index) => {
                        const idObj = {
                            website: key + "/" + i.ResourceName,
                            behinder: i.Path,
                            godzilla: i.Path
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
                    // 将文件夹排在前 文件在后
                    const newNodesDir: TreeNode[] = []
                    const newNodesFile: TreeNode[] = []
                    newNodes.forEach((item) => {
                        if (item?.data?.ResourceType === "dir") {
                            newNodesDir.push(item)
                        } else {
                            newNodesFile.push(item)
                        }
                    })
                    const newNodesSort = [...newNodesDir, ...newNodesFile]

                    // 判断是否是搜索树
                    if (getSearchTreeFlag()) {
                        setSearchWebTreeData((origin) => refreshChildrenByParent(origin, key, newNodesSort, isClick))
                    } else {
                        setWebTreeData((origin) => refreshChildrenByParent(origin, key, newNodesSort, isClick))
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
        getTreeData(val)
    })

    useEffect(() => {
        searchVal && onSearchTree(searchVal)
    }, [searchVal])

    useEffect(() => {
        if (searchYakURL) {
            let path: string = ""
            searchYakURL.Query.map((i) => {
                if (i.Key === "path") {
                    path = i.Value
                }
            })
            onSearchTree(path)
        }
    }, [])

    useEffect(() => {
        if (treeQueryparams) {
            if (selectedKeys.length) {
                if (refreshTreeFlag) {
                    if (searchTreeFlag) {
                        setSelectedKeys([])
                        setSelectedNodes([])
                        setExpandedKeys([])
                        getTreeData(searchValue)
                    } else {
                        refreshTree()
                    }
                }
            } else {
                if (searchTreeFlag) {
                    setExpandedKeys([])
                    setSelectedNodes([])
                    getTreeData(searchValue)
                } else {
                    refreshTree()
                }
            }
        }
    }, [treeQueryparams, refreshTreeFlag, inViewport])

    // 刷新网站树
    const refreshTree = useMemoizedFn(() => {
        // 当表格查询参数带搜索条件时
        if (selectedNodes.length) {
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
        if (!refreshTreeWithSearchVal) {
            setSearchValue("")
            setSearchTreeFlag(false)
        }
        setExpandedKeys([])
        setSelectedKeys([])
        setSelectedNodes([])
        getTreeData("")
    })

    // 数组去重
    const filter = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    // 点击Select选中树
    const onSelectedKeys = useMemoizedFn(
        (
            selectedKeys: TreeKey[],
            info: {
                selected
                selectedNodes: TreeNode[]
                node
            }
        ) => {
            const {selected, node} = info
            if (selected) {
                setExpandedKeys(filter([...expandedKeys, ...selectedKeys]))
                onLoadWebTreeData(node, true)
            }
            if (!selected) {
                setExpandedKeys((pre) => pre.filter((item) => item !== node.key))
                onSelectNodes && onSelectNodes(undefined)
            }
            setSelectedKeys(selectedKeys)
            setSelectedNodes(info.selectedNodes)
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
    )

    useEffect(() => {
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
            <div className={styles["tree-top-wrap"]} ref={treeTopWrapRef}>
                <YakitInput.Search
                    wrapperStyle={{marginBottom: 15, width: "calc(100% - 40px)"}}
                    placeholder={searchPlaceholder}
                    allowClear
                    onChange={onSearchChange}
                    onSearch={onSearchTree}
                    value={searchValue}
                />
                <YakitButton type='text2' icon={<RefreshIcon />} onClick={refreshTree} style={{marginBottom: 15}} />
            </div>
            <div className={styles["tree-wrap"]}>
                {treeLoading ? (
                    <YakitSpin />
                ) : (
                    <YakitTree
                        height={height !== undefined ? height - treeTopWrapHeight : undefined}
                        multiple={false}
                        treeData={searchTreeFlag ? searchWebTreeData : webTreeData}
                        // loadData={onLoadWebTreeData}
                        expandedKeys={expandedKeys}
                        onExpand={(
                            expandedKeys: TreeKey[],
                            info: {
                                expanded: boolean
                                node
                            }
                        ) => {
                            setExpandedKeys(expandedKeys)
                            if (info.expanded) {
                                onLoadWebTreeData(info.node)
                            }
                        }}
                        selectedKeys={selectedKeys}
                        onSelect={onSelectedKeys}
                    ></YakitTree>
                )}
            </div>
        </div>
    )
})
