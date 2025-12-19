import type {FC, ReactNode} from "react"
import {AIOnlineModelIconMap} from "../defaultConstant"
import styles from "./ModelInfo.module.scss"
import {DocumentDuplicateSvgIcon} from "@/assets/newIcon"
import {OutlineLogIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {setClipboardText} from "@/utils/clipboard"
// import {RocketSvgIcon} from "@/components/layout/icons"
import {Tooltip} from "antd"
// import {SolidAnnotationIcon} from "@/assets/icon/solid"
import {formatTimestamp} from "@/utils/timeUtil"
import {AIChatToolDrawerContent} from "../chatTemplate/AIAgentChatTemplate"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useCreation, useMemoizedFn} from "ahooks"
import {OutlineAtomIconByStatus} from "../aiModelList/AIModelList"

export interface ModalInfoProps {
    icon?: string
    title?: string
    time?: number
    copyStr?: string
    callToolId?: string
}

const ModalInfo: FC<ModalInfoProps> = ({callToolId, icon, title, time, copyStr}) => {
    const iconSvg = useCreation(() => {
        return (
            AIOnlineModelIconMap[icon || ""] || (
                <OutlineAtomIconByStatus isRunning={true} iconClassName={styles["icon-small"]} />
            )
        )
    }, [icon])
    const handleDetails = useMemoizedFn(() => {
        if (!callToolId) return
        const m = showYakitDrawer({
            title: "详情",
            width: "40%",
            bodyStyle: {padding: 0},
            content: <AIChatToolDrawerContent callToolId={callToolId} />,
            onClose: () => m.destroy()
        })
    })

    return (
        <div className={styles["modal-info"]}>
            <div className={styles["modal-info-title"]}>
                {iconSvg}
                {title}
                {time && <span className={styles["modal-info-title-time"]}>{formatTimestamp(time)}</span>}
            </div>
            <div className={styles["modal-info-icons"]}>
                {copyStr && (
                    <Tooltip placement='top' title=''>
                        <YakitButton
                            type='text2'
                            color='default'
                            icon={<DocumentDuplicateSvgIcon />}
                            onClick={() => setClipboardText(copyStr)}
                        />
                    </Tooltip>
                )}
                {callToolId && (
                    <Tooltip placement='top' title='查看详情'>
                        <YakitButton type='text2' color='default' icon={<OutlineLogIcon />} onClick={handleDetails} />
                    </Tooltip>
                )}
                {/* <Tooltip placement='top' title='生成步骤'>
                    <YakitButton type='text2' color='default' icon={<OutlineLogIcon />} />
                </Tooltip>
                <Tooltip placement='top' title=''>
                    <YakitButton type='text2' color='default' icon={<SolidAnnotationIcon />} />
                </Tooltip>
                <Tooltip placement='top' title=''>
                    <YakitButton type='text2' color='default' icon={<RocketSvgIcon />} />
                </Tooltip> */}
            </div>
        </div>
    )
}
export default ModalInfo
