import {type FC} from "react"
import {RefreshIcon} from "@/assets/newIcon"
import ChatCard from "./ChatCard"
import styles from "./FileSystemCard.module.scss"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {IconNotepadFileTypeDir} from "@/components/MilkdownEditor/icon/icon"

export interface FileSystemCardProps {
    isDir?: boolean
    path: string
    name: string
    suffix: string
}

const getFileIcon = (type, isDir) => {
    if (isDir) {
        return <IconNotepadFileTypeDir />
    }
    return renderFileTypeIcon({type})
}

const FileSystemCard: FC<FileSystemCardProps> = ({suffix, name, path, isDir}) => {
    const type = suffix ?? name.split(".").pop()

    const onDetail = () => onOpenLocalFileByPath(path)
    return (
        <ChatCard titleIcon={<RefreshIcon className={styles["file-system-icon"]} />} titleText='更新文件系统'>
            <div className={styles["file-system"]}>
                <div className={styles["file-system-title"]}>
                    <div>
                        {getFileIcon(type, isDir)}
                        {name}{suffix}
                    </div>
                    <YakitButton type='text' onClick={onDetail}>
                        查看详情
                    </YakitButton>
                </div>
                <pre className={styles["file-system-content"]}>
                    <code>
                        {path}
                    </code>
                </pre>
            </div>
        </ChatCard>
    )
}

export default FileSystemCard
