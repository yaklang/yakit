import {type FC, memo, useMemo, useReducer} from "react"

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
import {DeleteConfirm, EditKnowledgenBaseModal, ExportModal} from "./OperateKnowledgenBaseItem"

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

const KnowledgeBaseContainer: FC<TKnowledgeBaseContainerProps> = ({
    knowledgeBaseID,
    existsKnowledgeBaseAsync,
    streams,
    api,
    setKnowledgeBaseID
}) => {
    const {editKnowledgeBase, knowledgeBases} = useKnowledgeBase()
    const [state, dispatch] = useReducer(reducer, initialValue)

    // 当前知识库信息
    const findKnowledgeBaseItems: any = useMemo(() => {
        const result = knowledgeBases.find((it) => it.ID === knowledgeBaseID)
        const targetIndex = knowledgeBases.findIndex((it) => it.ID === result?.ID)
        const Icon = targetIcon(targetIndex)
        return {...result, icon: Icon}
    }, [knowledgeBaseID, knowledgeBases])

    const onStop = () => {
        editKnowledgeBase(knowledgeBaseID, {
            ...findKnowledgeBaseItems,
            streamstep: 2
        })
        api?.removeStream(findKnowledgeBaseItems.streamToken!)
    }

    // 控制删除弹窗显示
    const onDeleteVisible = (visible: boolean) => {
        dispatch({...state, deleteVisible: visible})
    }

    const onEditVisible = (visible: boolean) => {
        dispatch({...state, editVisble: visible})
    }

    const onExportVisible = (visible: boolean) => {
        dispatch({...state, exprotVisible: visible})
    }

    const resultContainer = useMemo(() => {
        if (
            findKnowledgeBaseItems.streamstep === 1 &&
            findKnowledgeBaseItems.streamToken &&
            streams?.[findKnowledgeBaseItems.streamToken]
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
                                知识库生成中，大概需要3～5秒，请耐心等待...
                            </div>
                        </div>
                        <div className={styles["header-right"]}>
                            <div className={styles["ai-button"]}>
                                <LightningBoltIcon />
                                AI 召回
                            </div>
                            <RoundedStopButton onClick={onStop} />
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
                    existsKnowledgeBaseAsync={existsKnowledgeBaseAsync}
                    onEditVisible={onEditVisible}
                    onDeleteVisible={onDeleteVisible}
                    onExportVisible={onExportVisible}
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
            <ExportModal visible={state.exprotVisible} setVisible={onExportVisible} KnowledgeBaseId={knowledgeBaseID} />
        </>
    )
}

export default memo(KnowledgeBaseContainer)
