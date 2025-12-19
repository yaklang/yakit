import {type FC, memo, useEffect, useMemo, useReducer} from "react"

import KnowledgeBaseTable from "./KnowledgeBaseTable"
import {KnowledgeBaseItem, useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {LightningBoltIcon} from "../icon/sidebarIcon"
import useMultipleHoldGRPCStream from "../hooks/useMultipleHoldGRPCStream"

import {targetIcon} from "../utils"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {RoundedStopButton} from "@/pages/ai-re-act/aiReActChat/AIReActComponent"
import {OutlineLoadingIcon} from "@/assets/icon/outline"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"

import type {TKnowledgeBaseSidebarProps} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import {DeleteConfirm, EditKnowledgenBaseModal} from "./OperateKnowledgenBaseItem"
import {apiCancelDebugPlugin} from "@/pages/plugins/utils"
import {randomString} from "@/utils/randomUtil"
import {handleSaveFileSystemDialog} from "@/utils/fileSystemDialog"
import {Tooltip} from "antd"
import {failed, success} from "@/utils/notification"
import {useSafeState} from "ahooks"
const {ipcRenderer} = window.require("electron")

type TKnowledgeBaseContainerProps = TKnowledgeBaseSidebarProps & {
    streams?: ReturnType<typeof useMultipleHoldGRPCStream>[0]
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
}

const initialValue = {
    deleteVisible: false,
    insertVisible: false,
    editVisble: false,
    exprotVisible: false
}

const reducer = (state: typeof initialValue, payload: typeof initialValue) => ({
    ...state,
    ...payload
})

const KnowledgeBaseContainer: FC<
    Omit<
        TKnowledgeBaseContainerProps,
        | "setAddMode"
        | "addMode"
        | "handleValidateAIModelUsable"
        | "isAIModelAvailable"
        | "setIsAIModelAvailable"
        | "aIModelAvailableTokens"
        | "progress"
    >
> = ({knowledgeBaseID, streams, api, setKnowledgeBaseID, setOpenQA}) => {
    const {editKnowledgeBase, knowledgeBases} = useKnowledgeBase()
    const [state, dispatch] = useReducer(reducer, initialValue)

    // 当前知识库信息
    const findKnowledgeBaseItems: any = useMemo(() => {
        const result = knowledgeBases.find((it) => it.ID === knowledgeBaseID)
        const targetIndex = knowledgeBases.findIndex((it) => it.ID === result?.ID)
        const Icon = targetIcon(targetIndex)
        return {...result, icon: Icon}
    }, [knowledgeBaseID, knowledgeBases])

    const onStop = async () => {
        try {
            api?.removeStream(findKnowledgeBaseItems.streamToken)

            await apiCancelDebugPlugin(findKnowledgeBaseItems.streamToken)

            // 更新业务状态
            if (findKnowledgeBaseItems) {
                editKnowledgeBase(findKnowledgeBaseItems.ID, {
                    ...findKnowledgeBaseItems,
                    streamstep: 2,
                    streamToken: randomString(50)
                })
            }
        } catch (error) {
            failed("停止知识库构建失败：" + error)
        }
    }

    // 控制删除弹窗显示
    const onDeleteVisible = (visible: boolean) => {
        dispatch({...state, deleteVisible: visible})
    }

    const onEditVisible = (visible: boolean) => {
        dispatch({...state, editVisble: visible})
    }

    const [exportToken, setExportToken] = useSafeState("")
    const onExportKnowledgeBase = async (KnowledgeBaseId: number) => {
        const defaultName = findKnowledgeBaseItems.KnowledgeBaseName
            ? `export-${findKnowledgeBaseItems.KnowledgeBaseName}`
            : "default-knowledge"

        try {
            const file = await handleSaveFileSystemDialog({
                title: "导出知识库",
                defaultPath: defaultName,
                filters: [{name: "Files", extensions: ["rag"]}]
            })

            if (!file || file.canceled) return

            const filePath = file.filePath
            if (!filePath) return

            const token = `export-kb-${Date.now()}`
            setExportToken(token)

            await ipcRenderer.invoke("ExportKnowledgeBase", {KnowledgeBaseId, TargetPath: filePath}, token)
        } catch (error) {
            failed("导出知识库失败：" + error)
        }
    }

    useEffect(() => {
        if (!exportToken) return

        const onError = (_: any, err: any) => {
            failed("导出知识库失败: " + err)
            setExportToken("")
        }

        const onEnd = () => {
            success("导出知识库成功")
            setExportToken("")
        }

        ipcRenderer.on(`${exportToken}-error`, onError)
        ipcRenderer.on(`${exportToken}-end`, onEnd)

        return () => {
            ipcRenderer.removeAllListeners(`${exportToken}-error`)
            ipcRenderer.removeAllListeners(`${exportToken}-end`)
        }
    }, [exportToken])

    const resultContainer = useMemo(() => {
        if (
            findKnowledgeBaseItems.streamstep === 1 &&
            findKnowledgeBaseItems.streamToken &&
            streams?.[findKnowledgeBaseItems.streamToken] &&
            findKnowledgeBaseItems.addManuallyItem === false
        ) {
            return (
                <div className={styles["building-knowledge-base"]}>
                    {/* header */}
                    <div className={styles["header"]}>
                        <div className={styles["header-left"]}>
                            <findKnowledgeBaseItems.icon className={styles["icon"]} />
                            <div>{findKnowledgeBaseItems.KnowledgeBaseName}</div>
                            <div className={styles["tag"]}>
                                <OutlineLoadingIcon className={styles["loading-icon"]} />
                                知识库生成中，大概需要 3～5 秒，请耐心等待...
                            </div>
                        </div>
                        <div className={styles["header-right"]}>
                            <div className={styles["ai-button"]} onClick={() => setOpenQA(true)}>
                                <LightningBoltIcon />
                                AI 召回
                            </div>
                            <Tooltip title='停止'>
                                <RoundedStopButton onClick={onStop} />
                            </Tooltip>
                        </div>
                    </div>

                    {/* 文件列表 */}
                    <div className={styles["knowledge-files"]}>
                        知识源：
                        {findKnowledgeBaseItems.KnowledgeBaseFile?.map((it) => (
                            <div className={styles["files-items"]} key={it.path}>
                                {renderFileTypeIcon({
                                    type: it.fileType,
                                    iconClassName: styles["info-icon"]
                                })}
                                {it.path}
                            </div>
                        ))}
                    </div>
                    <PluginExecuteResult
                        streamInfo={streams[findKnowledgeBaseItems.streamToken]}
                        runtimeId={streams[findKnowledgeBaseItems.streamToken]?.runtimeId ?? ""}
                        loading={streams[findKnowledgeBaseItems.streamToken]?.loading ?? false}
                        defaultActiveKey='日志'
                    />
                </div>
            )
        } else {
            return (
                <KnowledgeBaseTable
                    streams={streams}
                    knowledgeBaseItems={findKnowledgeBaseItems}
                    api={api}
                    onEditVisible={onEditVisible}
                    onDeleteVisible={onDeleteVisible}
                    onExportKnowledgeBase={onExportKnowledgeBase}
                    setOpenQA={setOpenQA}
                />
            )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streams, findKnowledgeBaseItems])

    const targetEditKnowledgeBase = useMemo(() => {
        const result = knowledgeBases.find((it) => it.ID === knowledgeBaseID)
        return result as KnowledgeBaseItem
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeBaseID])

    return (
        <>
            {resultContainer}
            <DeleteConfirm
                knowledgeBase={knowledgeBases}
                visible={state.deleteVisible}
                setVisible={onDeleteVisible}
                KnowledgeBaseId={knowledgeBaseID}
                setKnowledgeBaseID={setKnowledgeBaseID}
            />

            <EditKnowledgenBaseModal
                visible={state.editVisble}
                setVisible={onEditVisible}
                items={targetEditKnowledgeBase}
            />
        </>
    )
}

export default memo(KnowledgeBaseContainer)
