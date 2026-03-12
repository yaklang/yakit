import React, {useState} from "react"
import {AIYaklangCodeProps} from "./type"
import ChatCard from "../ChatCard"
import {OutlinCompileTwoIcon} from "@/assets/icon/outline"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import ModalInfo from "../ModelInfo"
import styles from "./AIYaklangCode.module.scss"
import {useCreation, useMemoizedFn, useThrottleEffect} from "ahooks"
import {NewHTTPPacketEditor} from "@/utils/editors"

export const AIYaklangCode: React.FC<AIYaklangCodeProps> = React.memo((props) => {
    const {content: defContent, nodeLabel, modalInfo, contentType, referenceNode} = props
    const [content, setContent] = useState(defContent)
    useThrottleEffect(
        () => {
            setContent(defContent)
        },
        [defContent],
        {wait: 500}
    )
    const type = useCreation(() => {
        return contentType.split("/")?.[1] || "plaintext"
    }, [contentType])
    const renderCode = useMemoizedFn(() => {
        switch (type) {
            case "http-request":
                return <NewHTTPPacketEditor originValue={content} readOnly={true} />
            default:
                // case AIStreamContentType.CODE_YAKLANG:
                // case AIStreamContentType.CODE_PYTHON:
                return <YakitEditor type={type} value={content} readOnly={true} />
        }
    })
    return (
        <ChatCard
            titleText={nodeLabel}
            titleIcon={<OutlinCompileTwoIcon />}
            titleExtra={<>{modalInfo && <ModalInfo {...modalInfo} />}</>}
        >
            <div className={styles["ai-yaklang-code"]}>{renderCode()}</div>
            {referenceNode}
        </ChatCard>
    )
})
