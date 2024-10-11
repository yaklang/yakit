import React, {useEffect, useMemo, useRef, useState} from "react"
import {Popover, Tooltip} from "antd"
import {SettingOutlined} from "@ant-design/icons"
import {useDebounceFn, useGetState, useInViewport, useMemoizedFn, useUpdateEffect} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./BottomEditorDetails.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {BottomEditorDetailsProps, JumpToEditorProps, OutputInfoProps, ShowItemType} from "./BottomEditorDetailsType"
import {OutlineCogIcon, OutlineExitIcon, OutlineTrashIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SyntaxCheckList} from "./SyntaxCheckList/SyntaxCheckList"
import useStore from "../hooks/useStore"
import emiter from "@/utils/eventBus/eventBus"
import {Selection} from "../RunnerTabs/RunnerTabsType"
import { HelpInfoList } from "@/pages/YakRunner/CollapseList/CollapseList"
const {ipcRenderer} = window.require("electron")

// 编辑器区域 展示详情（输出/语法检查/终端/帮助信息）

export const BottomEditorDetails: React.FC<BottomEditorDetailsProps> = (props) => {
    const {isShowEditorDetails, setEditorDetails, showItem, setShowItem} = props

    const {activeFile, fileTree} = useStore()
    // 不再重新加载的元素
    const [showType, setShowType] = useState<ShowItemType[]>([])

    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    useEffect(() => {
        if (showItem && isShowEditorDetails) {
            if (showType.includes(showItem)) return
            setShowType((arr) => filterItem([...arr, showItem]))
        }
    }, [showItem, isShowEditorDetails])

    const syntaxCheckData = useMemo(() => {
        if (activeFile?.syntaxCheck) {
            return activeFile.syntaxCheck
        }
        return []
    }, [activeFile?.syntaxCheck])

    // 跳转至编辑器并选中
    const onJumpToEditor = useMemoizedFn((selections: Selection) => {
        if (activeFile?.path) {
            const obj: JumpToEditorProps = {
                selections,
                id: activeFile?.path || ""
            }
            emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify(obj))
        }
    })

    const onOpenBottomDetailFun = useMemoizedFn((v: string) => {
        try {
            const {type}: {type: ShowItemType} = JSON.parse(v)
            setEditorDetails(true)
            setShowItem(type)
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onCodeAuditOpenBottomDetail", onOpenBottomDetailFun)
        return () => {
            emiter.off("onCodeAuditOpenBottomDetail", onOpenBottomDetailFun)
        }
    }, [])



    return (
        <div className={styles["bottom-editor-details"]}>
            <div className={styles["header"]}>
                <div className={styles["select-box"]}>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "syntaxCheck",
                            [styles["no-active-item"]]: showItem !== "syntaxCheck"
                        })}
                        onClick={() => setShowItem("syntaxCheck")}
                    >
                        <div className={styles["title"]}>语法检查</div>
                        {activeFile && <div className={styles["count"]}>{syntaxCheckData.length}</div>}
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "helpInfo",
                            [styles["no-active-item"]]: showItem !== "helpInfo"
                        })}
                        onClick={() => setShowItem("helpInfo")}
                    >
                        <div className={styles["title"]}>帮助信息</div>
                    </div>
                </div>
                <div className={styles["extra"]}>
                    <YakitButton
                        type='text2'
                        icon={<OutlineXIcon />}
                        onClick={() => {
                            setEditorDetails(false)
                        }}
                    />
                </div>
            </div>
            <div className={styles["content"]}>
                {showType.includes("syntaxCheck") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "syntaxCheck"
                        })}
                    >
                        {activeFile ? (
                            <SyntaxCheckList syntaxCheckData={syntaxCheckData} onJumpToEditor={onJumpToEditor} />
                        ) : (
                            <div className={styles["no-syntax-check"]}>请选中具体文件查看语法检查信息</div>
                        )}
                    </div>
                )}
                {/* 帮助信息只有yak有 */}
                {showType.includes("helpInfo") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "helpInfo"
                        })}
                    >
                        {activeFile?.language === "yak" ? (
                            <HelpInfoList onJumpToEditor={onJumpToEditor} />
                        ) : (
                            <div className={styles["no-syntax-check"]}>请选中yak文件查看帮助信息</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
