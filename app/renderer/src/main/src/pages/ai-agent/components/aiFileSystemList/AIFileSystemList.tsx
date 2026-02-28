import styles from "./AIFileSystemList.module.scss"
import FileTreeSystem from "./FileTreeSystem/FileTreeSystem"
import { memo } from "react"


export const AIFileSystemList = memo(() => {
    return (
        <div className={styles["ai-file-system"]}>
            <FileTreeSystem />
        </div>
    )
})
