import {Dispatch, FC, SetStateAction} from "react"

import type {FormInstance} from "antd/es/form/Form"

import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"

import {failed, success} from "@/utils/notification"
import {CreateKnowledgeBase} from "./CreateKnowledgeBase"
import {getFileInfoList} from "../utils"
import {randomString} from "@/utils/randomUtil"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "../knowledgeBase.module.scss"
import {useRequest} from "ahooks"

const {ipcRenderer} = window.require("electron")

interface TKnowledgeBaseFormModalProps {
    visible: boolean
    title: string
    handOpenKnowledgeBasesModal: () => void
    form: FormInstance<any>
    setKnowledgeBaseID: Dispatch<SetStateAction<string>>
}

const KnowledgeBaseFormModal: FC<TKnowledgeBaseFormModalProps> = ({
    title,
    visible,
    handOpenKnowledgeBasesModal,
    form,
    setKnowledgeBaseID
}) => {
    const {addKnowledgeBase} = useKnowledgeBase()

    const {runAsync, loading} = useRequest(
        async (params) => {
            const result = await ipcRenderer.invoke("CreateKnowledgeBaseV2", {
                Name: params.KnowledgeBaseName,
                Description: params.KnowledgeBaseDescription,
                Type: params.KnowledgeBaseType
            })
            const KnowledgeBaseID = result?.KnowledgeBase?.ID
            addKnowledgeBase({
                ...params,
                ID: KnowledgeBaseID
            })
            setKnowledgeBaseID(KnowledgeBaseID)

            handOpenKnowledgeBasesModal()
            return "suecess"
        },
        {
            manual: true,
            onSuccess: () => success("创建知识库成功"),
            onError: (err) => failed(`创建知识库失败: ${err}`)
        }
    )

    const handleCreateKnowledge = async () => {
        const resultFormData = await form.validateFields()
        const file = getFileInfoList(resultFormData.KnowledgeBaseFile)

        const streamToken = randomString(50)
        const transformFormData = {
            ...resultFormData,
            KnowledgeBaseFile: file,
            streamToken,
            streamstep: 1,
            addManuallyItem: false,
            historyGenerateKnowledgeList: []
        }

        await runAsync(transformFormData)
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
            footer={
                <div className={styles["delete-yakit-hint"]}>
                    <YakitButton type='outline1' onClick={handOpenKnowledgeBasesModal}>
                        取消
                    </YakitButton>
                    <YakitButton onClick={handleCreateKnowledge} loading={loading}>
                        确定
                    </YakitButton>
                </div>
            }
        >
            <CreateKnowledgeBase form={form} />
        </YakitModal>
    )
}

export {KnowledgeBaseFormModal}
