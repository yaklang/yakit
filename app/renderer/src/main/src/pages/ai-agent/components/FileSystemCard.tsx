import {type FC} from "react"
import {RefreshIcon} from "@/assets/newIcon"
import ChatCard from "./ChatCard"
import styles from "./FileSystemCard.module.scss"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {IconNotepadFileTypeDir} from "@/components/MilkdownEditor/icon/icon"
import {AIFileSystemPin} from "@/pages/ai-re-act/hooks/aiRender"
import emiter from "@/utils/eventBus/eventBus"
import {AITabsEnum} from "../defaultConstant"
import ModalInfo, { ModalInfoProps } from "./ModelInfo"

const getFileIcon = (type, isDir) => {
    if (isDir) {
        return <IconNotepadFileTypeDir />
    }
    return renderFileTypeIcon({type})
}

interface FileSystemCardProps extends AIFileSystemPin {
    showDetail?: boolean
    modalInfo: ModalInfoProps
}

const FileSystemCard: FC<FileSystemCardProps> = ({suffix, name, path, isDir, showDetail = true, modalInfo}) => {
    const type = suffix ?? name.split(".").pop()

    const onDetail = () => onOpenLocalFileByPath(path)

    const switchAIActTab = () => {
        emiter.emit("switchAIActTab", AITabsEnum.File_System)
    }
    return (
        <ChatCard
            titleIcon={<RefreshIcon className={styles["file-system-icon"]} />}
            titleText='更新文件系统'
            footer={
                <>
                    {modalInfo && <ModalInfo {...modalInfo} />}
                </>
            }
        >
            <div className={styles["file-system"]}>
                <div className={styles["file-system-title"]}>
                    <div>
                        {getFileIcon(type, isDir)}
                        {name}
                        {suffix}
                    </div>
                    <YakitButton hidden={!showDetail} type='text' onClick={switchAIActTab}>
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
