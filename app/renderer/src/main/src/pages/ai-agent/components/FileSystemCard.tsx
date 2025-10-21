import {type FC} from "react"
import {RefreshIcon} from "@/assets/newIcon"
import ChatCard from "./ChatCard"
import styles from "./FileSystemCard.module.scss"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {IconNotepadFileTypeDir} from "@/components/MilkdownEditor/icon/icon"
import {AIFileSystemPin} from "@/pages/ai-re-act/hooks/aiRender"

const getFileIcon = (type, isDir) => {
    if (isDir) {
        return <IconNotepadFileTypeDir />
    }
    return renderFileTypeIcon({type})
}

interface FileSystemCardProps extends AIFileSystemPin {
    showDetail?: boolean
}

const FileSystemCard: FC<FileSystemCardProps> = ({suffix, name, path, isDir, showDetail = true}) => {
    const type = suffix ?? name.split(".").pop()

    const onDetail = () => onOpenLocalFileByPath(path)
    return (
        <ChatCard titleIcon={<RefreshIcon className={styles["file-system-icon"]} />} titleText='更新文件系统'>
            <div className={styles["file-system"]}>
                <div className={styles["file-system-title"]}>
                    <div>
                        {getFileIcon(type, isDir)}
                        {name}
                        {suffix}
                    </div>
                    <YakitButton hidden={!showDetail} type='text' onClick={() => {}}>
                        查看详情
                    </YakitButton>
                </div>
                <pre className={styles["file-system-content"]} onClick={onDetail}>
                    <code>{path}</code>
                </pre>
            </div>
        </ChatCard>
    )
}

export default FileSystemCard
