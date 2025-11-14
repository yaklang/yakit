import React, {useMemo, useState} from "react"
import {AIFileSystemListProps} from "./type"
import {useCreation} from "ahooks"
import {LocalPluginLog} from "@/pages/plugins/operator/pluginExecuteResult/LocalPluginLog"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import styles from "./AIFileSystemList.module.scss"
import FileTreeSystem from "./FileTreeSystem/FileTreeSystem"

enum TabKey {
    FileTree = "file-tree",
    OperationLog = "operation-log"
}

const options = [
    {label: "文件树", value: TabKey.FileTree},
    {label: "操作日志", value: TabKey.OperationLog}
]

export const AIFileSystemList: React.FC<AIFileSystemListProps> = React.memo(({execFileRecord}) => {
    const [activeTab, setActiveTab] = useState<TabKey>(TabKey.FileTree)

    const list = useCreation(() => {
        return Array.from(execFileRecord.values())
            .flat()
            .sort((a, b) => b.order - a.order)
    }, [execFileRecord])

    const tabContent: Record<TabKey, React.ReactNode> = useMemo(
        () => ({
            [TabKey.FileTree]: <FileTreeSystem />,
            [TabKey.OperationLog]: <LocalPluginLog loading={false} list={list} />
        }),
        [list]
    )

    return (
        <div className={styles["ai-file-system"]}>
            <div className={styles["ai-file-system-tab"]}>
                <YakitRadioButtons
                    buttonStyle='solid'
                    size='middle'
                    defaultValue={TabKey.FileTree}
                    options={options}
                    value={activeTab}
                    onChange={({target}) => setActiveTab(target.value as TabKey)}
                />
            </div>

            <div className={styles["ai-file-system-content"]}>{tabContent[activeTab]}</div>
        </div>
    )
})
