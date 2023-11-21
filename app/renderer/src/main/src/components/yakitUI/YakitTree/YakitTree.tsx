import React, {useEffect, useState} from "react"
import {Tree} from "antd"
import type {DataNode, TreeProps} from "antd/es/tree"
import {OutlineDocumentIcon, OutlineLink2Icon, OutlineMinusIcon, OutlinePlusIcon, OutlineVariableIcon} from "@/assets/icon/outline"
import {YakitInput} from "../YakitInput/YakitInput"
import {useDebounceEffect, useDebounceFn, useMemoizedFn} from "ahooks"
import styles from "./YakitTree.module.scss"
import {YakitEmpty} from "../YakitEmpty/YakitEmpty"
import {YakitButton} from "../YakitButton/YakitButton"
import {RefreshIcon} from "@/assets/newIcon"
import {YakitSpin} from "../YakitSpin/YakitSpin"
import {YakURLResource} from "@/pages/yakURLTree/data"

export type TreeKey = string | number

export type TreeNodeType = "dir" | "file" | "query" | "path"
export const renderTreeNodeIcon = (treeNodeType: TreeNodeType) => {
    const iconsEle = {
        ['file']: <OutlineDocumentIcon className='yakitTreeNode-icon' />,
        ['query']: <OutlineVariableIcon className='yakitTreeNode-icon' />,
        ['path']: <OutlineLink2Icon className='yakitTreeNode-icon' />,
    }
    return iconsEle[treeNodeType] || <></>
}

export interface TreeNode extends DataNode {
    data?: YakURLResource // 树节点其他额外数据
}

/**
 * 目前基本上只封装了样式
 */

interface YakitTreeProps extends TreeProps {
    showIcon?: boolean // 是否展示treeNode节点前的icon 默认 -> 展示
    icon?: React.ReactNode // treeNode节点前的icon 默认 -> 文件图标
    searchPlaceholder?: string // 搜索框placeholder 默认 -> 请输入关键词搜索
    treeLoading?: boolean // 树加载loading
    treeData: TreeNode[] // 需要满足 DataNode类型的数组
    expandedAllKeys?: boolean // 是否展开所有节点 ----- expandedAllKeys 优先级高于expandedKeys
    expandedKeys?: TreeKey[] // 展开节点的key结合 若设置selectedKeys或checkedKeys需要自动展开节点的话，需要手动找到父节点的key去组装expandedKeys传进来才能实现自动展开功能。autoExpandParent主要是针对手动点击触发的自动展开
    onExpandedKeys?: (expandedKeys: TreeKey[]) => void // 若传了expandedKeys -> onExpandedKeys必传（需改变传过来的expandedKeys）
    selectedKeys?: TreeKey[]
    onSelectedKeys?: (selectedKeys: TreeKey[], selectedNodes: TreeNode[]) => void
    checkedKeys?: TreeKey[]
    onCheckedKeys?: (checkedKeys: TreeKey[], checkedNodes: TreeNode[]) => void
    showSearch?: boolean // 是否显示搜索框 默认 -> 显示
    searchValue?: string // 搜索内容
    onSearchValue?: (searchValue: string) => void
    refreshTree?: () => void // 刷新树
}

const YakitTree: React.FC<YakitTreeProps> = (props) => {
    const {
        showLine = true,
        showIcon = true,
        icon = <OutlineDocumentIcon className={styles["outlineDocument-icon"]} />,
        showSearch = true,
        searchPlaceholder = "请输入关键词搜索",
        expandedAllKeys = false
    } = props

    const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>() // 树节点展开key
    const [autoExpandParent, setAutoExpandParent] = useState<boolean>() // 是否自动展开父节点
    const [selectedKeys, setSelectedKeys] = useState<TreeKey[]>() // select - 节点
    const [checkedKeys, setCheckedKeys] = useState<TreeKey[]>() // check - 节点

    useDebounceEffect(
        () => {
            if (expandedAllKeys) {
                // 展开所有节点
                setExpandedKeys(expandedKeysFun(props.treeData))
                return
            }

            if (props.expandedKeys) {
                // 展开指定节点
                setExpandedKeys(props.expandedKeys)
            }

            if (props.selectedKeys) {
                // select指定节点
                setSelectedKeys(props.selectedKeys)
            }

            if (props.checkedKeys) {
                // check 指定节点
                setCheckedKeys(props.checkedKeys)
            }
        },
        [props.treeData, expandedAllKeys, props.expandedKeys, props.selectedKeys, props.checkedKeys],
        {
            wait: 100,
            leading: true,
            trailing: true
        }
    )

    /**
     * 展开树的key
     */
    const onExpand = (expandedKeys: TreeKey[]) => {
        setExpandedKeys(expandedKeys)
        setAutoExpandParent(false)
        props.onExpandedKeys && props.onExpandedKeys(expandedKeys)
    }
    const expandedKeysFun = (treeData: TreeNode[]) => {
        if (treeData && treeData.length === 0) {
            return []
        }
        let arr: TreeKey[] = []
        const expandedKeysFn = (treeData: TreeNode[]) => {
            treeData.forEach((item, index) => {
                arr.push(item.key)
                if (item.children && item.children.length > 0) {
                    expandedKeysFn(item.children)
                }
            })
        }
        expandedKeysFn(treeData)
        return arr
    }

    /**
     * select - 选中树
     */
    const onTreeSelect = (
        selectedKeys: TreeKey[],
        info: {
            selectedNodes: TreeNode[]
        }
    ) => {
        setSelectedKeys(selectedKeys)
        props.onSelectedKeys && props.onSelectedKeys(selectedKeys, info.selectedNodes)
    }

    /**
     * 搜索树
     */
    const [searchValue, setSearchValue] = useState("")
    useEffect(() => {
        setSearchValue(props.searchValue || "")
    }, [props.searchValue])
    const debounceSearch = useDebounceFn(
        (value) => {
            props.onSearchValue && props.onSearchValue(value)
        },
        {wait: 500, leading: true, trailing: true}
    )
    const onSearchChange = useMemoizedFn((e: {target: {value: string}}) => {
        const value = e.target.value
        setSearchValue(value)
        debounceSearch.run(value)
        setAutoExpandParent(true)
    })

    /**
     * check - 选中树 TODO：未处理复选框是否关联返回的勾选结果不一样
     */
    const onTreeCheck = (checkedKeys, info) => {
        setCheckedKeys(checkedKeys)
        props.onCheckedKeys && props.onCheckedKeys(checkedKeys, info.checkedNodes)
    }

    return (
        <div className={styles.yakitTree}>
            <div className={styles["tree-top-wrap"]}>
                {showSearch && (
                    <YakitInput.Search
                        style={{marginBottom: 15, width: "calc(100% - 40px)"}}
                        placeholder={searchPlaceholder}
                        allowClear
                        onChange={onSearchChange}
                        value={searchValue}
                    />
                )}
                {props.refreshTree && (
                    <YakitButton
                        type='text2'
                        icon={<RefreshIcon />}
                        onClick={props.refreshTree}
                        style={{marginBottom: 15}}
                    />
                )}
            </div>
            {props.treeLoading ? (
                <YakitSpin />
            ) : (
                <>
                    {props.treeData.length ? (
                        <Tree
                            {...props}
                            showLine={showLine ? {showLeafIcon: false} : false}
                            showIcon={showIcon}
                            switcherIcon={(p: {expanded: boolean}) => {
                                return p.expanded ? (
                                    <OutlineMinusIcon className={styles["switcher-icon"]} />
                                ) : (
                                    <OutlinePlusIcon className={styles["switcher-icon"]} />
                                )
                            }}
                            autoExpandParent={autoExpandParent}
                            onExpand={onExpand}
                            expandedKeys={expandedKeys}
                            selectedKeys={selectedKeys}
                            onSelect={onTreeSelect}
                            checkedKeys={checkedKeys}
                            onCheck={onTreeCheck}
                        />
                    ) : (
                        <YakitEmpty />
                    )}
                </>
            )}
        </div>
    )
}

export default YakitTree
