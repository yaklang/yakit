import {RefreshIcon} from "@/assets/newIcon"
import ChatCard from "../ChatCard"
import styles from "./index.module.scss"

const FileSystemCard = () => {
    return (
        <ChatCard titleIcon={<RefreshIcon className={styles["file-system-icon"]} />} titleText='更新文件系统'>
            1
        </ChatCard>
    )
}

export default FileSystemCard
