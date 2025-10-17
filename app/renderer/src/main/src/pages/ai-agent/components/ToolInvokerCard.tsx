import {SolidToolIcon} from "@/assets/icon/solid"
import {FC, useMemo} from "react"
import ChatCard from "./ChatCard"
import styles from "./ToolInvokerCard.module.scss"
import classNames from "classnames"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import type {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"

interface ToolInvokerCardProps {
    titleText?: string
    status: "default" | "success" | "failed" | "user_cancelled"
    name: string
    content?: string
    desc?: string
}

const ToolInvokerCard: FC<ToolInvokerCardProps> = ({titleText, name, content, desc, status = "fail"}) => {
    const [statusColor, statusText] = useMemo(() => {
        if (status === "success") return ["success", "成功"]
        if (status === "fail") return ["danger", "失败"]
        return ["white", "已取消"]
    }, [status])
    return (
        <ChatCard
            titleText={titleText}
            titleIcon={<SolidToolIcon />}
            titleExtra={
                <div className={styles["tool-invoker-card-extra"]}>
                    相关漏洞 <span>2</span> <span>|</span> HTTP 流量 <span>8</span>
                </div>
            }
        >
            <div className={classNames(styles["file-system"], styles[`file-system-${status}`])}>
                <div className={styles["file-system-title"]}>
                    <div>
                        {name}
                        <YakitTag size='small' fullRadius color={statusColor as YakitTagColor}>
                            {statusText}
                        </YakitTag>
                    </div>
                </div>
                <div className={styles["file-system-content"]}>
                    <div>{desc}</div>
                    <pre className={styles["file-system-wrapper"]}>
                        <code>{content}</code>
                    </pre>
                </div>
            </div>
        </ChatCard>
    )
}

export default ToolInvokerCard
