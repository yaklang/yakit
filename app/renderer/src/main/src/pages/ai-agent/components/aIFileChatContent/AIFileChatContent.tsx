import type {AIInputEvent} from "@/pages/ai-re-act/hooks/grpcApi"
import {FC, useMemo} from "react"
import styles from "./AIFileChatContent.module.scss"
import type {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {IconNotepadFileTypeDir} from "@/components/MilkdownEditor/icon/icon"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {FileToChatQuestionList} from "@/pages/ai-re-act/aiReActChat/store"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"

interface AIFileChatContentProps {
    qs: string
    setting: AIInputEvent
    extraValue?: CustomPluginExecuteFormValue
}

function getFileExt(path: string): string {
    const index = path.lastIndexOf(".")
    return index > -1 ? path.slice(index + 1).toLowerCase() : ""
}

const getFileIcon = (data: FileToChatQuestionList) => {
    if (data.isFolder) return <IconNotepadFileTypeDir />
    return renderFileTypeIcon({type: getFileExt(data.path)})
}

function isFileToChatQuestionListArray(value: unknown): value is FileToChatQuestionList[] {
    return (
        Array.isArray(value) &&
        value.every(
            (item) =>
                typeof item === "object" &&
                item !== null &&
                "path" in item &&
                typeof (item as {path: unknown}).path === "string" &&
                "isFolder" in item &&
                typeof (item as {isFolder: unknown}).isFolder === "boolean"
        )
    )
}

const AIFileChatContent: FC<AIFileChatContentProps> = ({qs, setting, extraValue}) => {
    const freeDialogFileList = useMemo<FileToChatQuestionList[]>(() => {
        const raw = extraValue?.freeDialogFileList
        return isFileToChatQuestionListArray(raw) ? raw : []
    }, [extraValue?.freeDialogFileList])

    const fileMap = useMemo<Map<string, FileToChatQuestionList>>(() => {
        return new Map(freeDialogFileList.map((item) => [item.path, item]))
    }, [freeDialogFileList])

    const attachedFilePathList = setting.AttachedFilePath

    return (
        <div className={styles.wrapper}>
            <div className={styles.qs}>{qs}</div>

            {!!attachedFilePathList?.length && (
                <div className={styles.file}>
                    <div>相关操作文件</div>

                    <div className={styles["file-content"]}>
                        {attachedFilePathList.map((filePath) => {
                            const file = fileMap.get(filePath)
                            if (!file) return null

                            return (
                                <div
                                    key={filePath}
                                    className={styles["file-content-item"]}
                                    role='button'
                                    tabIndex={0}
                                    onClick={() => onOpenLocalFileByPath(filePath)}
                                >
                                    <div className={styles["file-content-item-left"]}>
                                        {getFileIcon(file)}
                                        <p>{filePath}</p>
                                    </div>

                                    <YakitButton type='text2' icon={<OutlineChevronrightIcon />} />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AIFileChatContent
