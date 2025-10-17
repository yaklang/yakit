import {SolidAnnotationIcon, SolidHashtagIcon} from "@/assets/icon/solid"
import type {FC, ReactNode} from "react"
import ChatCard from "../ChatCard"
import FileList, {FileListItem} from "../FileList"
import styles from "./index.module.scss"
import ModalInfo, {type ModalInfoProps} from "../ModelInfo"

interface StreamCardProps {
    content?: string
    fileList?: FileListItem[]
    prompt?: string
    titleText?: string
    titleIcon?: ReactNode

    modalInfo?: ModalInfoProps
}

const PromptCard: FC<{prompt?: string}> = ({prompt}) => {
    return (
        <div className={styles["summary-prompt"]}>
            <div className={styles["summary-prompt-title"]}>
                <SolidAnnotationIcon />
                Prompt
            </div>
            <div className={styles["summary-prompt-content"]}>{prompt}</div>
        </div>
    )
}

const StreamCard: FC<StreamCardProps> = ({titleText, titleIcon, content, fileList, prompt, modalInfo}) => {
    return (
        <ChatCard
            titleText={titleText}
            titleIcon={<div className={styles["summary-icon"]}>{titleIcon ?? <SolidHashtagIcon />}</div>}
            footer={
                <>
                    {modalInfo?.title && <ModalInfo {...modalInfo} />}
                    {prompt && <PromptCard prompt={prompt} />}
                </>
            }
        >
            <div className={styles["summary-content"]}>{content}</div>
            {!!fileList?.length && <FileList fileList={fileList} />}
        </ChatCard>
    )
}

export default StreamCard
