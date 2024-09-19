import React, {useEffect, useState} from "react"
import {Alert, Form, Tooltip} from "antd"
import {yakitNotify} from "@/utils/notification"
import {getReleaseEditionName} from "./envfile"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {QuestionMarkCircleIcon} from "@/assets/newIcon"
const {ipcRenderer} = window.require("electron")

export interface ConfigPcapPermissionFormProp {
    onClose: () => any
}

export const ConfigPcapPermissionForm: React.FC<ConfigPcapPermissionFormProp> = (props) => {
    const [response, setResponse] = useState<{
        IsPrivileged: boolean
        Advice: string
        AdviceVerbose: string
    }>({Advice: "unknown", AdviceVerbose: "无法获取 PCAP 支持信息", IsPrivileged: false})
    const [platform, setPlatform] = useState("")

    useEffect(() => {
        ipcRenderer
            .invoke("IsPrivilegedForNetRaw", {})
            .then(setResponse)
            .catch((e) => {
                yakitNotify("error", `获取 Pcap 权限状态失败：${e}`)
            })
            .finally(() => {
                ipcRenderer
                    .invoke("fetch-system-and-arch")
                    .then((e: string) => setPlatform(e))
                    .catch((e) => {
                        yakitNotify("error", `获取 ${getReleaseEditionName()} 操作系统失败：${e}`)
                    })
            })
    }, [])

    const isWindows = platform.toLowerCase().startsWith("win")

    return (
        <Form
            style={{paddingTop: 20}}
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
            onSubmitCapture={(e) => {
                e.preventDefault()

                ipcRenderer
                    .invoke(`PromotePermissionForUserPcap`, {})
                    .then(() => {
                        if (props?.onClose) {
                            props.onClose()
                        }
                    })
                    .catch((e) => {
                        yakitNotify("error", `提升 Pcap 用户权限失败：${e}`)
                    })
            }}
        >
            <Form.Item
                label={" "}
                colon={false}
                help={
                    <>
                        <Tooltip
                            title={
                                "原理：MacOS 通过设置 /dev/bpf* 权限组，可参考 Wireshark ChmodBPF 相关配置，Linux 可通过 setcap 命令设置 pcap 权限，Windows 推荐直接以 UAC 提升管理员权限启动"
                            }
                        >
                            <YakitButton type={"text"} icon={<QuestionMarkCircleIcon />} />
                        </Tooltip>
                        {isWindows
                            ? `Windows 可用管理员权限启动 ${getReleaseEditionName()} 以获取对 Pcap 的使用权限`
                            : "Linux 与 MacOS 可通过设置权限与组为用户态赋予网卡完全权限"}
                    </>
                }
            >
                {response.IsPrivileged ? (
                    <Alert type={"success"} message={`您可以正常试用 SYN 扫描等功能，无需修复`} />
                ) : (
                    <Alert type={"warning"} message={`当前引擎不具有网卡操作权限`} />
                )}
            </Form.Item>
            {response.IsPrivileged ? (
                <Form.Item label={" "} colon={false}>
                    {props?.onClose && (
                        <YakitButton
                            onClick={() => {
                                props.onClose()
                            }}
                        >
                            知道了～
                        </YakitButton>
                    )}
                </Form.Item>
            ) : (
                <Form.Item label={" "} colon={false}>
                    <YakitButton htmlType={"submit"} type={"primary"}>
                        开启 PCAP 权限
                    </YakitButton>
                    <Tooltip title={`${response.AdviceVerbose}: ${response.Advice}`}>
                        <YakitButton type={"text"}>手动修复</YakitButton>
                    </Tooltip>
                </Form.Item>
            )}
        </Form>
    )
}

export const showPcapPermission = () => {
    const m = showYakitModal({
        type: "white",
        title: "修复 Pcap 权限",
        width: "50%",
        content: (
            <ConfigPcapPermissionForm
                onClose={() => {
                    m.destroy()
                }}
            />
        ),
        footer: null
    })
}
