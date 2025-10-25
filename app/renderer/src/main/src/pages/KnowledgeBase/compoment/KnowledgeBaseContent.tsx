import {memo, useEffect, type FC} from "react"

import {KnowledgeBaseSidebar} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import KnowledgeBaseContainer from "./KnowledgeBaseContainer"
import {useSafeState} from "ahooks"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {TExistsKnowledgeBaseAsync} from "../TKnowledgeBase"

interface KnowledgeBaseContentProps extends TExistsKnowledgeBaseAsync {
    knowledgeBaseID: string
    setKnowledgeBaseID: (knowledgeBaseID: string) => void
}

const KnowledgeBaseContent: FC<KnowledgeBaseContentProps> = ({
    existsKnowledgeBaseAsync,
    knowledgeBaseID,
    setKnowledgeBaseID
}) => {
    const {knowledgeBases} = useKnowledgeBase()

    return (
        <div className={styles["knowledge-base-body"]}>
            <KnowledgeBaseSidebar
                knowledgeBases={knowledgeBases}
                knowledgeBaseID={knowledgeBaseID}
                setKnowledgeBaseID={setKnowledgeBaseID}
                existsKnowledgeBaseAsync={existsKnowledgeBaseAsync}
            />
            <KnowledgeBaseContainer
                knowledgeBases={knowledgeBases}
                knowledgeBaseID={knowledgeBaseID}
                existsKnowledgeBaseAsync={existsKnowledgeBaseAsync}
            />
        </div>
    )
}

export default KnowledgeBaseContent
