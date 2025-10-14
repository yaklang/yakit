import ModalInfo from "../ModelInfo"
import styles from "./index.module.scss"
import {type FC, type ReactNode} from "react"

interface ChatCardProps {
    titleIcon?: ReactNode
    titleText?: string
    titleExtra?: ReactNode
    children?: ReactNode
    footer?: ReactNode
}
const ChatCard: FC<ChatCardProps> = ({titleIcon, titleText, titleExtra, children, footer}) => {
    return (
        <div className={styles["chat-card"]}>
            <div className={styles["chat-card-title"]}>
                <div className={styles["chat-card-title-left"]}>
                    <div className={styles["chat-card-title-icon"]}>{titleIcon}</div>
                    <div className={styles["chat-card-title-text"]}>{titleText}</div>
                </div>
                <div className={styles["chat-card-title-more"]}>{titleExtra}</div>
            </div>
            <div className={styles["chat-card-content"]}>{children}</div>
            <div className={styles["chat-card-footer"]}>
                <ModalInfo />
                {footer}
            </div>
        </div>
    )
}
export default ChatCard
