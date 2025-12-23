// import {fileToChatQuestionStore, useFileToQuestion} from "@/pages/ai-re-act/aiReActChat/store"
import styles from "./FreeDialogFileList.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {FC, useEffect, useRef, useState} from "react"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {Key, useFileToQuestion, fileToChatQuestionStore} from "@/pages/ai-re-act/aiReActChat/store"
import {AITagListProps} from "./type"
import React from "react"
import {
    OutlineBookOpenTextIcon,
    OutlineBotIcon,
    OutlineDocumenttextIcon,
    OutlineFolderopenIcon,
    OutlineWrenchIcon,
    OutlineXIcon
} from "@/assets/icon/outline"

const FreeDialogFileList: FC<{storeKey: Key}> = React.memo(({storeKey}) => {
    const fileToQuestion = useFileToQuestion(storeKey)

    return (
        <AITagList
            title='文件列表'
            list={fileToQuestion.map((item) => ({
                type: item.isFolder ? "folder" : "file",
                key: item.path,
                value: item.path
            }))}
            onRemove={(item) => fileToChatQuestionStore.remove(storeKey, `${item.key}`)}
            onClear={() => fileToChatQuestionStore.clear(storeKey)}
        />
    )
})
export default FreeDialogFileList

const iconMap = {
    file: <OutlineDocumenttextIcon />,
    folder: <OutlineFolderopenIcon />,
    forge: <OutlineBotIcon />,
    tool: <OutlineWrenchIcon />,
    knowledgeBase: <OutlineBookOpenTextIcon />
}
export const AITagList: React.FC<AITagListProps> = (props) => {
    const {title, onRemove, onClear, list} = props
    const ref = useRef<HTMLDivElement>(null)

    const listRef = useRef<HTMLDivElement | null>(null)
    const [showMore, setShowMore] = useState<boolean>(false)

    useEffect(() => {
        const el = listRef.current
        if (!el) return

        // 是否发生横向溢出
        const isOverflow = el.scrollWidth > el.clientWidth
        setShowMore(isOverflow)
    }, [list])

    return (
        <div className={styles["free-dialog-file-list"]} ref={ref}>
            <div ref={listRef} className={styles["file-item"]}>
                {list.map((item) => (
                    <YakitButton
                        key={item.key}
                        type='outline2'
                        title={item.value}
                        radius={50}
                        size='middle'
                        className={styles["file-item-btn"]}
                        onClick={() => onRemove(item)}
                    >
                        <div className={styles["file-item-content"]}>
                            {iconMap[item.type]}
                            <span className='content-ellipsis'>{item.value}</span>
                            <OutlineXIcon />
                        </div>
                    </YakitButton>
                ))}
            </div>

            {showMore && (
                <YakitPopover
                    placement='bottomRight'
                    getPopupContainer={() => ref.current?.parentNode as HTMLElement}
                    overlayClassName={styles["popover-btn"]}
                    content={
                        <div className={styles["popover-content"]}>
                            <div className={styles["popover-btn-title"]}>
                                <div>
                                    {title}
                                    <YakitTag size='small' fullRadius>
                                        {list.length}
                                    </YakitTag>
                                </div>
                                <YakitButton
                                    type='text'
                                    size='small'
                                    className={styles["popover-btn-title-btn"]}
                                    color='danger'
                                    onClick={() => onClear()}
                                >
                                    清空
                                </YakitButton>
                            </div>

                            <div className={styles["popover-btn-list"]}>
                                {list.map((item) => (
                                    <div key={item.key} title={item.value} className={styles["popover-btn-list-item"]}>
                                        <p>{item.value}</p>
                                        <YakitButton
                                            type='text2'
                                            size='small'
                                            icon={<OutlineXIcon />}
                                            onClick={() => onRemove(item)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    }
                >
                    <YakitButton type='outline2' size='middle'>
                        ...
                    </YakitButton>
                </YakitPopover>
            )}
        </div>
    )
}
