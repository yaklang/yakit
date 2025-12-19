// import {fileToChatQuestionStore, useFileToQuestion} from "@/pages/ai-re-act/aiReActChat/store"
import styles from "./FreeDialogFileList.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {FC, useEffect, useRef, useState} from "react"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {Key, useFileToQuestion, fileToChatQuestionStore} from "@/pages/ai-re-act/aiReActChat/store"

const FreeDialogFileList: FC<{storeKey: Key}> = ({storeKey}) => {
    const fileToQuestion = useFileToQuestion(storeKey)

    const ref = useRef<HTMLDivElement>(null)

    const listRef = useRef<HTMLDivElement | null>(null)
    const [showMore, setShowMore] = useState<boolean>(false)

    useEffect(() => {
        const el = listRef.current
        if (!el) return

        // 是否发生横向溢出
        const isOverflow = el.scrollWidth > el.clientWidth
        setShowMore(isOverflow)
    }, [fileToQuestion])

    return (
        <div className={styles["free-dialog-file-list"]} ref={ref}>
            <div ref={listRef} className={styles["file-item"]}>
                {fileToQuestion.map(({path}) => (
                    <YakitButton
                        key={path}
                        type='outline2'
                        title={path}
                        radius={50}
                        size='middle'
                        className={styles["file-item-btn"]}
                        onClick={() => fileToChatQuestionStore.remove(storeKey, path)}
                        icon={<RemoveIcon />}
                    >
                        {path}
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
                                    文件列表
                                    <YakitTag size='small' fullRadius>
                                        {fileToQuestion.length}
                                    </YakitTag>
                                </div>
                                <YakitButton
                                    type='text'
                                    size='small'
                                    className={styles["popover-btn-title-btn"]}
                                    color='danger'
                                    onClick={() => fileToChatQuestionStore.clear(storeKey)}
                                >
                                    清空
                                </YakitButton>
                            </div>

                            <div className={styles["popover-btn-list"]}>
                                {fileToQuestion.map(({path}) => (
                                    <div key={path} title={path} className={styles["popover-btn-list-item"]}>
                                        <p>{path}</p>
                                        <YakitButton
                                            type='text2'
                                            size='small'
                                            icon={<RemoveIcon />}
                                            onClick={() => fileToChatQuestionStore.remove(storeKey, path)}
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

export default FreeDialogFileList
