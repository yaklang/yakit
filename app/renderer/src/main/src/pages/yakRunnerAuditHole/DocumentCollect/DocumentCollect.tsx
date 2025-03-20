import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {Tooltip, Tree} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn, useSize} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./DocumentCollect.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {DocumentCollectProps, DocumentCollectTreeProps, HoleResourceType, HoleTreeNode} from "./DocumentCollectType"
import {grpcFetchHoleTree} from "../utils"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {RefreshIcon} from "@/assets/newIcon"
import {OutlineDocumentIcon, OutlineLink2Icon, OutlineVariableIcon} from "@/assets/icon/outline"
import YakitTree, {TreeKey} from "@/components/yakitUI/YakitTree/YakitTree"
import {RequestYakURLResponse} from "@/pages/yakURLTree/data"
import {SolidFolderIcon, SolidFolderopenIcon} from "@/assets/icon/solid"
import {SSARisksFilter} from "../YakitAuditHoleTable/YakitAuditHoleTableType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

const renderTreeNodeIcon = (treeNodeType: HoleResourceType) => {
    const iconsEle = {
        ["function"]: <OutlineDocumentIcon className='yakitTreeNode-icon' />,
        ["program"]: <OutlineVariableIcon className='yakitTreeNode-icon' />,
        ["source"]: <OutlineLink2Icon className='yakitTreeNode-icon' />
    }
    return iconsEle[treeNodeType] || <></>
}

const initHoleTreeData = (list: RequestYakURLResponse) => {
    return list.Resources.sort((a, b) => {
        // 将 ResourceType 为 'program'与'source' 的对象排在前面
        if (["program", "source"].includes(a.ResourceType) && !["program", "source"].includes(b.ResourceType)) {
            return -1 // a排在b前面
        } else if (!["program", "source"].includes(a.ResourceType) && ["program", "source"].includes(b.ResourceType)) {
            return 1 // b排在a前面
        } else {
            return 0 // 保持原有顺序
        }
    }).map((item) => {
        const isLeaf = item.ResourceType === "function"
        const count = item.Extra.find((item) => item.Key === "count")?.Value
        const name = item.ResourceName.split("/").pop() || ""
        return {
            title: (
                <>
                    {name === item.ResourceName ? (
                        <div className={styles["hole-item-title"]}>
                            <div>{name}</div>
                            <YakitTag size='small' color='info'>
                                {count}
                            </YakitTag>
                        </div>
                    ) : (
                        <Tooltip title={item.ResourceName}>
                            <div className={styles["hole-item-title"]}>
                                <div>{name}</div>
                                <YakitTag size='small' color='info'>
                                    {count}
                                </YakitTag>
                            </div>
                        </Tooltip>
                    )}
                </>
            ),
            key: item.Path,
            isLeaf: isLeaf,
            data: item,
            icon: ({expanded}) => {
                if (item.ResourceType === "program") {
                    return expanded ? (
                        <SolidFolderopenIcon className='yakitTreeNode-icon yakit-flolder-icon' />
                    ) : (
                        <SolidFolderIcon className='yakitTreeNode-icon yakit-flolder-icon' />
                    )
                }
                return renderTreeNodeIcon(item.ResourceType as HoleResourceType)
            }
        } as HoleTreeNode
    })
}

export const DocumentCollect: React.FC<DocumentCollectProps> = (props) => {
    const {query, setQuery} = props
    const [treeLoading, setTreeLoading] = useState<boolean>(false)
    // 选中的文件或文件夹
    const [selectedKeys, setSelectedKeys] = React.useState<TreeKey[]>([])
    const [expandedKeys, setExpandedKeys] = React.useState<TreeKey[]>([])
    const [selectedNodes, setSelectedNodes] = useState<HoleTreeNode[]>([]) // select树节点数据集合
    const [searchValue, setSearchValue] = useState<string>("")
    const [holeTreeData, setHoleTreeData] = useState<HoleTreeNode[]>([])

    const refreshChildrenByParent = useMemoizedFn(
        (origin: HoleTreeNode[], parentKey: string, nodes: HoleTreeNode[]) => {
            const arr: HoleTreeNode[] = origin.map((node) => {
                if (node.key === parentKey) {
                    return {
                        ...node,
                        children: nodes
                    } as HoleTreeNode
                }
                if (node.children) {
                    return {
                        ...node,
                        children: refreshChildrenByParent(node.children, parentKey, nodes)
                    } as HoleTreeNode
                }
                return node
            })
            return arr
        }
    )

    const onLoadWebTreeData = useMemoizedFn(({key, children, data}: any) => {
        return new Promise<void>((resolve, reject) => {
            if (data === undefined) {
                reject("node.data is empty")
                return
            }
            grpcFetchHoleTree(data.Path, searchValue)
                .then((result) => {
                    const newNodes: HoleTreeNode[] = initHoleTreeData(result)
                    setHoleTreeData((origin) => refreshChildrenByParent(origin, key, newNodes))
                    resolve()
                })
                .catch((err) => {
                    reject(err)
                })
        })
    })

    const onInitTreeFun = useMemoizedFn(async (rootPath: string) => {
        try {
            if (treeLoading) return
            setTreeLoading(true)
            const result = await grpcFetchHoleTree(rootPath, searchValue)
            const newNodes: HoleTreeNode[] = initHoleTreeData(result)

            setHoleTreeData(newNodes)
            setTimeout(() => {
                setTreeLoading(false)
            }, 50)
        } catch (error: any) {
            failed(`${error}`)
            setTreeLoading(false)
        }
    })

    useEffect(() => {
        onInitTreeFun(`/`)
    }, [])

    const cacheQueryRef = useRef<SSARisksFilter>({})
    useEffect(() => {
        const node = selectedNodes[0]
        if (node) {
            const filter = node.data?.Extra.find((item) => item.Key === "filter")?.Value
            if (filter) {
                try {
                    const newParams = JSON.parse(filter)
                    // 缓存选中前所更改的参数内容 将其置为空用于还原
                    let cache: SSARisksFilter = {}
                    Object.keys(newParams).forEach((key) => {
                        cache[key] = []
                    })
                    cacheQueryRef.current = cache
                    setQuery({...query, ...newParams})
                } catch (_) {
                    setQuery({...query, ...cacheQueryRef.current})
                    cacheQueryRef.current = {}
                }
            } else {
                setQuery({...query, ...cacheQueryRef.current})
                cacheQueryRef.current = {}
            }
        } else {
            setQuery({...query, ...cacheQueryRef.current})
            cacheQueryRef.current = {}
        }
    }, [selectedNodes])

    // 搜索框
    const onSearchChange = useMemoizedFn((e: {target: {value: string}}) => {
        const value = e.target.value
        setSearchValue(value)
    })

    const reset = useMemoizedFn(() => {
        setSearchValue("")
        setExpandedKeys([])
        setSelectedKeys([])
        setSelectedNodes([])
    })

    // 搜索树
    const onSearchTree = useMemoizedFn((value: string) => {
        setExpandedKeys([])
        setSelectedKeys([])
        setSelectedNodes([])
        setSearchValue(value)
        onInitTreeFun(`/`)
    })

    // 刷新树
    const refreshTreeFun = useMemoizedFn(() => {
        // 当表格查询参数未完全清空时
        if (cacheQueryRef.current) {
            setQuery({...query, ...cacheQueryRef.current})
        }
        reset()
        setTimeout(() => {
            onInitTreeFun(`/`)
        }, 30)
    })

    return (
        <div className={styles["document-collect"]}>
            <div className={styles["tree-top-wrap"]}>
                <YakitInput.Search
                    wrapperStyle={{width: "calc(100% - 40px)", marginBottom: 15}}
                    placeholder={"请输入文件名或函数进行搜索"}
                    allowClear
                    onChange={onSearchChange}
                    onSearch={onSearchTree}
                    value={searchValue}
                />
                <YakitButton type='text2' icon={<RefreshIcon />} onClick={refreshTreeFun} style={{marginBottom: 15}} />
            </div>
            <div className={styles["tree-wrap"]}>
                {treeLoading ? (
                    <YakitSpin style={{alignItems: "center"}} />
                ) : (
                    <DocumentCollectTree
                        data={holeTreeData}
                        selectedKeys={selectedKeys}
                        setSelectedKeys={setSelectedKeys}
                        expandedKeys={expandedKeys}
                        setExpandedKeys={setExpandedKeys}
                        onLoadData={onLoadWebTreeData}
                        setSelectedNodes={setSelectedNodes}
                    />
                )}
            </div>
        </div>
    )
}

const DocumentCollectTree: React.FC<DocumentCollectTreeProps> = memo((props) => {
    const {
        data,
        selectedKeys,
        expandedKeys,
        onLoadData,
        wrapClassName,
        setSelectedKeys,
        setExpandedKeys,
        setSelectedNodes
    } = props
    const wrapper = useRef<HTMLDivElement>(null)
    const size = useSize(wrapper)
    // 点击Select选中树
    const onSelectedKeys = useMemoizedFn((selectedKeys: TreeKey[], info) => {
        setSelectedKeys(selectedKeys)
        setSelectedNodes(info.selectedNodes)
    })
    return (
        <div ref={wrapper} className={classNames(styles["document-collect-tree"], wrapClassName)}>
            <YakitTree
                height={size?.height}
                multiple={false}
                treeData={data}
                loadData={onLoadData}
                expandedKeys={expandedKeys}
                onExpand={(expandedKeys: TreeKey[]) => setExpandedKeys(expandedKeys)}
                selectedKeys={selectedKeys}
                onSelect={onSelectedKeys}
                blockNode={true}
            />
        </div>
    )
})
