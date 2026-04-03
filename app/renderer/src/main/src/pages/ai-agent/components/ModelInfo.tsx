import type {FC} from "react"
import {AIOnlineModelIconMap} from "../defaultConstant"
import styles from "./ModelInfo.module.scss"
import {formatTimestamp} from "@/utils/timeUtil"
import {useCreation} from "ahooks"
import {OutlineAtomIconByStatus} from "../aiModelList/AIModelList"

export interface ModalInfoProps {
    icon?: string
    title?: string
    time?: number
}

const ModalInfo: FC<ModalInfoProps> = ({icon, title, time}) => {
    const iconSvg = useCreation(() => {
        return (
            (AIOnlineModelIconMap[icon || ""] && (
                <div className={styles["title-icon"]}>{AIOnlineModelIconMap[icon || ""]}</div>
            )) || <OutlineAtomIconByStatus iconClassName={styles["icon-small"]} />
        )
    }, [icon])

    return (
        <div className={styles["modal-info"]}>
            <div className={styles["modal-info-title"]}>
                {iconSvg}
                <span className={styles["modal-info-title-text"]}>{title}</span>
                {time && <span className={styles["modal-info-title-time"]}>{formatTimestamp(time)}</span>}
            </div>
        </div>
    )
}

export default ModalInfo
