import ReactDOM from "react-dom"
import React, {memo, useMemo, useState} from "react"
import {YakitHintModal} from "./YakitHintModal"
import {YakitHintProps} from "./YakitHintType"
import {usePrevious} from "ahooks"

import classnames from "classnames"
import styles from "./YakitHint.module.scss"

export const YakitHint: React.FC<YakitHintProps> = memo((props) => {
    const {mask = true, maskColor, childModal = [], getContainer} = props

    const container = useMemo(() => {
        if (!getContainer) return document.body
        return getContainer
    }, [getContainer])

    const modalsPrevious = usePrevious(childModal)

    const [currentTop, setCurrnetTop] = useState<string>("main")

    const modals = useMemo(() => {
        if (!!modalsPrevious && modalsPrevious.length > 0) {
            for (let index in childModal) {
                /** 判断新数据位置是否超出旧数据长度 */
                const position = +index < modalsPrevious.length
                if (position) {
                    /** 新数据展示是否为true */
                    const isLatest = childModal[index].content.visible === true
                    /** 旧数据展示是否为false */
                    const isOld = modalsPrevious[index].content.visible === false
                    /** 由false变为true时，置顶该弹窗 */
                    if (isLatest && isOld) {
                        setTimeout(() => {
                            setCurrnetTop(childModal[index].key)
                        }, 100)
                        break
                    }
                }
            }
        }

        return childModal
    }, [childModal])

    return ReactDOM.createPortal(
        <div
            style={{backgroundColor: mask && maskColor ? maskColor : ""}}
            className={classnames(styles["yakit-hint-wrapper"], {[styles["yakit-hint-mask-wrapper"]]: mask})}
        >
            <div className={styles["yakit-hint-body"]}>
                <YakitHintModal
                    isDrag={true}
                    visible={true}
                    title={"main"}
                    isTop={currentTop === "main"}
                    setTop={() => setCurrnetTop("main")}
                />
                {modals.map((item) => {
                    const {key, content} = item

                    return (
                        <YakitHintModal
                            key={key}
                            {...content}
                            isTop={currentTop === key}
                            setTop={() => setCurrnetTop(key)}
                        />
                    )
                })}
            </div>
        </div>,
        container
    )
})
