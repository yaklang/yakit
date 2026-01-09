import type {AIInputEvent} from "@/pages/ai-re-act/hooks/grpcApi"
import {FC} from "react"
import styles from "./AIFileChatContent.module.scss"
import {IconNotepadFileTypeDir} from "@/components/MilkdownEditor/icon/icon"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevronrightIcon} from "@/assets/icon/outline"
import {onOpenLocalFileByPath} from "@/pages/notepadManage/notepadManage/utils"
import {HandleStartParams} from "../../aiAgentChat/type"
import {useCreation, useMemoizedFn} from "ahooks"
import {
    isHaveFreeDialogFileList,
    isHaveSelectForges,
    isHaveSelectKnowledgeBases,
    isHaveSelectTools
} from "../aiChatListItem/AIChatListItem"
import {AIChatMentionSelectItem, AIMentionTypeItem} from "../aiChatMention/type"
import {iconMap} from "../../defaultConstant"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import classNames from "classnames"
import {FileToChatQuestionList} from "../../template/type"

interface AIFileChatContentProps {
    qs: string
    setting: AIInputEvent
    extraValue?: HandleStartParams["extraValue"]
}

function getFileExt(path: string): string {
    const index = path.lastIndexOf(".")
    return index > -1 ? path.slice(index + 1).toLowerCase() : ""
}

const getFileIcon = (data: FileToChatQuestionList) => {
    if (data.isFolder) return <IconNotepadFileTypeDir />
    return renderFileTypeIcon({type: getFileExt(data.path)})
}
/**@deprecated 废弃 由md编辑器代替 */
const AIFileChatContent: FC<AIFileChatContentProps> = ({qs, setting, extraValue}) => {
    const attachedFilePathList: FileToChatQuestionList[] = useCreation(() => {
        return isHaveFreeDialogFileList(extraValue)
    }, [extraValue?.["freeDialogFileList"]])

    const selectForges: AIChatMentionSelectItem[] = useCreation(() => {
        return isHaveSelectForges(extraValue)
    }, [extraValue?.["selectForges"]])

    const selectTools: AIChatMentionSelectItem[] = useCreation(() => {
        return isHaveSelectTools(extraValue)
    }, [extraValue?.["selectTools"]])
    const selectKnowledgeBases: AIChatMentionSelectItem[] = useCreation(() => {
        return isHaveSelectKnowledgeBases(extraValue)
    }, [extraValue?.["selectKnowledgeBases"]])

    const onOpenKnowledgeBases = useMemoizedFn(() => {
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
    })
    const isPadding = useCreation(() => {
        return (
            !!attachedFilePathList.length ||
            !!selectForges.length ||
            !!selectTools.length ||
            !!selectKnowledgeBases.length
        )
    }, [attachedFilePathList.length, selectForges.length, selectTools.length, selectKnowledgeBases.length])
    const renderList = useMemoizedFn(
        (params: {title: string; list: AIChatMentionSelectItem[]; type: AIMentionTypeItem}) => {
            const {title, list, type} = params
            return (
                <div className={styles.file}>
                    <div>{title}</div>

                    <div className={styles["file-content"]}>
                        {list.map((file) => {
                            return (
                                <div key={file.id} className={styles["file-content-item"]}>
                                    <div
                                        className={classNames(
                                            styles["file-content-item-left"],
                                            styles["content-item-left"]
                                        )}
                                    >
                                        {iconMap[type]}
                                        <p>{file.name}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }
    )
    return (
        <div className={styles.wrapper}>
            <div className={styles.qs} style={{padding: isPadding ? "8px" : 0}}>
                {qs}
            </div>
            {!!attachedFilePathList?.length && (
                <div className={styles.file}>
                    <div>相关操作文件</div>
                    <div className={styles["file-content"]}>
                        {attachedFilePathList.map((file) => {
                            return (
                                <div
                                    key={file.path}
                                    className={styles["file-content-item"]}
                                    role='button'
                                    tabIndex={0}
                                    onClick={() => onOpenLocalFileByPath(file.path)}
                                >
                                    <div className={styles["file-content-item-left"]}>
                                        {getFileIcon(file)}
                                        <p>{file.path}</p>
                                    </div>

                                    <YakitButton type='text2' icon={<OutlineChevronrightIcon />} />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
            {!!selectForges?.length &&
                renderList({
                    title: "相关智能体",
                    list: selectForges,
                    type: "forge"
                })}

            {!!selectTools?.length &&
                renderList({
                    title: "相关工具",
                    list: selectTools,
                    type: "tool"
                })}
            {!!selectKnowledgeBases?.length && (
                <div className={styles.file}>
                    <div>相关知识库</div>

                    <div className={styles["file-content"]}>
                        {selectKnowledgeBases.map((item) => {
                            return (
                                <div
                                    key={item.id}
                                    className={styles["file-content-item"]}
                                    role='button'
                                    tabIndex={0}
                                    onClick={onOpenKnowledgeBases}
                                >
                                    <div className={styles["file-content-item-left"]}>
                                        {iconMap["knowledgeBase"]}
                                        <p>{item.name}</p>
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
