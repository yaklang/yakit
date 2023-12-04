import React, {useState} from "react"
import {Tree} from "antd"
import type {DataNode as TreeNode, TreeProps} from "antd/es/tree"
import {OutlineMinusIcon, OutlinePlusIcon} from "@/assets/icon/outline"
import {useDebounceEffect} from "ahooks"
import {YakitEmpty} from "../YakitEmpty/YakitEmpty"
import styles from "./YakitTree.module.scss"

export type TreeKey = string | number
interface YakitTreeProps extends TreeProps {
    showIcon?: boolean // 是否展示treeNode节点前的icon 默认 -> 展示
    treeLoading?: boolean // 树加载loading
    treeData: TreeNode[] // 需要满足 DataNode类型的数组
    expandedKeys?: TreeKey[] // 展开节点的key结合 若设置selectedKeys或checkedKeys需要自动展开节点的话，需要手动找到父节点的key去组装expandedKeys传进来才能实现自动展开功能。autoExpandParent主要是针对手动点击触发的自动展开
    onExpandedKeys?: (expandedKeys: TreeKey[]) => void // 若传了expandedKeys -> onExpandedKeys必传（需改变传过来的expandedKeys）
    selectedKeys?: TreeKey[]
    onSelectedKeys?: (selectedKeys: TreeKey[], selectedNodes: TreeNode[]) => void
    checkedKeys?: TreeKey[]
    onCheckedKeys?: (checkedKeys: TreeKey[], checkedNodes: TreeNode[]) => void
    showSearch?: boolean // 是否显示搜索框 默认 -> 显示
    searchPlaceholder?: string // 搜索框placeholder 默认 -> 请输入关键词搜索
}

/**
 * 目前基本上只封装了样式
 */
const YakitTree: React.FC<YakitTreeProps> = React.memo((props) => {
    const {showLine = true, showIcon = true} = props

    const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>() // 树节点展开key
    const [selectedKeys, setSelectedKeys] = useState<TreeKey[]>() // select - 节点
    const [checkedKeys, setCheckedKeys] = useState<TreeKey[]>() // check - 节点

    useDebounceEffect(
        () => {
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
        [props.treeData, props.expandedKeys, props.selectedKeys, props.checkedKeys],
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
        props.onExpandedKeys && props.onExpandedKeys(expandedKeys)
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
     * check - 选中树 TODO：未处理复选框是否关联返回的勾选结果不一样
     */
    const onTreeCheck = (checkedKeys, info) => {
        setCheckedKeys(checkedKeys)
        props.onCheckedKeys && props.onCheckedKeys(checkedKeys, info.checkedNodes)
    }

    return (
        <div className={styles.yakitTree}>
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
                    onExpand={onExpand}
                    expandedKeys={expandedKeys}
                    selectedKeys={selectedKeys}
                    onSelect={onTreeSelect}
                    checkedKeys={checkedKeys}
                    onCheck={onTreeCheck}
                ></Tree>
            ) : (
                <YakitEmpty />
            )}
        </div>
    )
})

export default YakitTree
