import {yakitNotify} from "@/utils/notification"
import {Alert, Space} from "antd"
import {getReleaseEditionName} from "./envfile"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"

const {ipcRenderer} = window.require("electron")

export const invalidCacheAndUserData = (delTemporaryProject) => {
    let checked = false
    const m = showYakitModal({
        type: "white",
        title: "重置用户数据与缓存",
        content: (
            <Space direction={"vertical"} style={{width: "100%", padding: 20}}>
                <Alert
                    type='success'
                    message={`如果你的 ${getReleaseEditionName()} 出现异常，可使用此功能删除所有本地缓存和用户数据，重连重启。`}
                />
                <Alert type='success' message='注意，本操作将永久删除缓存数据，难以恢复，请谨慎操作' />
                <YakitCheckbox onChange={(e) => (checked = e.target.checked)}>同步删除所有数据库内的数据</YakitCheckbox>
            </Space>
        ),
        width: 700,
        onOkText: "我确认此风险，立即删除",
        okButtonProps: {
            danger: true
        },
        onOk: async () => {
            m.destroy()
            await delTemporaryProject()
            ipcRenderer
                .invoke("ResetAndInvalidUserData", {OnlyClearCache: !checked})
                .then(() => {})
                .catch((e) => {})
                .finally(() => {
                    yakitNotify("success", "执行重置用户数据成功")
                })
        }
    })
}
