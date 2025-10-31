import styles from "./ChatCard.module.scss"
import {type FC, type ReactNode} from "react"

export interface ChatCardProps {
    titleIcon?: ReactNode
    titleText?: ReactNode
    titleExtra?: ReactNode
    children?: ReactNode
    footer?: ReactNode
}
const ChatCard: FC<ChatCardProps> = ({titleIcon, titleText, titleExtra, children, footer}) => {
    return (
        <div className={styles["chat-card"]}>
            <div className={styles["chat-card-title"]}>
                <div className={styles["chat-card-title-left"]}>
                    {titleIcon && <div className={styles["chat-card-title-icon"]}>{titleIcon}</div>}
                    <div className={styles["chat-card-title-text"]}>{titleText}</div>
                </div>
                <div className={styles["chat-card-title-more"]}>{titleExtra}</div>
            </div>
            {children && <div className={styles["chat-card-content"]}>{children}</div>}
            {footer && <div className={styles["chat-card-footer"]}>{footer}</div>}
        </div>
    )
}
export default ChatCard
