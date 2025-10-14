import {SolidAnnotationIcon, SolidHashtagIcon} from "@/assets/icon/solid"
import type {FC} from "react"
import ChatCard from "../ChatCard"
import FileList, {FileListItem} from "../FileList"
import styles from "./index.module.scss"

interface SummaryCardProps {
    content?: string
    fileList?: FileListItem[]
    prompt?: string
}

const PromptCard: FC<{prompt?: string}> = ({prompt = "模型在京东云上的私有化部署方案"}) => {
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

const SummaryCard: FC<SummaryCardProps> = ({content, fileList, prompt}) => {
    return (
        <ChatCard
            titleText='Summary'
            titleIcon={<SolidHashtagIcon className={styles["summary-icon"]} />}
            footer={<PromptCard prompt={prompt} />}
        >
            <div className={styles["summary-content"]}>{content}</div>
            {!!fileList?.length && <FileList fileList={fileList} />}
        </ChatCard>
    )
}

export default SummaryCard
