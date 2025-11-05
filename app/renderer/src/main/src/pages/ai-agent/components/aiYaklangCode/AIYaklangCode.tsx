import React from "react"
import {AIYaklangCodeProps} from "./type"
import ChatCard from "../ChatCard"
import {OutlinCompileTwoIcon} from "@/assets/icon/outline"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import ModalInfo from "../ModelInfo"
import styles from "./AIYaklangCode.module.scss"

export const AIYaklangCode: React.FC<AIYaklangCodeProps> = React.memo((props) => {
    const {content, nodeLabel, modalInfo} = props
    return (
        <ChatCard
            titleText={nodeLabel}
            titleIcon={<OutlinCompileTwoIcon />}
            footer={<>{modalInfo && <ModalInfo {...modalInfo} />}</>}
        >
            <div className={styles["ai-yaklang-code"]}>
                <YakitEditor type='yak' value={content} readOnly={true} />
            </div>
        </ChatCard>
    )
})
