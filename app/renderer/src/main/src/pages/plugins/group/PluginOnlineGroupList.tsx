import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    SolidDotsverticalIcon,
    SolidFolderopenIcon,
    SolidQuestionmarkcircleIcon,
    SolidViewgridIcon
} from "@/assets/icon/solid"
import {GroupListItem, PluginGroupList} from "./PluginGroupList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import emiter from "@/utils/eventBus/eventBus"
import {
    PluginGroupDel,
    PluginGroupRename,
    apiFetchDeleteYakScriptGroupOnline,
    apiFetchQueryYakScriptGroupOnline,
    apiFetchRenameYakScriptGroupOnline
} from "../utils"
import {API} from "@/services/swagger/resposeType"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import styles from "./PluginOnlineGroupList.module.scss"
import { isEnpriTraceAgent } from "@/utils/envfile"

interface PluginOnlineGroupListProps {
    pluginsGroupsInViewport: boolean
    onOnlineGroupLen: (len: number) => void
    activeOnlineGroup?: GroupListItem
    onActiveGroup: (groupItem: GroupListItem) => void
}
export const PluginOnlineGroupList: React.FC<PluginOnlineGroupListProps> = (props) => {
    const {pluginsGroupsInViewport, onOnlineGroupLen, activeOnlineGroup, onActiveGroup} = props
    const [groupList, setGroupList] = useState<GroupListItem[]>([]) // 组数据
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const [editGroup, setEditGroup] = useState<GroupListItem>() // 编辑插件组
    const [delGroup, setDelGroup] = useState<GroupListItem>() // 删除插件组
    const [delGroupConfirmPopVisible, setDelGroupConfirmPopVisible] = useState<boolean>(false)
    const [pluginGroupDelNoPrompt, setPluginGroupDelNoPrompt] = useState<boolean>(false)
    const delGroupConfirmPopRef = useRef<any>()

    useEffect(() => {
        getGroupList()
        getRemoteValue(RemoteGV.PluginGroupDelNoPrompt).then((result: string) => {
            setPluginGroupDelNoPrompt(result === "true")
        })
    }, [pluginsGroupsInViewport])

    useEffect(() => {
        emiter.on("onRefPluginGroupMagOnlineQueryYakScriptGroup", getGroupList)
        return () => {
            emiter.off("onRefPluginGroupMagOnlineQueryYakScriptGroup", getGroupList)
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
        apiFetchQueryYakScriptGroupOnline().then((res: API.GroupResponse) => {
            const copyGroup = structuredClone(res.data)
            // 便携版 若未返回基础扫描 前端自己筛一个进去
            if (isEnpriTraceAgent()) {
                const findBasicScanningIndex = copyGroup.findIndex((item) => item.value === "基础扫描")
                const findNotGroupIndex = copyGroup.findIndex((item) => item.value === "未分组" && item.default)
                if (findBasicScanningIndex === -1) {
                    copyGroup.splice(findNotGroupIndex + 1, 0, {value: "基础扫描", total: 0, default: false})
                } else {
                    const removedItem = copyGroup.splice(findBasicScanningIndex, 1)
                    copyGroup.splice(findNotGroupIndex + 1, 0, removedItem[0])
                }
            }
            const arr = copyGroup.map((item) => {
                const obj = {
                    id: item.default ? item.value : item.value + "_group",
                    name: item.value,
                    number: item.total,
                    icon: assemblyExtraField(item.default, item.value, "icon"),
                    iconColor: assemblyExtraField(item.default, item.value, "iconColor"),
                    showOptBtns: assemblyExtraField(item.default, item.value, "showOptBtns"),
                    default: item.default
                }
                // 便携版 基础扫描不允许编辑删除操作
                if (isEnpriTraceAgent() && item.value === "基础扫描") {
                    obj.showOptBtns = false
                }
                return obj
            })
            setGroupList(arr)
            onOnlineGroupLen(arr.length - 2 > 0 ? arr.length - 2 : 0)
        })
    }

    // 插件组名input失焦
    const onEditGroupNameBlur = (groupItem: GroupListItem, newName: string, successCallback: () => void) => {
        setEditGroup(undefined)
        if (!newName || newName === groupItem.name) return
        const params: PluginGroupRename = {group: groupItem.name, newGroup: newName}
        apiFetchRenameYakScriptGroupOnline(params).then(() => {
            successCallback()
            getGroupList()
            if (activeOnlineGroup?.default === false && activeOnlineGroup.name === newName) {
                emiter.emit("onRefPluginGroupMagOnlinePluginList", "")
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
        const params: PluginGroupDel = {group: groupItem.name}
        apiFetchDeleteYakScriptGroupOnline(params).then(() => {
            getGroupList()
            // 如果当前选中组为固定的未分组 刷新右侧插件列表
            if (activeOnlineGroup?.default && activeOnlineGroup.id === "未分组") {
                emiter.emit("onRefPluginGroupMagOnlinePluginList", "")
            }
            callBack && callBack()
        })
    }

    return (
        <>
            {!!groupList.length && (
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
            )}

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

interface DelGroupConfirmPopProps {
    ref: React.Ref<any>
    visible: boolean
    onCancel: () => void
    delGroupName: string
    onOk: () => void
}

export const DelGroupConfirmPop: React.FC<DelGroupConfirmPopProps> = React.forwardRef((props, ref) => {
    const {visible, onCancel, onOk, delGroupName} = props
    const [delGroupConfirmNoPrompt, setDelGroupConfirmNoPrompt] = useState<boolean>(false)

    useEffect(() => {
        if (visible) {
            setDelGroupConfirmNoPrompt(false)
        }
    }, [visible])

    useImperativeHandle(
        ref,
        () => ({
            delGroupConfirmNoPrompt
        }),
        [delGroupConfirmNoPrompt]
    )

    return (
        <YakitHint
            visible={visible}
            title='删除组'
            content={`是否确认删除插件组 “${delGroupName}”`}
            footerExtra={
                <YakitCheckbox
                    value={delGroupConfirmNoPrompt}
                    checked={delGroupConfirmNoPrompt}
                    onChange={(e) => setDelGroupConfirmNoPrompt(e.target.checked)}
                >
                    下次不再提醒
                </YakitCheckbox>
            }
            onOk={onOk}
            onCancel={onCancel}
        />
    )
})
