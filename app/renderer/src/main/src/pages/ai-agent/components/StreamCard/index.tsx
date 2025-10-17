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

    contentExtra?: ReactNode
}

const PromptCard: FC<{prompt?: string}> = ({prompt}) => {
    return (
        <div className={styles["stream-prompt"]}>
            <div className={styles["stream-prompt-title"]}>
                <SolidAnnotationIcon />
                Prompt
            </div>
            <div className={styles["stream-prompt-content"]}>{prompt}</div>
        </div>
    )
}

const StreamCard: FC<StreamCardProps> = ({titleText, titleIcon, content, fileList, prompt, modalInfo, contentExtra}) => {
    return (
        <ChatCard
            titleText={titleText}
            titleIcon={<div className={styles["stream-icon"]}>{titleIcon ?? <SolidHashtagIcon />}</div>}
            footer={
                <>
                    {modalInfo?.title && <ModalInfo {...modalInfo} />}
                    {prompt && <PromptCard prompt={prompt} />}
                </>
            }
        >
            <div className={styles["stream-content"]}>{content}</div>
            {contentExtra}
            {!!fileList?.length && <FileList fileList={fileList} />}
        </ChatCard>
    )
}

export default StreamCard
