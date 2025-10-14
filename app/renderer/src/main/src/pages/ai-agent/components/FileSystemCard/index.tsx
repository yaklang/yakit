import {type FC} from "react"
import {RefreshIcon} from "@/assets/newIcon"
import ChatCard from "../ChatCard"
import styles from "./index.module.scss"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"

export interface FileSystemCardProps {
    isDir?: boolean
    path: string
    name: string
    suffix: string
}

const FileSystemCard: FC<FileSystemCardProps> = ({suffix, name, path}) => {
    const type = suffix ?? name.split(".").pop()

    const onDetail = () => onOpenLocalFileByPath(path)
    return (
        <ChatCard titleIcon={<RefreshIcon className={styles["file-system-icon"]} />} titleText='更新文件系统'>
            <div className={styles["file-system"]}>
                <div className={styles["file-system-title"]}>
                    <div>
                        {renderFileTypeIcon({type})}
                        {name}
                    </div>
                    <YakitButton type='text' onClick={onDetail}>
                        查看详情
                    </YakitButton>
                </div>
                <pre className={styles["file-system-content"]}>
                    <code>
                        /Users/nonight/yakit-projects/aispace/cce4e823-4527-4a45-950a-468bacc4bf72/gen_code_20251013_14_58_23.yak
                        /Users/nonight/yakit-projects/aispace/cce4e823-4527-4a45-950a-468bacc4bf72/gen_code_20251013_14_58_23.yak
                        /Users/nonight/yakit-projects/aispace/cce4e823-4527-4a45-950a-468bacc4bf72/gen_code_20251013_14_58_23.yak
                    </code>
                </pre>
            </div>
        </ChatCard>
    )
}

export default FileSystemCard
