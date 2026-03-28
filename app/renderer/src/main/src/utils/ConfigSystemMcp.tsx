import React, {useMemo} from "react"
import {Form} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {OutlineXIcon} from "@/assets/icon/outline"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SystemInfo} from "@/constants/hardware"
import {localMcpDefalutUrl, mcpStreamHooks, remoteMcpDefalutUrl} from "@/components/layout/hooks/useMcp/useMcp"
import styles from "./ConfigSystemProxy.module.scss"
import i18n from "@/i18n/i18n"

const t = i18n.getFixedT(null, "utils")
interface ConfigMcpModalProps {
    onClose: () => void
    mcp: mcpStreamHooks
}

export const ConfigMcpModal: React.FC<ConfigMcpModalProps> = (props) => {
    const {
        onClose,
        mcp: {mcpStreamInfo, mcpStreamEvent}
    } = props

    const enableMcp = useMemo(() => {
        if (!mcpStreamInfo.mcpCurrent) return false
        if (["stopped", "error"].includes(mcpStreamInfo.mcpCurrent.Status)) {
            return false
        }
        if (!mcpStreamInfo.mcpServerUrl) return false
        return true
    }, [mcpStreamInfo])

    const onSetMcp = useMemoizedFn(() => {
        mcpStreamEvent.onStart()
    })

    const onCloseModal = useMemoizedFn(() => {
        if (!enableMcp) {
            mcpStreamEvent.onSetMcpUrl(SystemInfo.mode === "remote" ? remoteMcpDefalutUrl : localMcpDefalutUrl)
        }
        onClose()
    })

    return (
        <YakitModal
            visible={true}
            width={500}
            title={null}
            footer={null}
            closable={false}
            centered={true}
            hiddenHeader={true}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["config-system-proxy"]}>
                <div className={styles["config-system-proxy-heard"]}>
                    <div className={styles["config-system-proxy-title"]}>{t("ConfigSystemMcp.title")}</div>
                    <OutlineXIcon className={styles["close-icon"]} onClick={onCloseModal} />
                </div>
                <div
                    className={classNames(styles["config-system-proxy-status-success"], {
                        [styles["config-system-proxy-status-danger"]]: !enableMcp
                    })}
                >
                    {t("ConfigSystemMcp.currentStatus")}
                    <span>{enableMcp ? t("ConfigSystemMcp.enabled") : t("ConfigSystemMcp.disabled")}</span>
                </div>
                <Form layout='vertical' style={{padding: "0 24px 24px"}}>
                    <Form.Item label={t("ConfigSystemMcp.startAddress")} help={t("ConfigSystemMcp.startAddressHelp")}>
                        {enableMcp ? (
                            <YakitTag
                                enableCopy={true}
                                color='blue'
                                copyText={mcpStreamInfo.mcpServerUrl}
                                style={{position: "relative", top: "-8px"}}
                            ></YakitTag>
                        ) : (
                            <YakitInput
                            addonBefore='http://'
                                value={mcpStreamInfo.mcpUrl}
                                onChange={(e) => {
                                    mcpStreamEvent.onSetMcpUrl(e.target.value)
                                }}
                                size='large'
                            />
                        )}
                    </Form.Item>
                    <div className={styles["config-system-proxy-btns"]}>
                        <YakitButton type='outline2' size='large' onClick={onCloseModal}>
                            {t("ConfigSystemMcp.cancel")}
                        </YakitButton>
                        {enableMcp ? (
                            <YakitButton
                                size='large'
                                colors='danger'
                                onClick={() => {
                                    mcpStreamEvent.onCancel()
                                }}
                            >
                                {t("ConfigSystemMcp.disable")}
                            </YakitButton>
                        ) : (
                            <YakitButton colors='primary' size='large' onClick={onSetMcp}>
                                {t("ConfigSystemMcp.enable")}
                            </YakitButton>
                        )}
                    </div>
                </Form>
            </div>
        </YakitModal>
    )
}
