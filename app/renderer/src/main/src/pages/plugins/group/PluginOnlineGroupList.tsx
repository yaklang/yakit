import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {SolidFolderopenIcon, SolidQuestionmarkcircleIcon, SolidViewgridIcon} from "@/assets/icon/solid"
import {GroupListItem, PluginGroupList} from "./PluginGroupList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {GroupCount} from "@/pages/invoker/schema"
import emiter from "@/utils/eventBus/eventBus"

interface PluginOnlineGroupListProps {
    pluginsGroupsInViewport: boolean
    onOnlineGroupLen: (len: number) => void
    activeOnlineGroup?: GroupListItem
    onActiveGroup: (groupItem: GroupListItem) => void
}
export const PluginOnlineGroupList: React.FC<PluginOnlineGroupListProps> = (props) => {
    const {pluginsGroupsInViewport, onOnlineGroupLen, activeOnlineGroup} = props
    const [groupList, setGroupList] = useState<GroupListItem[]>([]) // 组数据
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
        const groupItem = {icon: <SolidFolderopenIcon />, iconColor: "var(--yakit-primary-5)", showOptBtns: true}
        return isDefault ? noGroupItem[groupName][field] : groupItem[field]
    }

    // 获取组列表数据
    const getGroupList = () => {
        // apiFetchQueryYakScriptGroupLocal().then((group: GroupCount[]) => {
        //     const copyGroup = structuredClone(group)
        //     const arr = copyGroup.map((item) => {
        //         const obj = {
        //             id: item.Default ? item.Value : item.Value + "_group",
        //             name: item.Value,
        //             number: item.Total,
        //             icon: assemblyExtraField(item.Default, item.Value, "icon"),
        //             iconColor: assemblyExtraField(item.Default, item.Value, "iconColor"),
        //             showOptBtns: assemblyExtraField(item.Default, item.Value, "showOptBtns"),
        //             default: item.Default
        //         }
        //         return obj
        //     })
        //     setGroupList(arr)
        //     onOnlineGroupLen(arr.length - 2 > 0 ? arr.length - 2 : 0)
        // })
    }

    // 插件组名input失焦
    const onEditGroupNameBlur = (groupItem: GroupListItem, newName: string) => {
        setEditGroup(undefined)
        if (!newName || newName === groupItem.name) return
        // apiFetchRenameYakScriptGroupLocal(groupItem.name, newName).then(() => {
        //     getGroupList()
        //     if (activeOnlineGroup?.default === false && activeOnlineGroup.name === newName) {
        //         emiter.emit("onRefPluginGroupMagOnlinePluginList", "")
        //     }
        // })
    }

    // 插件组删除
    const onGroupDel = (groupItem: GroupListItem, callBack?: () => void) => {
        // apiFetchDeleteYakScriptGroupLocal(groupItem.name).then(() => {
        //     getGroupList()
        //     callBack && callBack()
        // })
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
                    onActiveGroup={(groupItem) => {}}
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
            // setDelGroupConfirmNoPrompt(false)
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
