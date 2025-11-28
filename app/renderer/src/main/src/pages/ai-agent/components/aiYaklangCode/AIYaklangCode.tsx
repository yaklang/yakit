import React, {useState} from "react"
import {AIYaklangCodeProps} from "./type"
import ChatCard from "../ChatCard"
import {OutlinCompileTwoIcon} from "@/assets/icon/outline"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import ModalInfo from "../ModelInfo"
import styles from "./AIYaklangCode.module.scss"
import {useMemoizedFn, useThrottleEffect} from "ahooks"
import {AIStreamContentType} from "@/pages/ai-re-act/hooks/defaultConstant"
import {NewHTTPPacketEditor} from "@/utils/editors"

export const AIYaklangCode: React.FC<AIYaklangCodeProps> = React.memo((props) => {
    const {content: defContent, nodeLabel, modalInfo, contentType} = props
    const [content, setContent] = useState(defContent)
    useThrottleEffect(
        () => {
            setContent(defContent)
        },
        [defContent],
        {wait: 500}
    )
    const renderCode = useMemoizedFn(() => {
        switch (contentType) {
            case AIStreamContentType.CODE_YAKLANG:
                return <YakitEditor type='yak' value={content} readOnly={true} />
            case AIStreamContentType.CODE_HTTP_REQUEST:
                return <NewHTTPPacketEditor originValue={content} readOnly={true} />
            default:
                return null
        }
    })
    return (
        <ChatCard
            titleText={nodeLabel}
            titleIcon={<OutlinCompileTwoIcon />}
            footer={<>{modalInfo && <ModalInfo {...modalInfo} />}</>}
        >
            <div className={styles["ai-yaklang-code"]}>{renderCode()}</div>
        </ChatCard>
    )
})
