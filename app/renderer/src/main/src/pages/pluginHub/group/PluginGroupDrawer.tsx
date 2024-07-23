import React, {useMemo, useRef, useState} from "react"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {PluginOperationGroupListRefProps, PluginOperationGroupList} from "./PluginOperationGroupList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidPlusIcon} from "@/assets/icon/solid"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {Form, Tooltip} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    apiFetchAddYakScriptGroupLocal,
    apiFetchAddYakScriptGroupOnline,
    apiFetchResetYakScriptGroup
} from "@/pages/plugins/utils"
import {yakitNotify} from "@/utils/notification"
import {useStore} from "@/store"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import styles from "./PluginGroupDrawer.module.scss"

export interface PluginFroupMagDrawerProp {
    groupType: "online" | "local"
    visible: boolean
    onClose: (changeGroupListFlag: boolean) => void
}
export const PluginGroupDrawer: React.FC<PluginFroupMagDrawerProp> = (props) => {
    const {groupType, visible, onClose} = props
    const [groupLen, setGroupLen] = useState<number>(0)
    const [form] = Form.useForm()
    const [resetLoading, setResetLoading] = useState<boolean>(false)
    const pluginOperationGroupListRef = useRef<PluginOperationGroupListRefProps>(null)
    const userInfo = useStore((s) => s.userInfo)
    // 判断是否是 管理员或者超级管理员权限
    const judgeOnlineStatus = useMemo(() => {
        const flag = ["admin", "superAdmin"].includes(userInfo.role || "") && groupType === "online"
        return flag
    }, [userInfo.role, groupType])

    // 新增分组
    const addNewGroup = () => {
        let m = showYakitModal({
            title: "新增分组",
            width: 500,
            footer: null,
            closable: true,
            maskClosable: false,
            centered: true,
            destroyOnClose: true,
            content: (
                <Form
                    form={form}
                    layout={"horizontal"}
                    labelCol={{span: 5}}
                    wrapperCol={{span: 18}}
                    onSubmitCapture={(e) => {
                        e.preventDefault()
                    }}
                    style={{margin: "24px 0"}}
                >
                    <Form.Item label={"组名"} rules={[{required: true, message: "请填写组名"}]} name={"groupName"}>
                        <YakitInput />
                    </Form.Item>
                    <div className={styles["add-new-group-btns"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                form.setFieldsValue({groupName: ""})
                                m.destroy()
                            }}
                        >
                            取消
                        </YakitButton>
                        <YakitButton
                            type={"primary"}
                            onClick={() => {
                                form.validateFields().then((res) => {
                                    const index = pluginOperationGroupListRef.current?.groupList.findIndex(
                                        (item) => item.name === res.groupName
                                    )
                                    if (index !== -1) {
                                        yakitNotify("info", "新增组名已存在")
                                    } else {
                                        if (groupType === "local") {
                                            apiFetchAddYakScriptGroupLocal(res.groupName).then(() => {
                                                m.destroy()
                                                pluginOperationGroupListRef.current?.getGroupList()
                                                pluginOperationGroupListRef.current?.setChangeGroupListFlag(true)
                                            })
                                        } else if (judgeOnlineStatus) {
                                            apiFetchAddYakScriptGroupOnline(res.groupName).then(() => {
                                                m.destroy()
                                                pluginOperationGroupListRef.current?.getGroupList()
                                                pluginOperationGroupListRef.current?.setChangeGroupListFlag(true)
                                            })
                                        }
                                    }
                                })
                            }}
                        >
                            确定
                        </YakitButton>
                    </div>
                </Form>
            ),
            modalAfterClose: () => {
                form.setFieldsValue({groupName: ""})
            }
        })
    }

    return (
        <YakitDrawer
            visible={visible}
            onClose={() => onClose(pluginOperationGroupListRef.current?.changeGroupListFlag === true)}
            width='500px'
            title={
                <div className={styles["group-drawer-title"]}>
                    <div className={styles["group-drawer-title-left"]}>
                        插件组管理
                        <span className={styles["plugin-groups-number"]}>{groupLen}</span>
                    </div>
                    <div className={styles["group-drawer-title-right"]}>
                        {groupType === "local" && (
                            <>
                                <Tooltip title='重置将把插件分组全部删除，并重新下载线上分组'>
                                    <YakitButton
                                        type='text'
                                        colors='danger'
                                        onClick={() => {
                                            const m = showYakitModal({
                                                title: "重置",
                                                onOkText: "确认",
                                                centered: true,
                                                onOk: () => {
                                                    m.destroy()
                                                    setResetLoading(true)
                                                    apiFetchResetYakScriptGroup({Token: userInfo.token})
                                                        .then(() => {
                                                            pluginOperationGroupListRef.current?.getGroupList()
                                                            pluginOperationGroupListRef.current?.setChangeGroupListFlag(
                                                                true
                                                            )
                                                        })
                                                        .finally(() => {
                                                            setResetLoading(false)
                                                        })
                                                },
                                                content: (
                                                    <div style={{margin: 15}}>
                                                        重置将删除本地所有分组，并重新下载所有线上插件，是否重置？
                                                    </div>
                                                ),
                                                onCancel: () => {
                                                    m.destroy()
                                                }
                                            })
                                        }}
                                        disabled={resetLoading}
                                    >
                                        重置
                                    </YakitButton>
                                </Tooltip>
                                <div className='divider-style'></div>
                            </>
                        )}
                        <YakitButton type='text' icon={<SolidPlusIcon />} onClick={addNewGroup} disabled={resetLoading}>
                            新增分组
                        </YakitButton>
                    </div>
                </div>
            }
        >
            {visible ? (
                <div className={styles["group-drawer-cont-wrapper"]}>
                    <YakitSpin spinning={resetLoading} tip='重置中...'>
                        <PluginOperationGroupList
                            ref={pluginOperationGroupListRef}
                            groupType={groupType}
                            judgeOnlineStatus={judgeOnlineStatus}
                            onGroupLen={setGroupLen}
                        ></PluginOperationGroupList>
                    </YakitSpin>
                </div>
            ) : null}
        </YakitDrawer>
    )
}
