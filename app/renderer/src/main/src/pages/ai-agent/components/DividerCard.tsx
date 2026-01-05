import styles from "./DividerCard.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {useMemo, type FC} from "react"
import {OutlineLoadingIcon, OutlineXcircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {TaskInProgressIcon, TaskSuccessIcon} from "../aiTree/icon"

export enum StreamsStatus {
    success = "completed",
    inProgress = "processing",
    error = "aborted",
    cancel = "cancel",
    skipped = "skipped"
}

interface SuccessStatus {
    status: StreamsStatus.success | StreamsStatus.cancel
    desc?: string
    success: number
    error: number
    name?: string
}
interface WarningStatus {
    status: StreamsStatus.inProgress | StreamsStatus.error | StreamsStatus.skipped
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
                    <TaskSuccessIcon />,
                    <div className={classNames(styles["divider-content-success"], styles["divider-content-text"])}>
                        <span>{name}</span>
                        {[error, success].filter(ele=>!!ele).map((item, index) => {
                            return (
                                <YakitTag
                                    key={index}
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
                    <div className={styles["icon-danger"]}>
                        <TaskInProgressIcon />
                    </div>,
                    <div className={styles["divider-content-text"]}>
                        <span>{name}</span>
                        {desc&&<YakitTag fullRadius className={styles["divider-content-error"]} size='small' color='warning'>
                            <OutlineLoadingIcon />
                            <p className={styles["divider-content-error-text"]}>{desc}</p>
                        </YakitTag>}
                    </div>
                ]
            case StreamsStatus.error:
            case StreamsStatus.skipped:
                return [
                    <OutlineXcircleIcon className={styles["icon-danger"]} />,
                    <div className={styles["divider-content-text"]}>
                        <span>{name}</span>
                        <YakitTag
                            fullRadius
                            className={styles["divider-content-error"]}
                            size='small'
                            color='danger'
                        >
                            <OutlineXIcon />
                            <p className={styles["divider-content-error-text"]}>{desc}</p>
                        </YakitTag>
                    </div>
                ]
            case StreamsStatus.cancel:
                const {error, success} = props
                return [
                    <div key='circle' className={styles["node-circle-icon"]} />,
                    <div className={classNames(styles["divider-content-success"], styles["divider-content-text"])}>
                        <span>{name}</span>
                        {[error, success]
                            .filter((ele) => !!ele)
                            .map((item, index) => {
                                return (
                                    <YakitTag
                                        key={index}
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
            default:
                return [null, null]
        }
    }, [props])
    return (
        <div className={styles.divider} hidden={!dom}>
            <div />
            <div className={styles["divider-content"]}>
                <div className={styles["divider-content-icon"]}>{icon}</div>
                {dom}
            </div>
        </div>
    )
}
export default DividerCard
