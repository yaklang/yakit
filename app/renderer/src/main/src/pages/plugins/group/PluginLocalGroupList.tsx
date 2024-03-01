import React, {useEffect, useRef, useState} from "react"
import {
    SolidDotsverticalIcon,
    SolidFolderopenIcon,
    SolidQuestionmarkcircleIcon,
    SolidViewgridIcon
} from "@/assets/icon/solid"
import {PluginGroupList, GroupListItem} from "./PluginGroupList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {DelGroupConfirmPop} from "./PluginOnlineGroupList"
import {
    apiFetchDeleteYakScriptGroupLocal,
    apiFetchQueryYakScriptGroupLocal,
    apiFetchRenameYakScriptGroupLocal
} from "../utils"
import {GroupCount} from "@/pages/invoker/schema"
import emiter from "@/utils/eventBus/eventBus"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import styles from "./PluginLocalGroupList.module.scss"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"

interface PluginLocalGroupListProps {
    pluginsGroupsInViewport: boolean
    onLocalGroupLen: (len: number) => void
    activeLocalGroup?: GroupListItem
    onActiveGroup: (groupItem: GroupListItem) => void
}
export const PluginLocalGroupList: React.FC<PluginLocalGroupListProps> = (props) => {
    const {pluginsGroupsInViewport, onLocalGroupLen, activeLocalGroup, onActiveGroup} = props
    const [groupList, setGroupList] = useState<GroupListItem[]>([])
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [editGroup, setEditGroup] = useState<GroupListItem>() // 编辑插件组
    const [delGroup, setDelGroup] = useState<GroupListItem>() // 删除插件组
    const [delGroupConfirmPopVisible, setDelGroupConfirmPopVisible] = useState<boolean>(false)
    const delGroupConfirmPopRef = useRef<any>()
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)

    useEffect(() => {
        getGroupList()
    }, [pluginsGroupsInViewport])

    useEffect(() => {
        emiter.on("onRefPluginGroupMagLocalQueryYakScriptGroup", getGroupList)
        return () => {
            emiter.off("onRefPluginGroupMagLocalQueryYakScriptGroup", getGroupList)
        }
    }, [])

    const assemblyExtraField = (isDefault: boolean, groupName: string, field: string) => {
        const noGroupItem = {
            全部: {icon: <SolidViewgridIcon />, iconColor: "#56c991", showOptBtns: false},
            未分组: {icon: <SolidQuestionmarkcircleIcon />, iconColor: "#8863f7", showOptBtns: false}
        }
        const groupItem = {icon: <SolidFolderopenIcon />, iconColor: "#ffb660", showOptBtns: true}
        return isDefault ? noGroupItem[groupName][field] : groupItem[field]
    }

    // 获取组列表数据
    const getGroupList = () => {
        apiFetchQueryYakScriptGroupLocal().then((group: GroupCount[]) => {
            const copyGroup = structuredClone(group)
            const arr = copyGroup.map((item) => {
                const obj = {
                    id: item.Default ? item.Value : item.Value + "_group",
                    name: item.Value,
                    number: item.Total,
                    icon: assemblyExtraField(item.Default, item.Value, "icon"),
                    iconColor: assemblyExtraField(item.Default, item.Value, "iconColor"),
                    showOptBtns: assemblyExtraField(item.Default, item.Value, "showOptBtns"),
                    default: item.Default
                }
                return obj
            })
            setGroupList(arr)
            onLocalGroupLen(arr.length - 2 > 0 ? arr.length - 2 : 0)
        })
    }

    // 插件组名input失焦
    const onEditGroupNameBlur = (groupItem: GroupListItem, newName: string, successCallback: () => void) => {
        setEditGroup(undefined)
        if (!newName || newName === groupItem.name) return
        apiFetchRenameYakScriptGroupLocal(groupItem.name, newName).then(() => {
            successCallback()
            getGroupList()
            if (activeLocalGroup?.default === false && activeLocalGroup.name === newName) {
                emiter.emit("onRefPluginGroupMagLocalPluginList", "")
            }
        })
    }

    // 点击删除
    const onClickBtn = (groupItem: GroupListItem) => {
        setDelGroup(groupItem)
        getRemoteValue(RemoteGV.PluginGroupDelNoPrompt).then((result: string) => {
            const flag = result === "true"
            if (flag) {
                setDelGroup(undefined)
                onGroupDel(groupItem)
            } else {
                setDelGroupConfirmPopVisible(true)
            }
        })
    }

    // 插件组删除
    const onGroupDel = (groupItem: GroupListItem, callBack?: () => void) => {
        apiFetchDeleteYakScriptGroupLocal(groupItem.name).then(() => {
            getGroupList()
            // 如果当前选中组为固定的未分组 刷新右侧插件列表
            if (activeLocalGroup?.default && activeLocalGroup.id === "未分组") {
                emiter.emit("onRefPluginGroupMagLocalPluginList", "")
            }
            callBack && callBack()
        })
    }

    return (
        <>
            {groupList.length > 0 && (
                <div
                    style={{
                        display: groupList.length > 2 ? "block" : "none",
                        height: "100%"
                    }}
                >
                    <PluginGroupList
                        data={groupList}
                        editGroup={editGroup}
                        onEditInputBlur={onEditGroupNameBlur}
                        extraOptBtn={(groupItem) => {
                            return (
                                <>
                                    <YakitButton
                                        icon={<OutlinePencilaltIcon />}
                                        type='text2'
                                        onClick={(e) => setEditGroup(groupItem)}
                                    ></YakitButton>
                                    <YakitButton
                                        icon={<OutlineTrashIcon />}
                                        type='text'
                                        colors='danger'
                                        onClick={(e) => onClickBtn(groupItem)}
                                    ></YakitButton>
                                </>
                            )
                        }}
                        extraHideMenu={(groupItem) => {
                            return (
                                <YakitDropdownMenu
                                    menu={{
                                        data: [
                                            {
                                                key: "rename",
                                                label: (
                                                    <div className={styles["extra-opt-menu"]}>
                                                        <OutlinePencilaltIcon />
                                                        <div className={styles["extra-opt-name"]}>重命名</div>
                                                    </div>
                                                )
                                            },
                                            {
                                                key: "delete",
                                                label: (
                                                    <div className={styles["extra-opt-menu"]}>
                                                        <OutlineTrashIcon />
                                                        <div className={styles["extra-opt-name"]}>删除</div>
                                                    </div>
                                                ),
                                                type: "danger"
                                            }
                                        ],
                                        onClick: ({key}) => {
                                            setMenuOpen(false)
                                            switch (key) {
                                                case "rename":
                                                    setEditGroup(groupItem)
                                                    break
                                                case "delete":
                                                    onClickBtn(groupItem)
                                                    break
                                                default:
                                                    break
                                            }
                                        }
                                    }}
                                    dropdown={{
                                        trigger: ["click"],
                                        placement: "bottomRight",
                                        onVisibleChange: (v) => {
                                            setMenuOpen(v)
                                        },
                                        visible: menuOpen
                                    }}
                                >
                                    <SolidDotsverticalIcon
                                        className={styles["dot-icon"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    />
                                </YakitDropdownMenu>
                            )
                        }}
                        onActiveGroup={onActiveGroup}
                    ></PluginGroupList>
                </div>
            )}
            {groupList.length <= 2 && (
                <div className={styles["plugin-local-empty"]}>
                    <YakitEmpty
                        title='暂无数据'
                        description='可一键获取官方默认分组，或勾选插件新建分组'
                        style={{marginTop: 80}}
                    />
                    <div className={styles["plugin-local-buttons"]}>
                        <YakitButton
                            type='outline1'
                            icon={<CloudDownloadIcon />}
                            onClick={() => setVisibleOnline(true)}
                        >
                            一键下载
                        </YakitButton>
                    </div>
                </div>
            )}
            {visibleOnline && <YakitGetOnlinePlugin visible={visibleOnline} setVisible={setVisibleOnline} refreshCallBack={getGroupList} />}
            {/* 删除确认框 */}
            <DelGroupConfirmPop
                ref={delGroupConfirmPopRef}
                visible={delGroupConfirmPopVisible}
                onCancel={() => {
                    setDelGroup(undefined)
                    setDelGroupConfirmPopVisible(false)
                }}
                delGroupName={delGroup?.name || ""}
                onOk={() => {
                    if (!delGroup) return
                    onGroupDel(delGroup, () => {
                        setDelGroup(undefined)
                        setRemoteValue(
                            RemoteGV.PluginGroupDelNoPrompt,
                            delGroupConfirmPopRef.current.delGroupConfirmNoPrompt + ""
                        )
                        setDelGroupConfirmPopVisible(false)
                    })
                }}
            ></DelGroupConfirmPop>
        </>
    )
}
