import {DocumentDuplicateSvgIcon} from "@/assets/newIcon"
import {OutlinCompileThreeIcon, OutlineLogIcon} from "@/assets/icon/outline"
import {setClipboardText} from "@/utils/clipboard"
import {showYakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import { useMemoizedFn } from "ahooks"
import { AIChatToolDrawerContent } from "../../chatTemplate/AIAgentChatTemplate"
import emiter from "@/utils/eventBus/eventBus"
import { AITabsEnum } from "../../defaultConstant"
import { TabKey } from "../aiFileSystemList/type"
import { Tooltip } from "antd"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"


export interface OperationCardFooterProps {
    copyStr?: string
    callToolId?: string
    aiFilePath?: string
}

export const OperationCardFooter: React.FC<OperationCardFooterProps> = ({copyStr, callToolId, aiFilePath}) => {
    const {t} = useI18nNamespaces(["aiAgent"])
    const handleDetails = useMemoizedFn(() => {
        if (!callToolId) return
        const m = showYakitDrawer({
            title: t("OperationCardFooter.details"),
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
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end"
            }}
        >
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
                <Tooltip placement='top' title={t("OperationCardFooter.viewFile")}>
                    <YakitButton
                        type='text2'
                        color='default'
                        icon={<OutlinCompileThreeIcon />}
                        onClick={handleViewFile}
                    />
                </Tooltip>
            )}
            {callToolId && (
                <Tooltip placement='top' title={t("OperationCardFooter.viewDetails")}>
                    <YakitButton type='text2' color='default' icon={<OutlineLogIcon />} onClick={handleDetails} />
                </Tooltip>
            )}
        </div>
    )
}
