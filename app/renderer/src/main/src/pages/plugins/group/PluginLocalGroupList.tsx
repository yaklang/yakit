import React, {useEffect, useRef, useState} from "react"
import {SolidFolderopenIcon, SolidQuestionmarkcircleIcon, SolidViewgridIcon} from "@/assets/icon/solid"
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

interface PluginLocalGroupListProps {
    onLocalGroupLen: (len: number) => void
    activeLocalGroup?: GroupListItem
    onActiveGroup: (groupItem: GroupListItem) => void
}
export const PluginLocalGroupList: React.FC<PluginLocalGroupListProps> = (props) => {
    const {onLocalGroupLen, activeLocalGroup, onActiveGroup} = props
    const [groupList, setGroupList] = useState<GroupListItem[]>([])
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
    }, [])

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
        const groupItem = {icon: <SolidFolderopenIcon />, iconColor: "var(--yakit-primary-5)", showOptBtns: true}
        return isDefault ? noGroupItem[groupName][field] : groupItem[field]
    }

    // 获取组列表数据
    const getGroupList = () => {
        apiFetchQueryYakScriptGroupLocal().then((group: GroupCount[]) => {
            const arr = group.map((item) => ({
                id: item.Default ? item.Value : item.Value + "_group",
                name: item.Value,
                number: item.Total,
                icon: assemblyExtraField(item.Default, item.Value, "icon"),
                iconColor: assemblyExtraField(item.Default, item.Value, "iconColor"),
                showOptBtns: assemblyExtraField(item.Default, item.Value, "showOptBtns"),
                default: item.Default
            }))
            setGroupList(arr)
            onLocalGroupLen(arr.length - 2 > 0 ? arr.length - 2 : 0)
        })
    }

    // 插件组名input失焦
    const onEditGroupNameBlur = (groupItem: GroupListItem, newName: string) => {
        setEditGroup(undefined)
        if (!newName || newName === groupItem.name) return
        apiFetchRenameYakScriptGroupLocal(groupItem.name, newName).then(() => {
            getGroupList()
            // BUG 一个组里面后端查出相同插件 当前选中组的名字 与其他组的新名字相同的话 需要刷新插件列表
            if (activeLocalGroup?.default === false && activeLocalGroup.name === newName) {
                emiter.emit("onRefPluginGroupMagLocalPluginList", "")
            }
        })
    }

    // BUG 后端删除数据 会导致所有组被删除 插件组删除
    const onGroupDel = (groupItem: GroupListItem, callBack?: () => void) => {
        apiFetchDeleteYakScriptGroupLocal(groupItem.name).then(() => {
            getGroupList()
            callBack && callBack()
        })
    }

    return (
        <>
            {groupList.length && (
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
                                    onClick={(e) => {
                                        setEditGroup(groupItem)
                                    }}
                                ></YakitButton>
                                <YakitButton
                                    icon={<OutlineTrashIcon />}
                                    type='text'
                                    colors='danger'
                                    onClick={(e) => {
                                        setDelGroup(groupItem)
                                        if (!pluginGroupDelNoPrompt) {
                                            setDelGroupConfirmPopVisible(true)
                                        } else {
                                            setDelGroup(undefined)
                                            onGroupDel(groupItem)
                                        }
                                    }}
                                ></YakitButton>
                            </>
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
