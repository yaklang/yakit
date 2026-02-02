import React, {useEffect, useMemo, useState} from "react"
import {AIFileSystemListProps, TabKey} from "./type"
import {useCreation} from "ahooks"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import styles from "./AIFileSystemList.module.scss"
import FileTreeSystem from "./FileTreeSystem/FileTreeSystem"
import OperationLog from "./OperationLog/OperationLog"


const options = [
    {label: "文件系统", value: TabKey.FileTree},
    {label: "读写日志", value: TabKey.OperationLog}
]

export const AIFileSystemList: React.FC<AIFileSystemListProps> = React.memo(({execFileRecord, activeKey, setActiveKey}) => {
    // 非受控模式下的内部状态
    const [internalActiveTab, setInternalActiveTab] = useState<TabKey>(activeKey ?? TabKey.FileTree)

    // 判断是否为受控模式
    const isControlled = setActiveKey !== undefined

    // 当前激活的 tab（受控模式使用 activeKey，非受控模式使用内部状态）
    const activeTab = isControlled ? (activeKey ?? TabKey.FileTree) : internalActiveTab

    useEffect(() => {
        if (!isControlled && activeKey !== undefined) {
            setInternalActiveTab(activeKey)
        }
    }, [activeKey, isControlled])

    const handleTabChange = (value: TabKey) => {
        if (isControlled) {
            setActiveKey(value)
        } else {
            setInternalActiveTab(value)
        }
    }

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
                    onChange={({target}) => handleTabChange(target.value as TabKey)}
                />
            </div>

            <div className={styles["ai-file-system-content"]}>{tabContent[activeTab]}</div>
        </div>
    )
})
