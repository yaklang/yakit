import classNames from "classnames"
import styles from "./ChatCard.module.scss"
import {type FC, type ReactNode} from "react"

export interface ChatCardProps {
    titleIcon?: ReactNode
    titleText?: ReactNode
    titleExtra?: ReactNode
    titleMore?: ReactNode
    children?: ReactNode
    footer?: ReactNode
    className?: string
}
const ChatCard: FC<ChatCardProps> = ({titleText, titleExtra, titleMore, children, footer, className}) => {
    return (
        <div className={classNames(styles["chat-card"], className)}>
            <div className={styles["chat-card-title"]}>
                <div className={styles["chat-card-title-left"]}>
                    {/* {titleIcon && <div className={styles["chat-card-title-icon"]}>{titleIcon}</div>} */}
                    <div className={styles["chat-card-title-text"]}>{titleText}</div>
                    <div className={styles["chat-card-title-extra"]}>{titleExtra}</div>
                </div>
                <div className={styles["chat-card-title-more"]}>{titleMore}</div>
            </div>
            {children && <div className={styles["chat-card-content"]}>{children}</div>}
            {footer && <div className={styles["chat-card-footer"]}>{footer}</div>}
        </div>
    )
}
export default ChatCard
