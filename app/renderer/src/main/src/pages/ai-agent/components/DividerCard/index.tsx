import {SolidCheckCircleIcon} from "@/assets/icon/colors"
import styles from "./index.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {useMemo, type FC} from "react"
import {OutlineXcircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {SolidXcircleIcon} from "@/assets/icon/solid"
import classNames from "classnames"

export enum StreamsStatus {
    success = "success",
    inProgress = "in-progress",
    error = "error"
}

interface SuccessStatus {
    status: StreamsStatus.success
    desc?: string
    success: number
    error: number
    name?: string
}
interface WarningStatus {
    status: StreamsStatus.inProgress | StreamsStatus.error
    desc?: string
    name?: string
}

type DividerCardProps = SuccessStatus | WarningStatus
const DividerCard: FC<DividerCardProps> = (props) => {
    const [icon, dom] = useMemo(() => {
        const {status, desc, name} = props
        switch (status) {
            case StreamsStatus.success: {
                const {error, success} = props
                return [
                    <SolidCheckCircleIcon />,
                    <div className={classNames(styles["divider-content-success"], styles["divider-content-text"])}>
                        <span>{name}</span>
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
            case StreamsStatus.inProgress:
                return [
                    <OutlineXcircleIcon className={styles["icon-danger"]} />,
                    <div className={styles["divider-content-text"]}>
                        <span>{name}</span>
                        <YakitTag fullRadius className={styles["divider-content-error"]} size='small' color='warning'>
                           <OutlineXIcon />
                           <p className={styles["divider-content-error-text"]}>
                             {desc}
                           </p>
                        </YakitTag>
                    </div>
                ]
            case StreamsStatus.error:
                return [
                    <OutlineXcircleIcon className={styles["icon-danger"]} />,
                    <div className={styles["divider-content-text"]}>
                        <span>{name}</span>
                        <YakitTag fullRadius className={styles["divider-content-error"]} size='small' color='danger'>
                            <OutlineXIcon />
                            {desc}
                        </YakitTag>
                    </div>
                ]
            default:
                return [null, null]
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
