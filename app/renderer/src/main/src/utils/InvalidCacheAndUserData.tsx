import {yakitNotify} from "@/utils/notification"
import {Alert, Space} from "antd"
import {getReleaseEditionName} from "./envfile"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import i18n from "@/i18n/i18n"

const t = i18n.getFixedT(null, "utils")

const {ipcRenderer} = window.require("electron")

export const invalidCacheAndUserData = (delTemporaryProject) => {
    let checked = false
    const m = showYakitModal({
        type: "white",
        title: t("basic.InvalidCacheAndUserData.title"),
        content: (
            <Space direction={"vertical"} style={{width: "100%", padding: 20}}>
                <Alert
                    type='success'
                    message={t("basic.InvalidCacheAndUserData.resetHint", {name: getReleaseEditionName()})}
                />
                <Alert type='success' message={t("basic.InvalidCacheAndUserData.warning")} />
                <YakitCheckbox onChange={(e) => (checked = e.target.checked)}>{t("basic.InvalidCacheAndUserData.syncDeleteDatabase")}</YakitCheckbox>
            </Space>
        ),
        width: 700,
        onOkText: t("basic.InvalidCacheAndUserData.confirmDelete"),
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
                yakitNotify("success", t("basic.InvalidCacheAndUserData.resetSuccess"))
            })
        }
    })
}
