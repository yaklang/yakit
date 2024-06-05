import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./BottomEditorDetails.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {BottomEditorDetailsProps, ShowItemType} from "./BottomEditorDetailsType"
import {HelpInfoList} from "../CollapseList/CollapseList"
import {OutlineXIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import { SyntaxCheckList } from "./SyntaxCheckList/SyntaxCheckList"
const {ipcRenderer} = window.require("electron")

// 编辑器区域 展示详情（输出/语法检查/终端/帮助信息）

export const BottomEditorDetails: React.FC<BottomEditorDetailsProps> = (props) => {
    const {onClose, showItem, setShowItem} = props
    // 不再重新加载的元素
    const [showType, setShowType] = useState<ShowItemType[]>([])

    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

    useEffect(() => {
        if (showItem) {
            setShowType((arr) => filterItem([...arr, showItem]))
        }
    }, [showItem])

    return (
        <div className={styles["bottom-editor-details"]}>
            <div className={styles["header"]}>
                <div className={styles["select-box"]}>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "output"
                        })}
                        onClick={() => setShowItem("output")}
                    >
                        <div className={styles["title"]}>输出</div>
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "syntaxCheck"
                        })}
                        onClick={() => setShowItem("syntaxCheck")}
                    >
                        <div className={styles["title"]}>语法检查</div>
                        <div className={styles["count"]}>3</div>
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "terminal"
                        })}
                        onClick={() => setShowItem("terminal")}
                    >
                        <div className={styles["title"]}>终端</div>
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "helpInfo"
                        })}
                        onClick={() => setShowItem("helpInfo")}
                    >
                        <div className={styles["title"]}>帮助信息</div>
                    </div>
                </div>
                <div className={styles["extra"]}>
                    <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onClose} />
                </div>
            </div>
            <div className={styles["content"]}>
                {showType.includes("helpInfo") && showItem === "helpInfo" && (
                    <HelpInfoList list={[{key: 1}, {key: 2}, {key: 3}, {key: 4}, {key: 5}]} />
                )}
                {
                    showType.includes("syntaxCheck") && showItem === "syntaxCheck" && <SyntaxCheckList/>

                }
            </div>
        </div>
    )
}
