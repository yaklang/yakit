import {memo, useEffect, type FC} from "react"

import {KnowledgeBaseSidebar} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import KnowledgeBaseContainer from "./KnowledgeBaseContainer"
import {useSafeState} from "ahooks"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"

const KnowledgeBaseContent: FC = () => {
    const knowledgeBases = useKnowledgeBase((s) => s.knowledgeBases)
    const [knowledgeBaseID, setKnowledgeBaseID] = useSafeState("")

    useEffect(() => {
        setKnowledgeBaseID(knowledgeBases?.[0]?.ID)
    }, [knowledgeBases])

    return (
        <div className={styles["knowledge-base-body"]}>
            <KnowledgeBaseSidebar
                knowledgeBases={knowledgeBases}
                knowledgeBaseID={knowledgeBaseID}
                setKnowledgeBaseID={setKnowledgeBaseID}
            />
            <KnowledgeBaseContainer knowledgeBases={knowledgeBases} knowledgeBaseID={knowledgeBaseID} />
        </div>
    )
}

export default memo(KnowledgeBaseContent)
