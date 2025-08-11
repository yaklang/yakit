import React, {useEffect, useRef, useState} from "react"
import {AIToolEditorProps} from "./AIToolEditorType"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {useSubscribeClose} from "@/store/tabSubscribe"

const AIToolEditor: React.FC<AIToolEditorProps> = React.memo((props) => {
    const {pageId, isModify} = props

    const [saveLoading, setSaveLoading] = useState<boolean>(false)

    const handleModifyInit = useMemoizedFn(() => {})
    const handleSave = useMemoizedFn(() => {
        return new Promise<void>((resolve, reject) => {
            // 模拟保存操作
            setTimeout(() => {
                console.log("保存成功")
                resolve()
            }, 1000)
        })
    })
    // #region 注册关闭页面时的触发事件
    // 保存并退出
    const handleSaveAndExit = useMemoizedFn((isModify?: boolean) => {
        handleSave()
            .then(() => {
                if (modalRef.current) modalRef.current.destroy()
                emiter.emit(
                    "closePage",
                    JSON.stringify({route: !!isModify ? YakitRoute.ModifyAITool : YakitRoute.AddAITool})
                )
            })
            .catch(() => {})
    })
    // 是否保存并打开触发编辑的工具信息
    const handleSaveAndOpen = useMemoizedFn(async (isSave?: boolean) => {
        try {
            if (isSave) await handleSave()
            if (modalRef.current) modalRef.current.destroy()
            handleModifyInit()
        } catch (error) {}
    })
    const {setSubscribeClose, removeSubscribeClose} = useSubscribeClose()
    // 二次提示框的实例
    const modalRef = useRef<{destroy: () => void}>({
        destroy: () => {}
    })
    useEffect(() => {
        if (isModify) {
            setSubscribeClose(YakitRoute.ModifyAITool, {
                close: async () => {
                    return {
                        title: "工具未保存",
                        content: "是否要将工具保存?",
                        confirmLoading: saveLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            handleSaveAndExit(true)
                        },
                        onCancel: () => {
                            emiter.emit("closePage", JSON.stringify({route: YakitRoute.ModifyAITool}))
                        }
                    }
                },
                reset: async () => {
                    return {
                        title: "工具未保存",
                        content: "是否要将当前工具保存，并编辑点击的工具?",
                        confirmLoading: saveLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            handleSaveAndOpen(true)
                        },
                        onCancel: () => {
                            handleSaveAndOpen()
                        }
                    }
                }
            })

            return () => {
                removeSubscribeClose(YakitRoute.ModifyAITool)
            }
        } else {
            setSubscribeClose(YakitRoute.AddAITool, {
                close: async () => {
                    return {
                        title: "工具未保存",
                        content: "是否要将工具保存?",
                        confirmLoading: saveLoading,
                        maskClosable: false,
                        onOk: (m) => {
                            modalRef.current = m
                            handleSaveAndExit()
                        },
                        onCancel: () => {
                            emiter.emit("closePage", JSON.stringify({route: YakitRoute.AddAITool}))
                        }
                    }
                }
            })
            return () => {
                removeSubscribeClose(YakitRoute.AddAITool)
            }
        }
    }, [isModify])
    // #endregion
    return <div>tool</div>
})

export default AIToolEditor
