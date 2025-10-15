import {SolidCheckCircleIcon} from "@/assets/icon/colors"
import styles from "./index.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {useMemo, type FC} from "react"
import {OutlineXcircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {SolidXcircleIcon} from "@/assets/icon/solid"
import classNames from "classnames"

interface SuccessStatus {
    status: "success"
    desc: string
    success: number
    error: number
}
interface WarningStatus {
    status: "warning" | "error"
    desc: string
}

type DividerCardProps = SuccessStatus | WarningStatus
const DividerCard: FC<DividerCardProps> = (props) => {
    const [icon, dom] = useMemo(() => {
        const {status, desc} = props
        switch (status) {
            case "success": {
                const {error, success} = props
                return [
                    <SolidCheckCircleIcon />,
                    <div className={classNames(styles["divider-content-success"], styles["divider-content-text"])}>
                        <span>输入分支</span>
                        {[error, success].map((item, index) => {
                            return (
                                <YakitTag
                                    size='small'
                                    fullRadius
                                    color={index === 0 ? "danger" : "success"}
                                    className={styles["divider-content-success-tag"]}
                                >
                                    {item}
                                </YakitTag>
                            )
                        })}
                        <span className={styles["divider-content-text-desc"]}>{desc}</span>
                    </div>
                ]
            }
            case "warning":
                return [
                    <OutlineXcircleIcon className={styles["icon-danger"]} />,
                    <div className={styles["divider-content-text"]}>
                        <span>输出分析</span>
                        <YakitTag
                            fullRadius
                            className={styles["divider-content-error"]}
                            size='small'
                            color='warning'
                            icon={<OutlineXIcon />}
                        >
                            {desc}
                        </YakitTag>
                    </div>
                ]
            case "error":
                return [
                    <OutlineXcircleIcon className={styles["icon-danger"]} />,
                    <div className={styles["divider-content-text"]}>
                        <span>目标探测</span>
                        <YakitTag
                            fullRadius
                            className={styles["divider-content-error"]}
                            size='small'
                            color='danger'
                            icon={<OutlineXIcon />}
                        >
                            {desc}
                        </YakitTag>
                    </div>
                ]
        }
    }, [props])
    return (
        <div className={styles.divider}>
            <div />
            <div className={styles["divider-content"]}>
                {icon}
                {dom}
            </div>
        </div>
    )
}
export default DividerCard
