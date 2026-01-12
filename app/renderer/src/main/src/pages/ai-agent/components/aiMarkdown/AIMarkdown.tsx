import {YakitRadioButtonsProps} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtonsType"
import {AIMarkdownProps} from "./type"
import React, {ReactNode, useState} from "react"
import {ReportItem} from "@/pages/assetViewer/reportRenders/schema"
import {useCreation, useMemoizedFn} from "ahooks"
import {SafeMarkdown} from "@/pages/assetViewer/reportRenders/markdownRender"
import classNames from "classnames"
import styles from "./AIMarkdown.module.scss"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon} from "@/assets/icon/outline"
import ModalInfo from "../ModelInfo"
const aiMilkdownOptions: YakitRadioButtonsProps["options"] = [
    {
        label: "预览",
        value: "preview"
    },
    {
        label: "源码",
        value: "code"
    }
]
export const AIMarkdown: React.FC<AIMarkdownProps> = React.memo((props) => {
    const {content, nodeLabel, className, modalInfo,referenceNode} = props
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
                content = <SafeMarkdown className={classNames(styles["ai-milkdown"])} source={item.content} />
                break
            case "code":
                content = <div className={styles["ai-milkdown-code"]}>{item.content}</div>
                break
            default:
                break
        }
        return content
    })
    return (
        <div className={classNames(styles["ai-milkdown-wrapper"], className)}>
            <div className={styles["milkdown-header"]}>
                <div className={styles["header-name"]}>{nodeLabel}</div>
                <div className={styles["header-extra"]}>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        value={type}
                        options={aiMilkdownOptions}
                        onChange={(e) => {
                            setType(e.target.value)
                        }}
                    />
                    <YakitButton
                        type='text'
                        onClick={() => setExpand((v) => !v)}
                        icon={expand ? <OutlineChevrondoubleupIcon /> : <OutlineChevrondoubledownIcon />}
                    />
                </div>
            </div>
            <div
                className={classNames({
                    [styles["ai-milkdown-mini"]]: !expand
                })}
            >
                {renderContent()}
            </div>
            {referenceNode}
            <ModalInfo {...modalInfo} />
        </div>
    )
})
