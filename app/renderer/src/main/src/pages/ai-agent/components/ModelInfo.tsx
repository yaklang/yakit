import type {FC, ReactNode} from "react"
import {AIOnlineModelIconMap, AITabsEnum} from "../defaultConstant"
import styles from "./ModelInfo.module.scss"
import {DocumentDuplicateSvgIcon} from "@/assets/newIcon"
import {OutlinCompileThreeIcon, OutlineLogIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {setClipboardText} from "@/utils/clipboard"
import {Tooltip} from "antd"
import {formatTimestamp} from "@/utils/timeUtil"
import {AIChatToolDrawerContent} from "../chatTemplate/AIAgentChatTemplate"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useCreation, useMemoizedFn} from "ahooks"
import {OutlineAtomIconByStatus} from "../aiModelList/AIModelList"
import emiter from "@/utils/eventBus/eventBus"
import { TabKey } from "./aiFileSystemList/type"

export interface ModalInfoProps {
    icon?: string
    title?: string
    time?: number
}

const ModalInfo: FC<ModalInfoProps> = ({icon, title, time}) => {
    const iconSvg = useCreation(() => {
        return AIOnlineModelIconMap[icon || ""] || <OutlineAtomIconByStatus isRunning={true} size='small' />
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
