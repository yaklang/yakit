import {useRequest} from "ahooks"

import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import type {TDeleteConfirmProps} from "../TKnowledgeBase"
import {failed, warn} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

// 删除确认弹窗
const DeleteConfirm: React.FC<TDeleteConfirmProps> = (props) => {
    const {visible, refreshAsync, onVisible, KnowledgeBaseId} = props
    const {runAsync} = useRequest(
        async () => {
            await ipcRenderer.invoke("DeleteKnowledgeBase", {
                KnowledgeBaseId
            })
        },
        {
            manual: true,
            onSuccess: () => {
                warn("删除知识库成功")
                refreshAsync()
            },
            onError: (error) => {
                failed(`删除知识库失败: ${error}`)
            }
        }
    )

    return (
        <>
            {/* 删除确认弹框 */}
            <YakitHint
                visible={visible}
                title='是否要删除'
                content='确认删除后将会彻底删除'
                onOk={runAsync}
                onCancel={() => {
                    onVisible(false)
                }}
            />
        </>
    )
}

export {DeleteConfirm}
