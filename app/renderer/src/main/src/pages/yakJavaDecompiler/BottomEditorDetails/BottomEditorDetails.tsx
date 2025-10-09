import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import styles from "./BottomEditorDetails.module.scss"
import classNames from "classnames"
import {BottomEditorDetailsProps, ShowItemType} from "./BottomEditorDetailsType"
import {OutlineXIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useStore from "../hooks/useStore"
import emiter from "@/utils/eventBus/eventBus"

// 编辑器区域 展示详情（输出/语法检查/终端/帮助信息）

export const BottomEditorDetails: React.FC<BottomEditorDetailsProps> = (props) => {
    const {isShowEditorDetails, setEditorDetails, showItem, setShowItem} = props
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



    return (
        <div className={styles["bottom-editor-details"]}>
            <div className={styles["header"]}>
                <div className={styles["select-box"]}>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "ruleEditor",
                            [styles["no-active-item"]]: showItem !== "ruleEditor"
                        })}
                        onClick={() => setShowItem("ruleEditor")}
                    >
                        <div className={styles["title"]}>规则编写</div>
                    </div>
                    <div
                        className={classNames(styles["item"], {
                            [styles["active-item"]]: showItem === "holeDetail",
                            [styles["no-active-item"]]: showItem !== "holeDetail"
                        })}
                        onClick={() => setShowItem("holeDetail")}
                    >
                        <div className={styles["title"]}>漏洞详情</div>
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
                {showType.includes("ruleEditor") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "ruleEditor"
                        })}
                    >
                     
                    </div>
                )}
                {showType.includes("holeDetail") && (
                    <div
                        className={classNames(styles["render-hideen"], {
                            [styles["render-show"]]: showItem === "holeDetail"
                        })}
                    >
                    </div>
                )}
            </div>
        </div>
    )
}
