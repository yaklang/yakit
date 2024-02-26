import React, {useState, ReactNode, useRef, useEffect} from "react"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "./PluginGroupList.module.scss"

export interface GroupListItem {
    id: string // 唯一标识
    name: string // 插件组名字
    number: number // 插件组对应插件数量
    icon: React.ReactElement // 插件组前的icon
    iconColor: string // icon颜色
    showOptBtns: boolean // 是否显示操作按钮
    default: boolean // 是否默认
}

interface PluginGroupListProps {
    data: GroupListItem[] // 插件组数据
    editGroup?: GroupListItem // 当前编辑组
    onEditInputBlur: (groupItem: GroupListItem, newName: string, successCallback: () => void) => void
    extraOptBtn: (groupItem: GroupListItem) => ReactNode // 插件组操作按钮
    extraHideMenu: (groupItem: GroupListItem) => ReactNode // 插件组隐藏菜单
    onActiveGroup: (groupItem: GroupListItem) => void
}

export const PluginGroupList: React.FC<PluginGroupListProps> = (props) => {
    const {data, editGroup, onEditInputBlur, extraOptBtn, extraHideMenu, onActiveGroup} = props
    const [activeGroupId, setActiveGroupId] = useState<string>(data[0].id) // 当前选中插件组id
    const activeGroupIdRef = useRef<string>(activeGroupId)
    const editInputRef = useRef<any>()
    const [newName, setNewName] = useState<string>("") // 插件组新名字

    useEffect(() => {
        if (editGroup) {
            setNewName(editGroup.name)
        }
    }, [editGroup])

    useEffect(() => {
        const index = data.findIndex((item) => item.id === activeGroupIdRef.current)
        if (index === -1) {
            setActiveGroupId(data[0].id)
        } else {
            onActiveGroup(data[index])
        }
    }, [data])

    useEffect(() => {
        activeGroupIdRef.current = activeGroupId
        const findGroupItem = data.find((item) => item.id === activeGroupId)
        if (findGroupItem) {
            onActiveGroup(findGroupItem)
        }
    }, [activeGroupId])

    return (
        <div className={styles["plugin-group-list"]}>
            {data.map((item) => {
                return (
                    <div
                        className={classNames(styles["plugin-group-list-item"], {
                            [styles["plugin-group-list-item-border-bottom-unshow"]]: false
                        })}
                        key={item.id}
                    >
                        {editGroup && editGroup.id === item.id ? (
                            <div className={styles["plugin-group-list-item-input"]}>
                                <YakitInput
                                    ref={editInputRef}
                                    wrapperStyle={{height: "100%"}}
                                    style={{height: "100%"}}
                                    onBlur={() => {
                                        onEditInputBlur(item, newName, () => {
                                            if (activeGroupId === item.id) {
                                                setActiveGroupId(newName + "_group")
                                            }
                                        })
                                        
                                    }}
                                    autoFocus={true}
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value.trim())}
                                ></YakitInput>
                            </div>
                        ) : (
                            <div
                                className={classNames(styles["plugin-group-list-item-cont"], {
                                    [styles["plugin-group-list-item-cont-active"]]: activeGroupId === item.id
                                })}
                                onClick={() => {
                                    setActiveGroupId(item.id)
                                }}
                            >
                                <div className={styles["plugin-group-list-item-cont-left"]}>
                                    <span className={styles["list-item-icon"]} style={{color: item.iconColor}}>
                                        {item.icon}
                                    </span>
                                    <span className={styles["groups-text"]}>{item.name}</span>
                                </div>
                                {activeGroupId === item.id && item.showOptBtns ? (
                                    extraHideMenu(item)
                                ) : (
                                    <div
                                        className={classNames(styles["plugin-number"], {
                                            [styles["plugin-number-unshow"]]: item.showOptBtns
                                        })}
                                    >
                                        {item.number}
                                    </div>
                                )}
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
