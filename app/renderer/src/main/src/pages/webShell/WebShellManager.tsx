import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {failed, success} from "@/utils/notification";
import {ExclamationCircleOutlined} from "@ant-design/icons";

const {ipcRenderer} = window.require("electron")

export const deleteWebShell = (id: string, url: string, refList: () => void, ids?: string[]) => {
    const deletes = YakitModalConfirm({
        width: 420,
        type: "white",
        onCancelText: "取消",
        onOkText: "删除",
        icon: <ExclamationCircleOutlined/>,
        onOk: () => {
            ipcRenderer.invoke("DeleteWebShell", {Id: id, Ids: ids}).then((r) => {
                success(`DeleteWebShell success: ${id}`)
                refList()
            }).catch((e) => {
                failed(`DeleteWebShell failed: ${e}`)
            })
            deletes.destroy()
        },
        // onCancel: () => {
        //     deletes.destroy()
        // },
        content: `是否删除 ${url} ?`
    })
}


export const featurePing = (id : string, refList: () => void) => {
    ipcRenderer.invoke("Ping", {Id: id}).then((r) => {
        success(`FeaturePing success: ${id}`)
        refList()
    }).catch((e) => {
        failed(`FeaturePing failed: ${e}`)
    })
}