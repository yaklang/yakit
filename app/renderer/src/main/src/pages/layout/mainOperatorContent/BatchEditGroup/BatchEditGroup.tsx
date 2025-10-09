import React, {useEffect, useState} from "react"
import {BatchEditGroupProps} from "./BatchEditGroupType"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {MultipleNodeInfo} from "../MainOperatorContentType"
import {useCreation, useMemoizedFn} from "ahooks"
import styles from "./BatchEditGroup.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

const BatchEditGroup: React.FC<BatchEditGroupProps> = React.memo((props) => {
    const {groupName, groupChildren, tabList, onFinish, onCancel} = props
    const [selectList, setSelectList] = useState<MultipleNodeInfo[]>(groupChildren)
    const checkedTabs = useCreation(() => {
        return selectList.map((ele) => ele.id)
    }, [selectList])
    const onTabChange = useMemoizedFn((checked: boolean, item: MultipleNodeInfo) => {
        if (checked) {
            setSelectList((v) => v.filter((ele) => ele.id !== item.id))
        } else {
            setSelectList((v) => [...v, item])
        }
    })
    const onSave = useMemoizedFn(() => {
        onFinish(selectList)
    })
    return (
        <div className={styles["batch-edit-group"]}>
            <div className={styles["batch-edit-group-name"]}>{groupName}:</div>
            <div className={styles["batch-edit-group-list"]}>
                {tabList.map((item) => {
                    const checked = checkedTabs.includes(item.id)
                    return (
                        <YakitCheckbox
                            key={item.id}
                            value={item.id}
                            checked={checked}
                            onChange={() => onTabChange(checked, item)}
                        >
                            {item.verbose}
                        </YakitCheckbox>
                    )
                })}
            </div>
            <div className={styles["batch-edit-group-footer"]}>
                <YakitButton type='outline1' onClick={onCancel}>
                    取消
                </YakitButton>
                <YakitButton onClick={onSave}>确定</YakitButton>
            </div>
        </div>
    )
})

export default BatchEditGroup
