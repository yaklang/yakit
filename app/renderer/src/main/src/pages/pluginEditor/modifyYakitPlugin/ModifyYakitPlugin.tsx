import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn, useSize} from "ahooks"
import {ModifyPluginCallback, PluginEditor, PluginEditorRefProps} from "../pluginEditor/PluginEditor"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakScript} from "@/pages/invoker/schema"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineXIcon} from "@/assets/icon/outline"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {ExclamationCircleOutlined} from "@ant-design/icons"

import classNames from "classnames"
import styles from "./ModifyYakitPlugin.module.scss"

interface ModifyYakitPluginProps {
    getContainer?: HTMLElement
    plugin: YakScript
    visible: boolean
    onCallback: (isSuccess: boolean, data?: ModifyPluginCallback) => void
}

export const ModifyYakitPlugin: React.FC<ModifyYakitPluginProps> = memo((props) => {
    const {getContainer, plugin, visible, onCallback} = props

    const [edit, setEdit] = useState<YakScript>(plugin)

    const getContainerSize = useSize(getContainer)
    // 抽屉展示高度
    const showHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])

    const editorRef = useRef<PluginEditorRefProps>(null)
    useEffect(() => {
        if (visible && edit) {
            if (editorRef.current) {
                editorRef.current.setEditPlugin({
                    id: Number(plugin.Id || 0) || 0,
                    name: plugin.ScriptName,
                    uuid: plugin.UUID || ""
                })
            }
        }
    }, [visible, edit])

    const onModifyCallback = useMemoizedFn((data: ModifyPluginCallback) => {
        onCallback(true, data)
    })
    // 关闭
    const onCancel = useMemoizedFn(async () => {
        if (editorRef.current) {
            const check = await editorRef.current.onCheckUnSaved()
            if (check) openUnsavedHint()
            else onCallback(false)
        } else {
            onCallback(false)
        }
    })

    const [unSavedHint, setUnSavedHint] = useState<boolean>(false)
    const [unsavedLoading, setUnsavedLoading] = useState<boolean>(false)
    // 未保存的提示框
    const openUnsavedHint = useMemoizedFn(() => {
        if (unSavedHint) return
        setUnSavedHint(true)
    })
    const unsavedHintCallback = useMemoizedFn((val: boolean) => {
        if (val) {
            if (!!editorRef.current) {
                setUnsavedLoading(true)
                editorRef.current.onSaveAndExit((val) => {
                    if (val) {
                        onCallback(true, val)
                    }
                    cancelUnsavedHint()
                })
                return
            }
        }
        onCallback(false)
        cancelUnsavedHint()
    })
    const cancelUnsavedHint = useMemoizedFn(() => {
        setUnsavedLoading(false)
        setUnSavedHint(false)
    })

    return (
        <>
            <YakitDrawer
                getContainer={getContainer}
                placement='bottom'
                mask={false}
                closable={false}
                keyboard={false}
                height={showHeight}
                visible={visible}
                className={classNames(styles["plugin-debug-drawer"])}
            >
                {visible && (
                    <PluginEditor
                        ref={editorRef}
                        title='编辑插件'
                        headerExtra={<YakitButton type='text2' icon={<OutlineXIcon />} onClick={onCancel} />}
                        onEditCancel={onModifyCallback}
                    />
                )}

                <YakitModal
                    getContainer={getContainer}
                    width={420}
                    type='white'
                    okText='保存'
                    okButtonProps={{loading: unsavedLoading}}
                    cancelText='不保存'
                    cancelButtonProps={{onClick: () => unsavedHintCallback(false)}}
                    keyboard={false}
                    maskStyle={{position: "absolute"}}
                    wrapClassName={styles["unsaved-hint"]}
                    visible={unSavedHint}
                    onOk={() => unsavedHintCallback(true)}
                    onCancel={cancelUnsavedHint}
                >
                    <div className={styles["unsaved-hint-body"]}>
                        <div className={styles["icon-wrapper"]}>
                            <ExclamationCircleOutlined className={styles["icon-style"]} />
                        </div>
                        <div className={styles["content"]}>
                            <div className={styles["title-style"]}>插件未保存</div>
                            <div>是否要将插件保存到本地?</div>
                        </div>
                    </div>
                </YakitModal>
            </YakitDrawer>
        </>
    )
})
