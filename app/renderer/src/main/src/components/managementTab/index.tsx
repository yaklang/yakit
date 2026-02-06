import React, {useMemo, useState} from "react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidPayloadIcon} from "@/assets/icon/solid"
import {configManagementTabType, useConfigManagementTab} from "@/store"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {useMemoizedFn} from "ahooks"
import {isYakitOrEnpriTrace} from "@/utils/envfile"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./index.module.scss"

/**
 * @name 管理功能标签组件 (Payload/代理/热补丁)
 */
export const ManagementTab: React.FC<{ hideIcon?: boolean }> = React.memo((props) => {
    const {t, i18n} = useI18nNamespaces(["yakitRoute", "layout"])
    const {configManagementActiveTab, setConfigManagementActiveTab} = useConfigManagementTab()
    const [payloadMenuShow, setPayloadMenuShow] = useState<boolean>(false)

    const payloadMenuSelect = useMemoizedFn((key: string) => {
        const tab = key as configManagementTabType
        setConfigManagementActiveTab(tab)
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.ConfigManagement}))
        setPayloadMenuShow(false)
    })

    const managementTitle = useMemo(() => {
        switch (configManagementActiveTab) {
            case "payload":
                return t("YakitRoute.Payload")
            case "proxy":
                return t("Layout.ExtraMenu.proxyManagement")
            case "hotPatch":
                return t("Layout.ExtraMenu.hotPatchManagement")
            default:
                return t("YakitRoute.Payload")
        }
    }, [configManagementActiveTab, i18n.language])

    if (!isYakitOrEnpriTrace()) return null

    return (
        <YakitPopover
            placement={"bottom"}
            overlayClassName={styles["management-menu-wrapper"]}
            content={
                <YakitMenu
                    selectedKeys={[configManagementActiveTab]}
                    data={[
                        {key: "payload", label: t("YakitRoute.Payload")},
                        {key: "proxy", label: t("Layout.ExtraMenu.proxyManagement")},
                        {key: "hotPatch", label: t("Layout.ExtraMenu.hotPatchManagement")}
                    ]}
                    onClick={({key}) => payloadMenuSelect(key)}
                />
            }
            visible={payloadMenuShow}
            onVisibleChange={(visible) => setPayloadMenuShow(visible)}
        >
            <YakitButton 
                type='secondary2' 
                className={styles["button-border"]} 
                icon={!props.hideIcon ? <SolidPayloadIcon /> : undefined}
            >
                {managementTitle}
            </YakitButton>
        </YakitPopover>
    )
})
