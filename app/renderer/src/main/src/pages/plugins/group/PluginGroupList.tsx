import React, {useState, ReactNode, useRef, useEffect} from "react"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "./PluginGroupList.module.scss"

interface PluginGroupListProps {
    data: any // 插件组数据
    editGroupName: string // 当前编辑组名
    onEditInputBlur: (groupItem: any, editGroupNewName: string) => void
    extraOptBtn: (groupItem: any) => ReactNode // 插件组操作按钮
}

export const PluginGroupList: React.FC<PluginGroupListProps> = (props) => {
    const {data, editGroupName, onEditInputBlur, extraOptBtn} = props
    const [activeGroup, setActiveGroup] = useState<string>("全部") // 当前选中插件组
    const editInputRef = useRef<any>()
    const [editGroupNewName, setEditGroupNewName] = useState<string>(editGroupName) // 插件组新名字

    useEffect(() => {
        setEditGroupNewName(editGroupName)
    }, [editGroupName])

    return (
        <div className={styles["plugin-group-list"]}>
            {data.map((item) => {
                return (
                    <div
                        className={classNames(styles["plugin-group-list-item"], {
                            [styles["plugin-group-list-item-border-bottom-unshow"]]: false
                        })}
                    >
                        {editGroupName === item.groupName ? (
                            <div className={styles["plugin-group-list-item-input"]}>
                                <YakitInput
                                    ref={editInputRef}
                                    wrapperStyle={{height: "100%"}}
                                    style={{height: "100%"}}
                                    onBlur={(groupItem) => onEditInputBlur(groupItem, editGroupNewName)}
                                    autoFocus={true}
                                    value={editGroupNewName}
                                    onChange={(e) => setEditGroupNewName(e.target.value)}
                                ></YakitInput>
                            </div>
                        ) : (
                            <div
                                className={classNames(styles["plugin-group-list-item-cont"], {
                                    [styles["plugin-group-list-item-cont-active"]]: activeGroup === item.groupName
                                })}
                                onClick={() => {
                                    setActiveGroup(item.groupName)
                                }}
                            >
                                <div className={styles["plugin-group-list-item-cont-left"]}>
                                    <span className={styles["list-item-icon"]} style={{color: item.iconColor}}>
                                        {item.icon}
                                    </span>
                                    <span className={styles["groups-text"]}>{item.groupName}</span>
                                </div>
                                <div
                                    className={classNames(styles["plugin-number"], {
                                        [styles["plugin-number-unshow"]]: item.showOptBtns
                                    })}
                                >
                                    {item.pluginNumer}
                                </div>
                                {item.showOptBtns && (
                                    <div
                                        className={styles["extra-opt-btns"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        {extraOptBtn(item)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
            <div className={styles["plugin-group-footer"]}>已经到底啦 ~ </div>
        </div>
    )
}
