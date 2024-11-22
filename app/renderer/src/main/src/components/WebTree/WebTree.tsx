import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import YakitTree, {TreeKey} from "../yakitUI/YakitTree/YakitTree"
import type {DataNode} from "antd/es/tree"
import {useDebounceEffect, useInViewport, useMemoizedFn} from "ahooks"
import {
    OutlineChevrondownIcon,
    OutlineDocumentIcon,
    OutlineFolderremoveIcon,
    OutlineLink2Icon,
    OutlineVariableIcon
} from "@/assets/icon/outline"
import {loadFromYakURLRaw, requestYakURLList} from "@/pages/yakURLTree/netif"
import {yakitFailed} from "@/utils/notification"
import {YakURL, YakURLResource} from "@/pages/yakURLTree/data"
import {SolidFolderIcon, SolidFolderaddIcon, SolidFolderopenIcon} from "@/assets/icon/solid"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {RefreshIcon} from "@/assets/newIcon"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import classNames from "classnames"
import styles from "./WebTree.module.scss"

type TreeNodeType = "dir" | "file" | "query" | "path"
export interface TreeNode extends DataNode {
    data?: YakURLResource // 树节点其他额外数据
}

interface WebTreeProp {
    ref?: React.Ref<any>
    height: number // 树高度 用于虚拟滚动
    searchVal?: string // 搜索树值
    searchInputDisabled?: boolean
    searchPlaceholder?: string // 搜索框提示文案
    treeExtraQueryparams: string // 树查询参数是一个json字符串
    refreshTreeWithSearchVal?: boolean // 是否带搜索条件刷新树
    refreshTreeFlag?: boolean // 选中树节点后 表格参数改变导致树查询参数改变 是否需要刷新树 默认->不刷新
    onSelectNodes?: (selectedNodes: TreeNode[]) => void // 选中节点得nodes
    onSelectKeys?: (selectedKeys: TreeKey[]) => void // 选中节点得keys
    onGetUrl?: (searchURL: string, includeInUrl: string) => void // 获取选中后节点得url信息 用于表格查询
    resetTableAndEditorShow?: (table: boolean, editor: boolean) => void // 重置 表格显示-编辑器不显示

    /** runtime-id 网站树的过滤条件(runtime_id) */
    runTimeId?: string
}

/**
 * 该网站树暂不支持复选框 select选中只支持单选
 */
export const WebTree: React.FC<WebTreeProp> = React.forwardRef((props, ref) => {
    const {
        height,
        searchVal = "",
        searchInputDisabled = false,
        refreshTreeWithSearchVal = false,
        searchPlaceholder = "请输入关键词搜索",
        treeExtraQueryparams,
        refreshTreeFlag = false,
        onSelectNodes,
        onSelectKeys,
        onGetUrl,
        resetTableAndEditorShow,
        runTimeId = ""
    } = props

    const [treeLoading, setTreeLoading] = useState<boolean>(false)
    // 未搜索情况时的网站树
    const [webTreeData, setWebTreeData] = useState<TreeNode[]>([])
    // 已搜索情况时的网站树
    const [searchWebTreeData, setSearchWebTreeData] = useState<TreeNode[]>([])
    /** 判断当前是否为已搜索的情况 */
    const searchTreeFlag = useRef<boolean>(!!searchVal)

    const [searchValue, setSearchValue] = useState<string>(searchVal)
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

    const getTreeData = useMemoizedFn((yakurl: string) => {
        if (treeLoading) return

        // 由于这里会有闭包 30毫秒后再掉接口
        setTreeLoading(true)
        setTimeout(() => {
            let params: string = ""
            if (treeExtraQueryparams) {
                params = `params=${treeExtraQueryparams}`
            }

            let search: string = ""
            if (searchTreeFlag.current) {
                setSearchWebTreeData([])
                search = params ? `&search=${1}` : `search=${1}`
            } else {
                setWebTreeData([])
            }

            let runTime_id: string = ""
            if (runTimeId) {
                runTime_id = params || search ? `&runtime_id=${runTimeId}` : `runtime_id=${runTimeId}`
            }

            loadFromYakURLRaw(`${yakurl}?${params}${search}${runTime_id}`, (res) => {
                // 判断是否是搜索树
                if (searchTreeFlag.current) {
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
    })

    // 树节点第一层组装树
    const assembleFirstTreeNode = (arr: YakURLResource[]) => {
        return arr.map((item, index) => {
            const id = item.VerboseName
            return {
                title: item.VerboseName,
                key: id,
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
            } as TreeNode
        })
    }

    const refreshChildrenByParent = useMemoizedFn((origin: TreeNode[], parentKey: string, nodes: TreeNode[]) => {
        const arr: TreeNode[] = origin.map((node) => {
            if (node.key === parentKey) {
                return {
                    ...node,
                    children: nodes
                } as TreeNode
            }
            if (node.children) {
                return {
                    ...node,
                    children: refreshChildrenByParent(node.children, parentKey, nodes)
                } as TreeNode
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
            const obj: YakURL = {...data.Url, Query: []}
            if (treeExtraQueryparams) {
                obj.Query.push({Key: "params", Value: treeExtraQueryparams})
            }

            if (key.startsWith("https://")) {
                obj.Query.push({Key: "schema", Value: "https"})
            } else if (key.startsWith("http://")) {
                obj.Query.push({Key: "schema", Value: "http"})
            }

            if (runTimeId) {
                obj.Query.push({Key: "runtime_id", Value: runTimeId})
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
                    if (searchTreeFlag.current) {
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
        searchTreeFlag.current = flag
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
        searchVal && onSearchTree(searchVal)
    }, [searchVal])

    useEffect(
        () => {
            if (treeExtraQueryparams) {
                if (selectedKeys.length) {
                    if (refreshTreeFlag) {
                        if (searchTreeFlag.current) {
                            setSelectedKeys([])
                            setSelectedNodes([])
                            setExpandedKeys([])
                            getTreeData("website://" + searchValue)
                        } else {
                            refreshTree()
                        }
                    }
                } else {
                    if (searchTreeFlag.current) {
                        setExpandedKeys([])
                        setSelectedNodes([])
                        getTreeData("website://" + searchValue)
                    } else {
                        refreshTree()
                    }
                }
            }
        },
        [treeExtraQueryparams, refreshTreeFlag, inViewport],
    )

    // 刷新网站树
    const refreshTree = useMemoizedFn(() => {
        // 当表格查询参数带搜索条件时
        if (selectedNodes.length) {
            resetTableAndEditorShow && resetTableAndEditorShow(true, false)
        }
        if (!refreshTreeWithSearchVal) {
            setSearchValue("")
            searchTreeFlag.current = false
        }
        setExpandedKeys([])
        setSelectedKeys([])
        setSelectedNodes([])
        getTreeData("website://" + `${refreshTreeWithSearchVal ? `${searchValue ? searchValue : "/"}` : "/"}`)
    })

    // 网站树跳转 -> 带到搜索框查询
    const onJumpWebTree = (value: string) => {
        searchTreeFlag.current = true
        setSelectedKeys([])
        setSearchValue(value)
        getTreeData("website://" + value)
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
                    wrapperStyle={{width: "calc(100% - 40px)", marginBottom: 15}}
                    placeholder={searchPlaceholder}
                    allowClear
                    onChange={onSearchChange}
                    onSearch={onSearchTree}
                    value={searchValue}
                    disabled={searchInputDisabled}
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
                        treeData={searchTreeFlag.current ? searchWebTreeData : webTreeData}
                        loadData={onLoadWebTreeData}
                        expandedKeys={expandedKeys}
                        onExpand={(expandedKeys: TreeKey[]) => setExpandedKeys(expandedKeys)}
                        selectedKeys={selectedKeys}
                        onSelect={onSelectedKeys}
                        blockNode={true}
                    ></YakitTree>
                )}
            </div>
        </div>
    )
})
