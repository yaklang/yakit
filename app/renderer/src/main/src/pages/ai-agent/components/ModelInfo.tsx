import type {FC} from "react"
import {AIOnlineModelIconMap} from "../defaultConstant"
import styles from "./ModelInfo.module.scss"
import {DocumentDuplicateSvgIcon} from "@/assets/newIcon"
import {OutlineLogIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {setClipboardText} from "@/utils/clipboard"
import {RocketSvgIcon} from "@/components/layout/icons"
import {Tooltip} from "antd"
import { SolidAnnotationIcon } from "@/assets/icon/solid"

export interface ModalInfoProps {
    icon?: string
    title?: string
    time?: string
    copyStr?: string
}

const ModalInfo: FC<ModalInfoProps> = ({icon, title, time, copyStr}) => {
    const iconSvg = AIOnlineModelIconMap[icon ?? "openai"]
    return (
        <div className={styles["modal-info"]}>
            <div className={styles["modal-info-title"]}>
                {iconSvg}
                {title}
                <span className={styles["modal-info-title-time"]}>{time}</span>
            </div>
            <div className={styles["modal-info-icons"]}>
                <Tooltip placement='top' title=''>
                    <YakitButton
                        type='text2'
                        color='default'
                        icon={<DocumentDuplicateSvgIcon />}
                        onClick={() => setClipboardText(copyStr)}
                    />
                </Tooltip>
                <Tooltip placement='top' title='生成步骤'>
                    <YakitButton type='text2' color='default' icon={<OutlineLogIcon />} />
                </Tooltip>
                <Tooltip placement='top' title=''>
                    <YakitButton type='text2' color='default' icon={<SolidAnnotationIcon />} />
                </Tooltip>
                <Tooltip placement='top' title=''>
                    <YakitButton type='text2' color='default' icon={<RocketSvgIcon />} />
                </Tooltip>
            </div>
        </div>
    )
}
export default ModalInfo
