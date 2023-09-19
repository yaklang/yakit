import React, {useEffect, useState} from "react"
import {FilterPanelProps} from "./FilterPanelType"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"

import styles from "./FilterPanel.module.scss"
import classNames from "classnames"

const {YakitPanel} = YakitCollapse

export const FilterPanel: React.FC<FilterPanelProps> = React.memo((props) => {
    const {
        wrapperClassName,
        loading = false,
        visible,
        setVisible,
        selecteds,
        onSelect,
        groupList,
        noDataHint,
        listClassName
    } = props

    const [activeKey, setActiveKey] = useState<string[]>([])
    useEffect(() => {
        const keys = groupList.map((l) => l.groupKey)
        setActiveKey(keys)
    }, [groupList])

    const onClear = useMemoizedFn((key: string) => {
        const selected = {...selecteds}
        selected[key] = []
        onSelect({...selected})
    })
    const onCheck = useMemoizedFn((groupKey: string, value: string, check: boolean) => {
        const selected = {...selecteds}
        if (check) {
            selected[groupKey] = [...(selected[groupKey] || []), value]
        } else {
            selected[groupKey] = (selected[groupKey] || []).filter((item) => item !== value)
        }
        onSelect({...selected})
    })
    return (
        <div className={classNames(styles["filter-panel-wrapper"], wrapperClassName || "")}>
            <div className={styles["filter-panel-container"]}>
                <div className={styles["panel-header"]}>
                    <span className={styles["header-title"]}>高级筛选</span>
                    <YakitSwitch checked={visible} onChange={setVisible} />
                </div>
                <div className={styles["panel-content"]}>
                    <YakitSpin spinning={loading}>
                        <div className={classNames(styles["content-body"], listClassName)}>
                            <YakitCollapse
                                activeKey={activeKey}
                                onChange={(key) => setActiveKey(key as string[])}
                                className={styles["content-collapse"]}
                            >
                                {groupList.map((item, i) => (
                                    <YakitPanel
                                        header={item.groupName}
                                        key={item.groupKey}
                                        extra={
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                className={styles["clear-btn"]}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onClear(item.groupKey)
                                                }}
                                            >
                                                清空
                                            </YakitButton>
                                        }
                                    >
                                        {item.data.map((listItem) => {
                                            const checked = (selecteds[item.groupKey] || []).includes(listItem.value)
                                            return (
                                                <label
                                                    className={classNames(styles["list-item"], {
                                                        [styles["list-item-active"]]: checked
                                                    })}
                                                    key={`${item.groupKey}-${listItem.value}`}
                                                >
                                                    <div className={styles["list-item-left"]}>
                                                        <YakitCheckbox
                                                            checked={checked}
                                                            onChange={(e) =>
                                                                onCheck(item.groupKey, listItem.value, e.target.checked)
                                                            }
                                                        />
                                                        <span
                                                            className={classNames(
                                                                styles["item-title"],
                                                                "yakit-content-single-ellipsis"
                                                            )}
                                                            title={listItem.label}
                                                        >
                                                            {listItem.label}
                                                        </span>
                                                    </div>
                                                    <span className={styles["list-item-extra"]}>{listItem.count}</span>
                                                </label>
                                            )
                                        })}
                                    </YakitPanel>
                                ))}
                            </YakitCollapse>
                            {groupList.length > 0 && <div className={styles["to-end"]}>已经到底啦～</div>}
                            {groupList.length === 0 && (
                                <YakitEmpty style={{paddingTop: 48}} title={noDataHint || "暂无数据"} />
                            )}
                        </div>
                    </YakitSpin>
                </div>
            </div>
        </div>
    )
})
