import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import {SolidFolderopenIcon, SolidQuestionmarkcircleIcon, SolidViewgridIcon} from "@/assets/icon/solid"
import {PluginGroupList} from "./PluginGroupList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"

const testGroupList = [
    {
        groupName: "全部",
        pluginNumer: 123,
        showOptBtns: false,
        icon: <SolidViewgridIcon />,
        iconColor: "#56c991"
    },
    {
        groupName: "未分组",
        pluginNumer: 456,
        showOptBtns: false,
        icon: <SolidQuestionmarkcircleIcon />,
        iconColor: "#8863f7"
    },
    {
        groupName: "test",
        pluginNumer: 1,
        showOptBtns: true,
        icon: <SolidFolderopenIcon />,
        iconColor: "var(--yakit-primary-5)"
    },
    {
        groupName: "test2",
        pluginNumer: 1,
        showOptBtns: true,
        icon: <SolidFolderopenIcon />,
        iconColor: "var(--yakit-primary-5)"
    }
]

interface PluginOnlineGroupListProps {
    onOnlineGroupLen: (len: number) => void
}
export const PluginOnlineGroupList: React.FC<PluginOnlineGroupListProps> = (props) => {
    const {onOnlineGroupLen} = props
    const [groupList, setGroupList] = useState<any>(testGroupList) // 组数据
    const [editGroup, setEditGroup] = useState<any>({}) // 编辑插件组
    const [delGroup, setDelGroup] = useState<any>({}) // 删除插件组

    const [delGroupConfirmPopVisible, setDelGroupConfirmPopVisible] = useState<boolean>(false)
    const [pluginGroupDelNoPrompt, setPluginGroupDelNoPrompt] = useState<boolean>(false)
    const delGroupConfirmPopRef = useRef<any>()

    useEffect(() => {
        getRemoteValue(RemoteGV.PluginGroupDelNoPrompt).then((result: string) => {
            setPluginGroupDelNoPrompt(result === "true")
        })
    }, [])

    return (
        <>
            <PluginGroupList
                data={groupList}
                editGroup={editGroup}
                onEditInputBlur={(groupItem, editGroupNewName) => {
                    setEditGroup({})
                    if (!editGroupNewName || editGroupNewName === groupItem.name) return
                    // TODO 更新插件名
                }}
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
                                        // TODO 删除
                                    }
                                }}
                            ></YakitButton>
                        </>
                    )
                }}
                onActiveGroup={(groupItem) => {}}
            ></PluginGroupList>
            {/* 删除确认框 */}
            <DelGroupConfirmPop
                ref={delGroupConfirmPopRef}
                visible={delGroupConfirmPopVisible}
                onCancel={() => {
                    setDelGroupConfirmPopVisible(false)
                }}
                delGroupName={delGroup.groupName || ""}
                onOk={() => {
                    // TODO 删除
                    setRemoteValue(
                        RemoteGV.PluginGroupDelNoPrompt,
                        delGroupConfirmPopRef.current.delGroupConfirmNoPrompt + ""
                    )
                    setDelGroupConfirmPopVisible(false)
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
