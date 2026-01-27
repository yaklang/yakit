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

export interface ModalInfoProps {
    icon?: string
    title?: string
    time?: number
    copyStr?: string
    callToolId?: string
    aiFilePath?: string
}

const ModalInfo: FC<ModalInfoProps> = ({callToolId, icon, title, time, copyStr, aiFilePath}) => {
    const iconSvg = useCreation(() => {
        return AIOnlineModelIconMap[icon || ""] || <OutlineAtomIconByStatus isRunning={true} size='small' />
    }, [icon])
    const handleDetails = useMemoizedFn(() => {
        if (!callToolId) return
        const m = showYakitDrawer({
            title: "详情",
            width: "40%",
            bodyStyle: {padding: 0},
            content: <AIChatToolDrawerContent callToolId={callToolId} aiFilePath={aiFilePath} />,
            onClose: () => m.destroy()
        })
    })

    // 跳转并查看文件
    const handleViewFile = useMemoizedFn(() => {
        if (!aiFilePath) return

        emiter.emit("switchAIActTab", JSON.stringify({key: AITabsEnum.File_System}))
        setTimeout(() => {
            emiter.emit("fileSystemDefaultExpand", aiFilePath)
        }, 800)
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
                {aiFilePath && (
                    <Tooltip placement='top' title='查看文件'>
                        <YakitButton
                            type='text2'
                            color='default'
                            icon={<OutlinCompileThreeIcon />}
                            onClick={handleViewFile}
                        />
                    </Tooltip>
                )}
                {callToolId && (
                    <Tooltip placement='top' title='查看详情'>
                        <YakitButton type='text2' color='default' icon={<OutlineLogIcon />} onClick={handleDetails} />
                    </Tooltip>
                )}
                {/*   <Tooltip placement='top' title=''>
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
