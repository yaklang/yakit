import React, {useMemo} from "react"
import {AIFileSystemListProps, TabKey} from "./type"
import {useControllableValue, useCreation, useMount} from "ahooks"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import styles from "./AIFileSystemList.module.scss"
import FileTreeSystem from "./FileTreeSystem/FileTreeSystem"
import OperationLog from "./OperationLog/OperationLog"


const options = [
    {label: "文件系统", value: TabKey.FileTree},
    {label: "读写日志", value: TabKey.OperationLog}
]

export const AIFileSystemList: React.FC<AIFileSystemListProps> = React.memo(({execFileRecord, ...rest}) => {
    const [activeTab, setActiveTab] = useControllableValue<TabKey>(rest, {
        defaultValue: TabKey.FileTree,
        valuePropName: "activeKey",
        trigger: "setActiveKey"
    })
    useMount(() => {
      if(!activeTab){
        setActiveTab(TabKey.FileTree)
      }
    })

    const list = useCreation(() => {
        return Array.from(execFileRecord.values())
            .flat()
            .sort((a, b) => b.order - a.order)
    }, [execFileRecord])

    const tabContent: Record<TabKey, React.ReactNode> = useMemo(
        () => ({
            [TabKey.FileTree]: <FileTreeSystem />,
            [TabKey.OperationLog]: <OperationLog loading={false} list={list} />
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
