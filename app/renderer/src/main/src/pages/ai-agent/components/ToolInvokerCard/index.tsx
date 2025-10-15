import {SolidToolIcon} from "@/assets/icon/solid"
import {FC, useMemo} from "react"
import ChatCard from "../ChatCard"
import styles from "./index.module.scss"
import classNames from "classnames"
import { YakitTag } from "@/components/yakitUI/YakitTag/YakitTag"
import type{ YakitTagColor } from "@/components/yakitUI/YakitTag/YakitTagType"

interface ToolInvokerCardProps {
    status: "success" | "fail" | "cancel"
}

const ToolInvokerCard: FC<ToolInvokerCardProps> = ({status='fail'}) => {
    const [statusColor, statusText] = useMemo(() => {
        if (status === "success") return ["success", "成功"]
        if (status === "fail") return ["danger", "失败"]
        return ["white", "已取消"]
    }, [status])
    return (
        <ChatCard
            titleText='工具调用'
            titleIcon={<SolidToolIcon />}
            titleExtra={
                <div className={styles["tool-invoker-card-extra"]}>
                    相关漏洞 <span>2</span> <span>|</span> HTTP 流量 <span>8</span>
                </div>
            }
        >
            <div className={classNames(styles["file-system"], styles[`file-system-${status}`])}>
                <div className={styles["file-system-title"]}>
                    <div>1231 <YakitTag size="small" fullRadius color={statusColor as YakitTagColor }>{statusText}</YakitTag></div>
                </div>
                <div className={styles["file-system-content"]}>
                    <div>已获取操作系统类型为 darwin，接下来将执行系统版本、架构、主机名、运行时间等信息的获取。</div>
                    <pre className={styles["file-system-wrapper"]}>
                        <code>
                            /Users/nonight/yakit-projects/aispace/cce4e823-4527-4a45-950a-468bacc4bf72/gen_code_20251013_14_58_23.yak
                            /Users/nonight/yakit-projects/aispace/cce4e823-4527-4a45-950a-468bacc4bf72/gen_code_20251013_14_58_23.yak
                            /Users/nonight/yakit-projects/aispace/cce4e823-4527-4a45-950a-468bacc4bf72/gen_code_20251013_14_58_23.yak
                        </code>
                    </pre>
                </div>
            </div>
        </ChatCard>
    )
}

export default ToolInvokerCard
