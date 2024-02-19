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
import {isEnpriTraceAgent} from "@/utils/envfile"

interface PluginLocalGroupListProps {
    pluginsGroupsInViewport: boolean
    onLocalGroupLen: (len: number) => void
    activeLocalGroup?: GroupListItem
    onActiveGroup: (groupItem: GroupListItem) => void
}
export const PluginLocalGroupList: React.FC<PluginLocalGroupListProps> = (props) => {
    const {pluginsGroupsInViewport, onLocalGroupLen, activeLocalGroup, onActiveGroup} = props
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
        const groupItem = {icon: <SolidFolderopenIcon />, iconColor: "var(--yakit-primary-5)", showOptBtns: true}
        return isDefault ? noGroupItem[groupName][field] : groupItem[field]
    }

    // 获取组列表数据
    const getGroupList = () => {
        apiFetchQueryYakScriptGroupLocal().then((group: GroupCount[]) => {
            const copyGroup = structuredClone(group)
            // 便携版 若未返回基础扫描 前端自己筛一个进去
            if (isEnpriTraceAgent()) {
                const findBasicScanningIndex = copyGroup.findIndex((item) => item.Value === "基础扫描")
                if (findBasicScanningIndex === -1) {
                    const findNotGroupIndex = copyGroup.findIndex((item) => item.Value === "未分组" && item.Default)
                    copyGroup.splice(findNotGroupIndex + 1, 0, {Value: "基础扫描", Total: 0, Default: false})
                }
            }
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
                // 便携版 基础扫描不允许编辑删除操作
                if (isEnpriTraceAgent() && item.Value === "基础扫描") {
                    obj.showOptBtns = false
                }
                return obj
            })
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
            if (activeLocalGroup?.default === false && activeLocalGroup.name === newName) {
                emiter.emit("onRefPluginGroupMagLocalPluginList", "")
            }
        })
    }

    // 插件组删除
    const onGroupDel = (groupItem: GroupListItem, callBack?: () => void) => {
        apiFetchDeleteYakScriptGroupLocal(groupItem.name).then(() => {
            getGroupList()
            // 如果当前选中组为固定的未分组 刷新右侧插件列表
            if (activeLocalGroup?.default && activeLocalGroup.id === '未分组') {
                emiter.emit("onRefPluginGroupMagLocalPluginList", "")
            }
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
