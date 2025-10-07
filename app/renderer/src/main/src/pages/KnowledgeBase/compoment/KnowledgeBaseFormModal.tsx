import {FC} from "react"

import type {FormInstance} from "antd/es/form/Form"

import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"

import {failed, success} from "@/utils/notification"
import {CreateKnowledgeBase} from "./CreateKnowledgeBase"
import {getFileInfoList} from "../utils"
import {randomString} from "@/utils/randomUtil"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"
const {ipcRenderer} = window.require("electron")

interface TKnowledgeBaseFormModalProps {
    visible: boolean
    title: string
    handOpenKnowledgeBasesModal: () => void
    form: FormInstance<any>
}

const KnowledgeBaseFormModal: FC<TKnowledgeBaseFormModalProps> = ({
    title,
    visible,
    handOpenKnowledgeBasesModal,
    form
}) => {
    const {addKnowledgeBase} = useKnowledgeBase()

    const handleCreateKnowledge = async () => {
        const resultFormData = await form.validateFields()
        const file = getFileInfoList(resultFormData.KnowledgeBaseFile)

        const streamToken = randomString(50)
        const transformFormData = {
            ...resultFormData,
            KnowledgeBaseFile: file,
            streamToken,
            streamstep: 1
        }

        ipcRenderer
            .invoke("CreateKnowledgeBaseV2", {
                Name: transformFormData.KnowledgeBaseName,
                Description: transformFormData.KnowledgeBaseDescription,
                Type: transformFormData.KnowledgeBaseType
            })
            .then(async (res) => {
                const KnowledgeBaseID = res?.KnowledgeBase?.ID
                addKnowledgeBase({
                    ...transformFormData,
                    ID: KnowledgeBaseID
                })
                success("创建知识库成功")
                handOpenKnowledgeBasesModal()
            })
            .catch((error) => {
                failed(`创建知识库失败: ${error}`)
            })
    }
    return (
        <YakitModal
            title={title}
            visible={visible}
            onCancel={handOpenKnowledgeBasesModal}
            onOk={handleCreateKnowledge}
            width={600}
            destroyOnClose
            maskClosable={false}
            okText='确认'
            cancelText='取消'
        >
            <CreateKnowledgeBase form={form} />
        </YakitModal>
    )
}

export {KnowledgeBaseFormModal}
