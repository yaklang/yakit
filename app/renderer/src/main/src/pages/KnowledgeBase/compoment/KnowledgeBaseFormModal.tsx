import {FC} from "react"
import {useRequest} from "ahooks"
import {Form} from "antd"
import type {FormInstance} from "antd/es/form/Form"

import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {failed} from "@/utils/notification"
import {CreateKnowledgeBase} from "./CreateKnowledgeBase"

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
    return (
        <YakitModal
            title={title}
            visible={visible}
            onCancel={handOpenKnowledgeBasesModal}
            width={600}
            destroyOnClose
            maskClosable={false}
            okText='确认'
            cancelText='取消'
            // className={styles["knowledgeBase-modal"]}
        >
            <CreateKnowledgeBase form={form} />
        </YakitModal>
    )
}
export {KnowledgeBaseFormModal}
