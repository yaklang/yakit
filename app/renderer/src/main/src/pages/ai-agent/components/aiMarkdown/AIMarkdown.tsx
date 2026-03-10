import {AIMarkdownProps} from "./type"
import React, {ReactNode, useState} from "react"
import {ReportItem} from "@/pages/assetViewer/reportRenders/schema"
import {useCreation, useMemoizedFn} from "ahooks"
import classNames from "classnames"
import styles from "./AIMarkdown.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevronsDownUpIcon, OutlineChevronsUpDownIcon} from "@/assets/icon/outline"
import ModalInfo from "../ModelInfo"
import {ColorsPreViewMDIcon, ColorsSourceCodeIcon} from "@/assets/icon/colors"
import ChatCard from "../ChatCard"
import {Tooltip} from "antd"
import {StreamMarkdown} from "@/pages/assetViewer/reportRenders/markdownRender"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"

export const AIMarkdown: React.FC<AIMarkdownProps> = React.memo((props) => {
    const {content, nodeLabel, className, modalInfo, referenceNode} = props
    const [type, setType] = useState<"preview" | "code">("preview")
    const [expand, setExpand] = useState<boolean>(true)
    const item: ReportItem = useCreation(() => {
        const value: ReportItem = {
            type: "",
            content: content
        }
        return value
    }, [content])
    const renderContent = useMemoizedFn(() => {
        let content: ReactNode = <></>
        switch (type) {
            case "preview":
                content = (
                    <StreamMarkdown
                        wrapperClassName={classNames(styles["ai-milkdown"], {
                            [styles["ai-milkdown-mini"]]: !expand
                        })}
                        content={item.content}
                    />
                )
                break
            case "code":
                content = (
                    <div
                        className={classNames(styles["ai-milkdown-code"], {
                            [styles["ai-milkdown-code-mini"]]: !expand
                        })}
                    >
                        <YakitEditor type='plaintext' readOnly={true} value={item.content} />
                    </div>
                )
                break
            default:
                break
        }
        return content
    })
    return (
        <ChatCard
            titleText={nodeLabel}
            titleExtra={<ModalInfo {...modalInfo} />}
            titleMore={
                <div className={styles["header-extra"]}>
                    <Tooltip title={type === "code" ? "切换预览模式" : "切换源码模式"}>
                        <YakitButton
                            type='text'
                            icon={type === "code" ? <ColorsSourceCodeIcon /> : <ColorsPreViewMDIcon />}
                            onClick={() => setType(type === "code" ? "preview" : "code")}
                        />
                    </Tooltip>
                    <Tooltip title={expand ? "收起" : "展开"}>
                        <YakitButton
                            type='text2'
                            onClick={() => setExpand((v) => !v)}
                            icon={expand ? <OutlineChevronsDownUpIcon /> : <OutlineChevronsUpDownIcon />}
                        />
                    </Tooltip>
                </div>
            }
            className={classNames(styles["ai-milkdown-wrapper"], className)}
        >
            {renderContent()}
            {referenceNode}
        </ChatCard>
    )
})
