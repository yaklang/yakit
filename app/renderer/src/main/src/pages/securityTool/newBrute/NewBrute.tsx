import React, {useState, useEffect, useMemo, Key} from "react"
import {BruteExecuteProps, BruteTypeTreeListProps, NewBruteProps} from "./NewBruteType"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {Tree, apiGetAvailableBruteTypes} from "./utils"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import YakitTree from "@/components/yakitUI/YakitTree/YakitTree"
import {DataNode} from "antd/lib/tree"
import classNames from "classnames"
import styles from "./NewBrute.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineRefreshIcon} from "@/assets/icon/outline"

export const NewBrute: React.FC<NewBruteProps> = React.memo((props) => {
    const [bruteType, setBruteType] = useState<React.Key[]>([])
    const type = useCreation(() => {
        return bruteType?.join(",") || ""
    }, [bruteType])
    return (
        <div className={styles["brute-wrapper"]}>
            <BruteTypeTreeList bruteType={bruteType} setBruteType={setBruteType} />
            <BruteExecute type={type} />
        </div>
    )
})

const BruteTypeTreeList: React.FC<BruteTypeTreeListProps> = React.memo((props) => {
    const [tree, setTree] = useState<DataNode[]>([])

    const [checkedKeys, setCheckedKeys] = useControllableValue<React.Key[]>(props, {
        defaultValue: [],
        valuePropName: "bruteType",
        trigger: "setBruteType"
    })

    useEffect(() => {
        getAvailableBruteTypes()
    }, [])
    const getAvailableBruteTypes = useMemoizedFn(() => {
        apiGetAvailableBruteTypes().then(setTree)
    })
    const onCheck = useMemoizedFn((checkedKeysValue: Key[]) => {
        const checkedKeys = checkedKeysValue.filter((item) => !(item as string).includes("temporary-id-"))
        setCheckedKeys(checkedKeys)
    })
    /**点击勾选 */
    const onSelect = useMemoizedFn((keys: Key[]) => {
        if (keys.length === 0) return
        const item = keys[0] as string
        if (item.includes("temporary-id-")) {
            // 一级
            const selectItem = tree.find((ele) => ele.key === item)
            if (!selectItem) return
            const itemChildren = selectItem.children || []
            const childrenListKey = itemChildren.map((ele) => ele.key)
            const haveCheckKeys = checkedKeys.filter((ele) => childrenListKey.includes(ele))
            if (itemChildren.length === haveCheckKeys.length) {
                const newCheckedKeys = checkedKeys.filter((ele) => !childrenListKey.includes(ele))
                setCheckedKeys(newCheckedKeys)
            } else {
                const newCheckedKeys = [...new Set([...checkedKeys, ...childrenListKey])]
                setCheckedKeys(newCheckedKeys)
            }
        } else {
            // 二级
            if (checkedKeys.includes(item)) {
                setCheckedKeys(checkedKeys.filter((ele) => ele !== item))
            } else {
                const newCheckedKeys = [...new Set([...checkedKeys, item])]
                setCheckedKeys(newCheckedKeys)
            }
        }
    })
    return (
        <div className={styles["tree-list-wrapper"]}>
            <div className={styles["tree-heard"]}>
                <span className={styles["tree-heard-title"]}>可用爆破类型</span>
            </div>
            <YakitTree
                checkable
                selectedKeys={[]}
                checkedKeys={checkedKeys}
                onCheck={(keys) => onCheck(keys as Key[])}
                showLine={false}
                treeData={tree}
                onSelect={onSelect}
                classNameWrapper={styles["tree-list"]}
                rootClassName={styles["tree-root"]}
            />
        </div>
    )
})

const BruteExecute: React.FC<BruteExecuteProps> = React.memo((props) => {
    const {type} = props
    return <div>fsdfd</div>
})
