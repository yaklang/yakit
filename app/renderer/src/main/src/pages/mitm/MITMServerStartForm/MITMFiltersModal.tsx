import React, {useEffect, useImperativeHandle, useRef, useState} from "react"
import classNames from "classnames"
import styles from "./MITMServerStartForm.module.scss"
import {ClientCertificate} from "./MITMServerStartForm"
import {getRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"
import {useMemoizedFn} from "ahooks"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {info, yakitFailed} from "@/utils/notification"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Divider, Form, Upload} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ExportIcon, PlusCircleIcon, SaveIcon, TrashIcon} from "@/assets/newIcon"
import {MITMFilters, MITMFilterSchema} from "./MITMFilters"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"

const {ipcRenderer} = window.require("electron")

interface MITMFiltersModalProps {
    visible: boolean
    setVisible: (b: boolean) => void
}
const MITMFiltersModal: React.FC<MITMFiltersModalProps> = React.memo((props) => {
    const {visible, setVisible} = props
    // filter 过滤器
    const [_mitmFilter, setMITMFilter] = useState<MITMFilterSchema>()
    const onResetFilters = useMemoizedFn(() => {
        ipcRenderer.invoke("mitm-reset-filter").then(() => {
            info("MITM 过滤器重置命令已发送")
            setVisible(false)
        })
    })
    useEffect(() => {
        ipcRenderer.on("client-mitm-filter", onSetFilter)
        return () => {
            ipcRenderer.removeListener("client-mitm-filter", onSetFilter)
        }
    }, [])
    const onSetFilter = useMemoizedFn((e, msg) => {
        info("更新 MITM 过滤器状态")
        setMITMFilter({
            includeSuffix: msg.includeSuffix,
            excludeMethod: msg.excludeMethod,
            excludeSuffix: msg.excludeSuffix,
            includeHostname: msg.includeHostname,
            excludeHostname: msg.excludeHostname,
            excludeContentTypes: msg.excludeContentTypes,
            excludeUri: msg.excludeUri,
            includeUri: msg.includeUri
        })
    })
    return (
        <YakitModal
            visible={visible}
            onCancel={() => setVisible(false)}
            closable={true}
            title='过滤器配置'
            width={720}
            subTitle={
                <div className={styles["mitm-filters-subTitle"]}>
                    <YakitButton type='text' onClick={() => onResetFilters()}>
                        重置过滤器
                    </YakitButton>
                </div>
            }
            className={styles["mitm-filters-modal"]}
        >
            <MITMFilters filter={_mitmFilter} />
        </YakitModal>
    )
})

export default MITMFiltersModal
