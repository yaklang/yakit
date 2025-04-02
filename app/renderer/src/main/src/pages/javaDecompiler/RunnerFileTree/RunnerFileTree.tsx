import React, {memo, useMemo, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {FileTree} from "@/pages/yakRunner/FileTree/FileTree"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlinePluscircleIcon,
    OutlinePositionIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineClouddownloadIcon,
    OutlineXIcon
} from "@/assets/icon/outline"

import classNames from "classnames"
import styles from "./RunnerFileTree.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {RunnerFileTreeProps} from "./RunnerFileTreeType"
import {Tooltip} from "antd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {failed, yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export const RunnerFileTree: React.FC<RunnerFileTreeProps> = memo((props) => {
    const {
        jarPath,
        treeData,
        loading,
        focusedKey,
        setFocusedKey,
        expandedKeys,
        setExpandedKeys,
        loadJarStructure,
        onLoadData,
        onNodeSelect,
        resetDecompiler,
        importProject,
        downloadAsZip,
        importProjectAndCompile
    } = props

    // 搜索关键词
    // 是否正在下载 ZIP 文件
    const [downloading, setDownloading] = useState<boolean>(false)

    // 菜单数据
    const menuData: YakitMenuItemType[] = useMemo(() => {
        const menu: YakitMenuItemType[] = [
            {
                key: "refresh",
                label: "刷新",
                disabled: !jarPath || loading
            },
            {
                key: "close",
                label: "关闭 JAR",
                disabled: !jarPath
            },
            {
                key: "downloadZip",
                label: "下载为 ZIP",
                disabled: !jarPath
            },
            {
                key: "importPorject",
                label: "导入为项目",
                disabled: !jarPath
            },
            {
                key: "importPorjectAndCompile",
                label: "导入并编译",
                disabled: !jarPath
            }
        ]

        return menu
    }, [jarPath, loading])

    // 下载为 ZIP 文件
    const _downloadAsZip = useMemoizedFn(() => {
        if (!jarPath) return

        showYakitModal({
            title: "下载为 ZIP 文件",
            content: (
                <div className={styles["download-modal"]}>
                    <div className={styles["download-hint"]}>选择下载选项并指定保存路径，保存 JAR 文件为 ZIP 格式</div>
                    <div className={styles["download-options"]}>
                        <YakitCheckbox checked={true}>包含所有文件</YakitCheckbox>
                    </div>
                    <div className={styles["file-info"]}>
                        <YakitTag>当前 JAR</YakitTag>
                        <span className={styles["jar-name"]}>{jarPath.split("/").pop()}</span>
                    </div>
                </div>
            ),
            onOk: () => {
                // 实际下载逻辑
                setDownloading(true)
                try {
                    // 这里需要实现 JAR 转 ZIP 的逻辑
                    // 可以调用后端接口或使用 Node.js 功能来实现
                    setTimeout(() => {
                        // 模拟下载完成
                        setDownloading(false)
                        yakitNotify("success", "ZIP 文件已保存")
                    }, 1500)
                } catch (error) {
                    failed(`下载失败: ${error}`)
                    setDownloading(false)
                }
            }
        })
    })

    // 菜单选择处理
    const menuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "refresh":
                loadJarStructure(`javadec:///jar-aifix?jar=${jarPath}&dir=/`)
                break
            case "close":
                resetDecompiler()
                break
            case "downloadZip":
                downloadAsZip()
                break
            case "importPorject":
                importProject()
                break
            case "importPorjectAndCompile":
                importProjectAndCompile()
                break
            default:
                break
        }
    })

    // 定位到选中文件
    const locateToFile = useMemoizedFn(() => {
        if (!focusedKey) return

        // 确保展开选中文件的父目录
        const file = treeData.find((item) => item.path === focusedKey)
        if (file && file.parent) {
            setExpandedKeys([...expandedKeys, file.parent])
        }

        // 滚动到选中文件
        const element = document.querySelector(`[data-path="${focusedKey}"]`)
        if (element) {
            element.scrollIntoView({behavior: "smooth", block: "center"})
        }
    })

    return (
        <div className={styles["runner-file-tree"]}>
            <div className={styles["file-tree-container"]}>
                <div className={styles["file-tree-header"]}>
                    <div className={styles["title-box"]}>
                        <div className={styles["title-style"]}>文件列表</div>
                        {loading && <YakitSpin size='small' />}
                    </div>
                    <div className={styles["extra"]}>
                        <Tooltip title={"刷新"}>
                            <YakitButton
                                type='text'
                                disabled={!jarPath || loading}
                                icon={<OutlineRefreshIcon />}
                                onClick={() => loadJarStructure(`javadec:///jar-aifix?jar=${jarPath}&dir=/`)}
                            />
                        </Tooltip>
                        <YakitDropdownMenu
                            menu={{
                                data: menuData,
                                onClick: ({key}) => menuSelect(key)
                            }}
                            dropdown={{
                                trigger: ["click"],
                                placement: "bottomRight"
                            }}
                        >
                            <YakitButton type='text' icon={<OutlinePluscircleIcon />} />
                        </YakitDropdownMenu>
                    </div>
                </div>

                <div className={styles["file-tree-body"]}>
                    {treeData.length > 0 ? (
                        <FileTree
                            folderPath={jarPath}
                            data={treeData}
                            onLoadData={onLoadData}
                            onSelect={onNodeSelect}
                            foucsedKey={focusedKey}
                            setFoucsedKey={setFocusedKey}
                            expandedKeys={expandedKeys}
                            setExpandedKeys={setExpandedKeys}
                        />
                    ) : (
                        !loading && (
                            <div className={styles["empty-tree"]}>{jarPath ? "JAR 文件为空" : "请上传 JAR 文件"}</div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
})
