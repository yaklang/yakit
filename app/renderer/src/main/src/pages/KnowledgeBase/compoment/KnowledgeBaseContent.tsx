import {memo, useEffect, type FC} from "react"

import {KnowledgeBaseSidebar} from "./KnowledgeBaseSidebar"

import styles from "../knowledgeBase.module.scss"
import KnowledgeBaseContainer from "./KnowledgeBaseContainer"
import {useSafeState} from "ahooks"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {TExistsKnowledgeBaseAsync} from "../TKnowledgeBase"

const KnowledgeBaseContent: FC<TExistsKnowledgeBaseAsync> = ({existsKnowledgeBaseAsync}) => {
    const {knowledgeBases} = useKnowledgeBase()

    const [knowledgeBaseID, setKnowledgeBaseID] = useSafeState("")

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
