import {memo} from "react"
import {AIReviewResultProps, AISingHaveColorTextProps} from "./type"
import {SolidHandIcon} from "@/assets/icon/solid"
import {useCreation} from "ahooks"
import styles from "./AIReviewResult.module.scss"
import {formatTimestamp} from "@/utils/timeUtil"
import React from "react"
import ChatCard from "../ChatCard"

export const AIReviewResult: React.FC<AIReviewResultProps> = memo((props) => {
    const {info, timestamp} = props
    const {type, data} = info
    const title = useCreation(() => {
        switch (type) {
            case "plan_review_require":
                return "计划审阅"
            case "task_review_require":
                return "任务审阅"
            case "tool_use_review_require":
                return "工具审阅"
            case "exec_aiforge_review_require":
                return "智能应用审阅"
            case "require_user_interactive":
                return "主动询问"
            default:
                return "Review 决策"
        }
    }, [type])
    const userAction = useCreation(() => {
        let btnText: string = ""
        let userInput: string = ""
        try {
            switch (type) {
                case "plan_review_require":
                case "task_review_require":
                case "tool_use_review_require":
                case "exec_aiforge_review_require":
                    const userSelected = JSON.parse(data.selected || "")
                    if (data.optionValue === "continue") {
                        btnText = "立即执行"
                    } else {
                        const selectBtn = data.selectors.find((item) => item.value === data.optionValue)
                        btnText = selectBtn ? selectBtn.prompt : "未知操作"
                    }
                    userInput = userSelected.extra_prompt || ""
                    break
                case "require_user_interactive":
                    userInput = userSelected.extra_prompt || ""
                    break
                default:
                    break
            }
        } catch (error) {}

        return {
            btnText,
            userInput
        }
    }, [type, data])
    return (
        <AISingHaveColorText
            titleIcon={<SolidHandIcon />}
            title={title}
            subTitle={userAction.btnText}
            tip={userAction.userInput}
            timestamp={timestamp}
        />
    )
})

export const AISingHaveColorText: React.FC<AISingHaveColorTextProps> = React.memo((props) => {
    const {title, subTitle, tip, timestamp, titleIcon, ...reset} = props
    return (
        <ChatCard
            footer={<span className={styles["time"]}>{formatTimestamp(timestamp)}</span>}
            titleText={
                <div className={styles["title-wrapper"]}>
                    <div className={styles["title-main"]}>
                        {titleIcon}
                        <span className={styles["title"]}>{title}</span>
                        {subTitle && <div className={styles["mpb-color-text"]}>{subTitle}</div>}
                    </div>
                    {tip && <div className={styles["title-extra"]}>{tip}</div>}
                </div>
            }
            {...reset}
        />
    )
})
