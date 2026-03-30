import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {useEffect, useMemo, useRef, useState} from "react"
import FilePreview from "../FilePreview/FilePreview"
import FileTreeSystemListWapper from "../FileTreeSystemListWapper/FileTreeSystemListWapper"
import {useCustomFolder} from "../store/useCustomFolder"
import styles from "./FileTreeSystem.module.scss"
import FileTreeDrop from "@/pages/ai-agent/aiChatWelcome/FileTreeDrop/FileTreeDrop"
import {Divider} from "antd"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const FileTreeSystem = () => {
    const {t} = useI18nNamespaces(["aiAgent"])
    // 单选
    const [selected, setSelected] = useState<FileNodeProps>()
    // ai的文件夹
    const {grpcFolders} = useChatIPCStore().chatIPCData
    // 用户文件夹
    const customFolder = useCustomFolder()

    const filePreviewData = useMemo(() => {
        if (selected?.isFolder) return undefined
        return selected
    }, [selected])

    const hasEmittedRef = useRef(false)

    const [firstRatio, setFirstRatio] = useState("50%")

    useEffect(() => {
        if (!filePreviewData) return
        if (hasEmittedRef.current) return

        setFirstRatio("30%")
        hasEmittedRef.current = true
    }, [filePreviewData])

    return (
        <YakitResizeBox
            firstRatio={firstRatio}
            lineDirection='right'
            firstMinSize={200}
            lineStyle={{width: 4}}
            firstNodeStyle={{width: "30%", padding: "4px", overflow: "hidden"}}
            secondNodeStyle={{width:'70%'}}
            firstNode={
                <div className={styles.fileTreeSystemLeft}>
                    <div className={styles.topPanel}>
                        <FileTreeSystemListWapper
                            key='aiFolder'
                            path={grpcFolders}
                            selected={selected}
                            setSelected={setSelected}
                            title='AI Artifacts'
                            isOpen={false}
                        />
                    </div>
                    <Divider style={{margin: 0}} />
                    <div className={styles.bottomPanel}>
                        <FileTreeDrop>
                            {({setDragSource}) => (
                                <FileTreeSystemListWapper
                                    isOpen
                                    key='customFolder'
                                    title={t("FileTreeSystem.myOpenedFiles")}
                                    selected={selected}
                                    path={customFolder}
                                    setSelected={setSelected}
                                    onTreeDragStart={() => {
                                        setDragSource("AIRreeToChat")
                                    }}
                                    onTreeDragEnd={() => {
                                        setDragSource(null)
                                    }}
                                />
                            )}
                        </FileTreeDrop>
                    </div>
                </div>
            }
            secondNode={<FilePreview data={filePreviewData} />}
        />
    )
}

export default FileTreeSystem
