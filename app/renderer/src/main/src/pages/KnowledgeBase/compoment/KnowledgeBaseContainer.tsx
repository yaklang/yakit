import {type FC, memo, useEffect, useMemo} from "react"
import type {TKnowledgeBaseSidebarProps} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import KnowledgeBaseTable from "../knowledgeBaseTable"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {targetIcon} from "../utils"
import {renderFileTypeIcon} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {RoundedStopButton} from "@/pages/ai-re-act/aiReActChat/AIReActComponent"
import {LightningBoltIcon} from "../icon/sidebarIcon"
import {OutlineLoadingIcon} from "@/assets/icon/outline"

import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {useBuildingKnowledgeBase} from "../hooks/useBuildingKnowledgeBase"

type TKnowledgeBaseContainerProps = Omit<TKnowledgeBaseSidebarProps, "setKnowledgeBaseID">

const KnowledgeBaseContainer: FC<TKnowledgeBaseContainerProps> = ({knowledgeBaseID, knowledgeBases}) => {
    const getKnowledgeBase = useKnowledgeBase((s) => s.getKnowledgeBase)
    const editKnowledgeBase = useKnowledgeBase((s) => s.editKnowledgeBase)

    // 当前知识库信息
    const knowledgeBaseItems = useMemo(() => {
        const result = knowledgeBases.find((it) => it.ID === knowledgeBaseID)
        const targetIndex = knowledgeBases.findIndex((it) => it.ID === result?.ID)
        const Icon = targetIcon(targetIndex)
        return {...result, icon: Icon}
    }, [knowledgeBaseID, knowledgeBases])

    const findBasesToken = useMemo(() => {
        return knowledgeBaseItems?.streamToken ?? ""
    }, [knowledgeBaseID, knowledgeBases])

    // Hook 参数
    const files = knowledgeBaseItems.KnowledgeBaseFile?.map((it) => it.path) ?? []
    const kbName = knowledgeBaseItems.KnowledgeBaseName ?? ""
    const kbLength = knowledgeBaseItems.KnowledgeBaseLength ?? 1000
    // 调用 Hook，复用已有流
    const {streamInfo, runtimeId, isExecuting, stop} = useBuildingKnowledgeBase(findBasesToken, files, kbName, kbLength)

    const KnowledgeBaseTableItemProps = useMemo(() => {
        const name = getKnowledgeBase(knowledgeBaseID)?.KnowledgeBaseName ?? ""
        return {name, id: parseInt(knowledgeBaseID, 10)}
    }, [knowledgeBaseID, knowledgeBases])

    const onStop = () => {
        editKnowledgeBase(knowledgeBaseID, {
            ...knowledgeBaseItems
        })
        stop()
    }

    return findBasesToken ? (
        <div className={styles["building-knowledge-base"]}>
            {/* header */}
            <div className={styles["header"]}>
                <div className={styles["header-left"]}>
                    <knowledgeBaseItems.icon className={styles["icon"]} />
                    <div>{knowledgeBaseItems.KnowledgeBaseName}</div>
                    <div className={styles["tag"]}>
                        <OutlineLoadingIcon className={styles["loading-icon"]} />
                        知识库生成中，大概需要3～5秒，请耐心等待...
                    </div>
                </div>
                <div className={styles["header-right"]}>
                    <div className={styles["ai-button"]}>
                        <LightningBoltIcon onClick={onStop} />
                        AI 召回
                    </div>
                    <RoundedStopButton />
                </div>
            </div>

            {/* 文件列表 */}
            <div className={styles["knowledge-files"]}>
                知识源：
                {knowledgeBaseItems.KnowledgeBaseFile?.map((it) => (
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
                streamInfo={streamInfo}
                runtimeId={runtimeId}
                loading={isExecuting}
                defaultActiveKey='日志'
            />
        </div>
    ) : (
        <KnowledgeBaseTable knowledgeBaseitems={KnowledgeBaseTableItemProps} />
    )
}

export default memo(KnowledgeBaseContainer)
