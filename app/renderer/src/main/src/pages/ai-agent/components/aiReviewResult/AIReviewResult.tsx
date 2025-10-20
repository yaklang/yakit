import {memo} from "react"
import {AIReviewResultProps} from "./type"
import {SolidHandIcon} from "@/assets/icon/solid"
import {useCreation} from "ahooks"
import styles from "./AIReviewResult.module.scss"
import {formatTimestamp} from "@/utils/timeUtil"

export const AIReviewResult: React.FC<AIReviewResultProps> = memo((props) => {
    const {info, timestamp} = props
    const {type, data} = info
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
                    if (userSelected.suggestion === "continue") {
                        btnText = "立即执行"
                    } else {
                        const selectBtn = data.selectors.find((item) => item.value === userSelected.suggestion)
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
        } catch (error) {
            btnText = "解析错误"
        }

        return {
            btnText,
            userInput
        }
    }, [type, data])
    return (
        <div className={styles["ai-review-result"]}>
            <div className={styles["ai-review-result-content"]}>
                <SolidHandIcon />
                <span>Review 决策</span>
                {userAction.btnText && <div className={styles["btn-text"]}>{userAction.btnText}</div>}
                {userAction.userInput && <div className={styles["user-input"]}>{userAction.userInput}</div>}
            </div>
            <div className={styles["ai-review-result-footer"]}>
                <span className={styles["time"]}>{formatTimestamp(timestamp)}</span>
            </div>
        </div>
    )
})
