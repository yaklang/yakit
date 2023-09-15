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
import {Divider, Form, Modal, Upload} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ExportIcon, PlusCircleIcon, RemoveIcon, SaveIcon, TrashIcon} from "@/assets/newIcon"
import {MITMFilters, MITMFilterSchema} from "./MITMFilters"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {ExclamationCircleOutlined} from "@ant-design/icons"

const {ipcRenderer} = window.require("electron")

interface MITMFiltersModalProps {
    isStartMITM: boolean
    visible: boolean
    setVisible: (b: boolean) => void
}
const MITMFiltersModal: React.FC<MITMFiltersModalProps> = React.memo((props) => {
    const {visible, setVisible, isStartMITM} = props
    const filtersRef = useRef<any>()
    // filter 过滤器
    const [_mitmFilter, setMITMFilter] = useState<MITMFilterSchema>()
    const onResetFilters = useMemoizedFn(() => {
        ipcRenderer.invoke("mitm-reset-filter").then(() => {
            info("MITM 过滤器重置命令已发送")
            setVisible(false)
        })
    })
    useEffect(() => {
        ipcRenderer.on("client-mitm-filter", (e, msg) => {
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
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-filter")
        }
    }, [])
    useEffect(() => {
        if (visible) getMITMFilter()
    }, [visible])
    const onSetFilter = useMemoizedFn(() => {
        const filter = filtersRef.current.getFormValue()
        ipcRenderer
            .invoke("mitm-set-filter", filter)
            .then(() => {
                setMITMFilter(filter)
                setVisible(false)
                info("更新 MITM 过滤器状态")
            })
            .catch((err) => {
                yakitFailed("更新 MITM 过滤器失败:" + err)
            })
    })
    const getMITMFilter = useMemoizedFn(() => {
        ipcRenderer
            .invoke("mitm-get-filter")
            .then((val: MITMFilterSchema) => {
                setMITMFilter(val)
            })
            .catch((err) => {
                yakitFailed("获取 MITM 过滤器失败:" + err)
            })
    })
    const onClearFilters = () => {
        filtersRef.current.clearFormValue()
    }

    // 判断对象内的属性是否为空
    const areObjectPropertiesEmpty = useMemoizedFn((obj) => {
        try {
            for (const key in obj) {
                if (obj[key] !== null && obj[key] !== undefined && Array.isArray(obj[key]) && obj[key].length > 0) {
                    return false
                }
            }
            return true
        } catch (error) {
            return true
        }
    })
    return (
        <YakitModal
            visible={visible}
            onCancel={() => {
                setVisible(false)
            }}
            closable={false}
            title='过滤器配置'
            width={720}
            maskClosable={false}
            subTitle={
                isStartMITM && (
                    <div className={styles["mitm-filters-subTitle"]}>
                        <YakitButton type='text' onClick={() => onClearFilters()}>
                            清除
                        </YakitButton>
                        <YakitButton type='text' onClick={() => onResetFilters()}>
                            重置过滤器
                        </YakitButton>
                    </div>
                )
            }
            className={styles["mitm-filters-modal"]}
            onOk={() => {
                const filter = filtersRef.current.getFormValue()
                if (areObjectPropertiesEmpty(filter)) {
                    Modal.confirm({
                        title: "温馨提示",
                        icon: <ExclamationCircleOutlined />,
                        content: "过滤器为空时将重置为默认配置，确认重置吗？",
                        okText: "确认",
                        cancelText: "取消",
                        closable: true,
                        closeIcon: (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation()
                                    Modal.destroyAll()
                                }}
                                className='modal-remove-icon'
                            >
                                <RemoveIcon />
                            </div>
                        ),
                        onOk: () => {
                            onSetFilter()
                        },
                        onCancel: () => {},
                        cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                        okButtonProps: {size: "small", className: "modal-ok-button"}
                    })
                } else {
                    onSetFilter()
                }
            }}
        >
            <MITMFilters filter={_mitmFilter} onFinished={() => onSetFilter()} ref={filtersRef} />
        </YakitModal>
    )
})

export default MITMFiltersModal
