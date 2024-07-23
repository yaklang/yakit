import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {SolidFolderopenIcon} from "@/assets/icon/solid"
import {PluginGroupList, GroupListItem} from "./PluginGroupList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {
    apiFetchDeleteYakScriptGroupLocal,
    apiFetchDeleteYakScriptGroupOnline,
    apiFetchQueryYakScriptGroupLocal,
    apiFetchQueryYakScriptGroupOnline,
    apiFetchRenameYakScriptGroupLocal,
    apiFetchRenameYakScriptGroupOnline,
    PluginGroupDel,
    PluginGroupRename
} from "../../plugins/utils"
import {GroupCount} from "@/pages/invoker/schema"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {CloudDownloadIcon} from "@/assets/newIcon"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import styles from "./PluginOperationGroupList.module.scss"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {API} from "@/services/swagger/resposeType"
import {isEnpriTraceAgent} from "@/utils/envfile"

export interface PluginOperationGroupListRefProps {
    groupList: GroupListItem[]
    changeGroupListFlag: boolean
    setChangeGroupListFlag: (flag: boolean) => void
    getGroupList: () => void
    setVisibleOnline: (visible: boolean) => void
}
interface PluginOperationGroupListProps {
    ref: React.ForwardedRef<PluginOperationGroupListRefProps>
    groupType: "online" | "local"
    judgeOnlineStatus: boolean
    onGroupLen: (len: number) => void
}
export const PluginOperationGroupList: React.FC<PluginOperationGroupListProps> = React.forwardRef((props, ref) => {
    const {groupType, judgeOnlineStatus, onGroupLen} = props
    const [groupList, setGroupList] = useState<GroupListItem[]>([])
    const [editGroup, setEditGroup] = useState<GroupListItem>() // 编辑插件组
    const [delGroup, setDelGroup] = useState<GroupListItem>() // 删除插件组
    const [delGroupConfirmPopVisible, setDelGroupConfirmPopVisible] = useState<boolean>(false)
    const delGroupConfirmPopRef = useRef<any>()
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
    const [changeGroupListFlag, setChangeGroupListFlag] = useState<boolean>(false)

    useImperativeHandle(
        ref,
        () => ({
            groupList,
            changeGroupListFlag,
            setChangeGroupListFlag,
            setVisibleOnline,
            getGroupList
        }),
        [groupList, changeGroupListFlag]
    )

    useEffect(() => {
        setChangeGroupListFlag(false)
        getGroupList()
    }, [])

    // 获取组列表数据
    const getGroupList = () => {
        if (groupType === "local") {
            apiFetchQueryYakScriptGroupLocal(false, []).then((group: GroupCount[]) => {
                const copyGroup = [...group]
                const arr = copyGroup.map((item) => {
                    const obj = {
                        id: item.Value + "_group",
                        name: item.Value,
                        number: item.Total,
                        icon: <SolidFolderopenIcon />,
                        iconColor: "#ffb660",
                        showOptBtns: true,
                        default: item.Default
                    }
                    return obj
                })
                setGroupList(arr)
                onGroupLen(arr.length)
            })
        } else if (judgeOnlineStatus) {
            apiFetchQueryYakScriptGroupOnline().then((res: API.GroupResponse) => {
                const data = res.data || []
                // 线上 前端过滤掉默认的全部和未分组
                const copyGroup = data.filter((item) => !item.default)
                // 便携版 若未返回基础扫描 前端自己筛一个进去
                if (isEnpriTraceAgent()) {
                    const findBasicScanningIndex = copyGroup.findIndex((item) => item.value === "基础扫描")
                    if (findBasicScanningIndex === -1) {
                        copyGroup.unshift({value: "基础扫描", total: 0, default: false})
                    } else {
                        const removedItem = copyGroup.splice(findBasicScanningIndex, 1)
                        copyGroup.unshift(removedItem[0])
                    }
                }
                const arr = copyGroup.map((item) => {
                    const obj = {
                        id: item.default ? item.value : item.value + "_group",
                        name: item.value,
                        number: item.total,
                        icon: <SolidFolderopenIcon />,
                        iconColor: "#ffb660",
                        showOptBtns: true,
                        default: item.default
                    }
                    // 便携版 基础扫描不允许编辑删除操作
                    if (isEnpriTraceAgent() && item.value === "基础扫描") {
                        obj.showOptBtns = false
                    }
                    return obj
                })
                setGroupList(arr)
                onGroupLen(arr.length)
            })
        }
    }

    // 插件组名input失焦
    const onEditGroupNameBlur = (groupItem: GroupListItem, newName: string) => {
        setEditGroup(undefined)
        if (!newName || newName === groupItem.name) return
        if (groupType === "local") {
            apiFetchRenameYakScriptGroupLocal(groupItem.name, newName).then(() => {
                setChangeGroupListFlag(true)
                getGroupList()
            })
        } else if (judgeOnlineStatus) {
            const params: PluginGroupRename = {group: groupItem.name, newGroup: newName}
            apiFetchRenameYakScriptGroupOnline(params).then(() => {
                setChangeGroupListFlag(true)
                getGroupList()
            })
        }
    }

    // 点击删除
    const onClickDel = (groupItem: GroupListItem) => {
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
        if (groupType === "local") {
            apiFetchDeleteYakScriptGroupLocal(groupItem.name).then(() => {
                setChangeGroupListFlag(true)
                getGroupList()
                callBack && callBack()
            })
        } else if (judgeOnlineStatus) {
            const params: PluginGroupDel = {group: groupItem.name}
            apiFetchDeleteYakScriptGroupOnline(params).then(() => {
                setChangeGroupListFlag(true)
                getGroupList()
                callBack && callBack()
            })
        }
    }

    return (
        <>
            {groupList.length > 0 ? (
                <div
                    style={{
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
                                        onClick={(e) => onClickDel(groupItem)}
                                    ></YakitButton>
                                </>
                            )
                        }}
                    ></PluginGroupList>
                </div>
            ) : (
                <div className={styles["plugin-local-empty"]}>
                    {groupType === "local" ? (
                        <>
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
                        </>
                    ) : (
                        <YakitEmpty title='暂无数据' style={{marginTop: 80}} />
                    )}
                </div>
            )}
            {visibleOnline && (
                <YakitGetOnlinePlugin
                    visible={visibleOnline}
                    isRereshLocalPluginList={false}
                    setVisible={(v) => {
                        setChangeGroupListFlag(true)
                        setVisibleOnline(v)
                        getGroupList()
                    }}
                />
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
})

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

interface ListDelGroupConfirmPopProps {
    ref: React.Ref<any>
    visible: boolean
    onCancel: () => void
    content: string
    onOk: () => void
}
export const ListDelGroupConfirmPop: React.FC<ListDelGroupConfirmPopProps> = React.forwardRef((props, ref) => {
    const {visible, onCancel, onOk, content} = props
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
            title='插件组移除插件'
            content={content}
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
