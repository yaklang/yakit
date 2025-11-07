import {FC} from "react"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import styles from "../../knowledgeBase.module.scss"
import {KnowledgeBaseEntry} from "../../TKnowledgeBase"
import {QAMessage} from "./uitls"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

interface AnswerDescriptionDrawerProps {
    answerDescriptionItem?: {
        open: boolean
        processLog?: string
    }

    setAnswerDescriptionItem: React.Dispatch<
        React.SetStateAction<
            | {
                  open: boolean
                  processLog?: string
              }
            | undefined
        >
    >
}

const AnswerDescriptionDrawer: FC<AnswerDescriptionDrawerProps> = ({
    answerDescriptionItem,
    setAnswerDescriptionItem
}) => {
    return (
        <YakitDrawer
            visible={answerDescriptionItem?.open}
            title='回答描述'
            width={500}
            onClose={() =>
                setAnswerDescriptionItem({
                    processLog: "",
                    open: false
                })
            }
        >
            <div className={styles["answer-description-item"]}>
                <div className={styles["box"]}>
                    <pre style={{padding: 12}}>{answerDescriptionItem?.processLog}</pre>
                </div>
            </div>
        </YakitDrawer>
    )
}

interface QADetailsDrawerProps {
    detailsItem?: {
        open: boolean
        details: QAMessage["entries"]
    }
    setDetailsItem: React.Dispatch<
        React.SetStateAction<
            | {
                  open: boolean
                  details: QAMessage["entries"]
              }
            | undefined
        >
    >
}
const QADetailsDrawer: FC<QADetailsDrawerProps> = ({detailsItem, setDetailsItem}) => {
    return (
        <YakitDrawer
            visible={detailsItem?.open}
            width={500}
            title='相关知识'
            onClose={() =>
                setDetailsItem({
                    details: [],
                    open: false
                })
            }
        >
            <div className={styles["qa-details-item"]}>
                {detailsItem?.details?.map((item, index) => {
                    return (
                        <div className={styles["related-box"]} key={item.ID}>
                            <div className={styles["num-box"]}>
                                <div className={styles["num-font"]}>{(index + 1).toString().padStart(2, "0")}</div>
                            </div>
                            <div className={styles["content"]}>
                                <div className={styles["title-box"]}>
                                    <div className={styles["title"]}>{item.KnowledgeTitle}</div>
                                    <YakitTag color='blue' size='middle'>
                                        {item.KnowledgeType}
                                    </YakitTag>
                                    <YakitTag color='warning' size='middle'>
                                        {item?.ImportanceScore ?? 0}
                                    </YakitTag>
                                </div>
                                <div className={styles["description"]}>{item.KnowledgeDetails}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </YakitDrawer>
    )
}

export {AnswerDescriptionDrawer, QADetailsDrawer}
