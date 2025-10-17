import {FC} from "react"
import styles from "./FileList.module.scss"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {IconNotepadFileTypeDir} from "@/components/MilkdownEditor/icon/icon"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import { YakitTag } from "@/components/yakitUI/YakitTag/YakitTag"

export interface FileListItem {
    name: string
    isDir?: boolean
    desc?: string
    status?: "success" | "danger" | "white"
    label?: string
    time?: string
}

interface FileListProps {
    title?: string
    fileList?: FileListItem[]
}

const getFileIcon = (name, isDir) => {
    // 后缀
    const type = name.indexOf(".") > -1 ? name.split(".").pop() : ""
    if (isDir) {
        return <IconNotepadFileTypeDir />
    }
    return renderFileTypeIcon({type})
}

const FileList: FC<FileListProps> = ({title, fileList}) => {
    return (
        <div className={styles["file-list"]}>
            <div className={styles["file-list-title"]}>{title ?? `相关文件 (${fileList?.length})`}</div>
            <div className={styles["file-list-content"]}>
                {fileList?.map((item) => {
                    const Icon = getFileIcon(item.name, item.isDir)
                    const dangerFile = (item.status === 'danger' && !item.isDir) ? <del>{item.name}</del> : item.name
                    return (
                        <div key={item.name} className={styles["file-list-item"]}>
                            <div className={styles["file-list-item-main"]}>
                               <YakitTag className={styles['file-list-item-tag']} border={false} color={item.status}>{item.label}</YakitTag>
                                <div className={styles["file-list-item-icon"]}>{Icon}</div>
                                <div className={styles["file-list-item-name"]}>
                                    {dangerFile}
                                </div>
                                <div className={styles["file-list-item-desc"]}>{item.desc}</div>
                            </div>
                            <div className={styles["file-list-item-actions"]}>
                                <div className={styles["file-list-item-actions-time"]}>{item.time}</div>
                                <OutlineChevronrightIcon />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
export default FileList
